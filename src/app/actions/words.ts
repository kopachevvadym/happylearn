'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { checkAndAwardBadges } from './badges'
import { z } from 'zod'

const wordSchema = z.object({
  word: z.string().min(1, 'Слово обов\'язкове'),
  translations: z.array(z.string().min(1)).min(1, 'Мінімум один переклад'),
  examples: z.array(z.string()).optional().default([]),
  source_lang: z.string().min(2),
  target_lang: z.string().min(2),
})

export async function addWord(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const translations = formData.getAll('translations') as string[]
  const examples = formData.getAll('examples') as string[]

  const parsed = wordSchema.safeParse({
    word: formData.get('word'),
    translations: translations.filter(Boolean),
    examples: examples.filter(Boolean),
    source_lang: formData.get('source_lang'),
    target_lang: formData.get('target_lang'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Невалідні дані' }
  }

  const { data: word, error } = await supabase
    .from('words')
    .insert({ user_id: user.id, ...parsed.data })
    .select()
    .single()

  if (error) return { error: error.message }

  // Add to default collection if exists
  const { data: defaultCollection } = await supabase
    .from('collections')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_default', true)
    .single()

  if (defaultCollection) {
    await supabase
      .from('collection_words')
      .insert({ collection_id: defaultCollection.id, word_id: word.id })
      .throwOnError()
  }

  await checkAndAwardBadges(user.id, 'word_added')

  revalidatePath('/words')
  revalidatePath('/dashboard')
  return { success: true, data: word }
}

export async function updateWord(wordId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const translations = formData.getAll('translations') as string[]
  const examples = formData.getAll('examples') as string[]

  const parsed = wordSchema.safeParse({
    word: formData.get('word'),
    translations: translations.filter(Boolean),
    examples: examples.filter(Boolean),
    source_lang: formData.get('source_lang'),
    target_lang: formData.get('target_lang'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Невалідні дані' }
  }

  const { error } = await supabase
    .from('words')
    .update(parsed.data)
    .eq('id', wordId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/words')
  return { success: true }
}

export async function deleteWord(wordId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('words')
    .delete()
    .eq('id', wordId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/words')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function toggleWordLearned(wordId: string, isLearned: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('word_progress')
    .upsert(
      { user_id: user.id, word_id: wordId, is_learned: isLearned },
      { onConflict: 'user_id,word_id' }
    )

  if (error) return { error: error.message }

  revalidatePath('/words')
  revalidatePath('/progress')
  return { success: true }
}

export async function addWordsBulk(
  entries: Array<{ word: string; translation: string }>,
  sourceLang: string,
  targetLang: string,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const valid = entries.filter((e) => e.word.trim() && e.translation.trim())
  if (!valid.length) return { error: 'Немає валідних рядків' }

  const { data: insertedWords, error } = await supabase
    .from('words')
    .insert(
      valid.map((e) => ({
        user_id: user.id,
        word: e.word.trim(),
        translations: [e.translation.trim()],
        examples: [],
        source_lang: sourceLang,
        target_lang: targetLang,
      }))
    )
    .select('id')

  if (error) return { error: error.message }

  const { data: defaultCollection } = await supabase
    .from('collections')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_default', true)
    .single()

  if (defaultCollection && insertedWords?.length) {
    await supabase
      .from('collection_words')
      .insert(insertedWords.map((w) => ({ collection_id: defaultCollection.id, word_id: w.id })))
  }

  await checkAndAwardBadges(user.id, 'word_added')

  revalidatePath('/words')
  revalidatePath('/dashboard')
  return { success: true, count: insertedWords?.length ?? 0 }
}

export async function checkWordDuplicates(
  sourceWordIds: string[],
  targetCollectionId: string,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const }

  const { data: col } = await supabase
    .from('collections')
    .select('id')
    .eq('id', targetCollectionId)
    .eq('user_id', user.id)
    .single()
  if (!col) return { error: 'Not found' as const }

  const { data: sourceWords } = await supabase
    .from('words')
    .select('id, word')
    .in('id', sourceWordIds)

  if (!sourceWords?.length) return { toAdd: 0, toSkip: 0 }

  const { data: existingCWRaw } = await supabase
    .from('collection_words')
    .select('word_id, words(word)')
    .eq('collection_id', targetCollectionId)

  const existingCW = existingCWRaw as unknown as Array<{ word_id: string; words: { word: string } | null }>
  const existingWordTexts = new Set(
    existingCW.map((e) => e.words?.word.toLowerCase()).filter((w): w is string => !!w)
  )

  const toSkip = sourceWords.filter((w) => existingWordTexts.has(w.word.toLowerCase())).length
  return { toAdd: sourceWords.length - toSkip, toSkip }
}

export async function addWordsToCollection(
  wordIds: string[],
  targetCollectionId: string,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const }

  const { data: col } = await supabase
    .from('collections')
    .select('id, name')
    .eq('id', targetCollectionId)
    .eq('user_id', user.id)
    .single()
  if (!col) return { error: 'Not found' as const }

  const { data: sourceWords } = await supabase
    .from('words')
    .select('id, word, translations, examples, source_lang, target_lang')
    .in('id', wordIds)

  if (!sourceWords?.length) return { added: 0, skipped: 0, collectionName: col.name }

  const { data: existingCWRaw } = await supabase
    .from('collection_words')
    .select('word_id, words(word)')
    .eq('collection_id', targetCollectionId)

  const existingCW = existingCWRaw as unknown as Array<{ word_id: string; words: { word: string } | null }>
  const existingWordTexts = new Set(
    existingCW.map((e) => e.words?.word.toLowerCase()).filter((w): w is string => !!w)
  )

  const newWords = sourceWords.filter((w) => !existingWordTexts.has(w.word.toLowerCase()))
  const skipped = sourceWords.length - newWords.length

  if (!newWords.length) return { added: 0, skipped, collectionName: col.name }

  const { data: insertedWords, error: insertError } = await supabase
    .from('words')
    .insert(
      newWords.map((w) => ({
        user_id: user.id,
        word: w.word,
        translations: w.translations,
        examples: w.examples,
        source_lang: w.source_lang,
        target_lang: w.target_lang,
      }))
    )
    .select('id')

  if (insertError || !insertedWords?.length) return { added: 0, skipped, collectionName: col.name }

  await supabase
    .from('collection_words')
    .insert(insertedWords.map((w) => ({ collection_id: targetCollectionId, word_id: w.id })))

  await checkAndAwardBadges(user.id, 'word_added')

  revalidatePath('/collections')
  revalidatePath('/words')
  revalidatePath('/dashboard')

  return { added: insertedWords.length, skipped, collectionName: col.name }
}

export async function updateWordsLanguage(wordIds: string[], sourceLang: string, targetLang: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('words')
    .update({ source_lang: sourceLang, target_lang: targetLang })
    .in('id', wordIds)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/words')
  return { success: true }
}

export async function markWordsAsLearned(wordIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const rows = wordIds.map((id) => ({ user_id: user.id, word_id: id, is_learned: true }))
  const { error } = await supabase
    .from('word_progress')
    .upsert(rows, { onConflict: 'user_id,word_id' })

  if (error) return { error: error.message }
  revalidatePath('/words')
  revalidatePath('/progress')
  return { success: true }
}

export async function deleteWords(wordIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('words')
    .delete()
    .in('id', wordIds)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/words')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function addExistingWordsToCollection(wordIds: string[], collectionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: col } = await supabase
    .from('collections')
    .select('id')
    .eq('id', collectionId)
    .eq('user_id', user.id)
    .single()
  if (!col) return { error: 'Not found' }

  const rows = wordIds.map((id) => ({ collection_id: collectionId, word_id: id }))
  const { error } = await supabase
    .from('collection_words')
    .upsert(rows, { onConflict: 'collection_id,word_id', ignoreDuplicates: true })

  if (error) return { error: error.message }
  revalidatePath('/words')
  revalidatePath('/collections')
  return { success: true }
}

export async function addWordToCollections(wordId: string, collectionIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Verify collections belong to user
  const { data: collections } = await supabase
    .from('collections')
    .select('id')
    .eq('user_id', user.id)
    .in('id', collectionIds)

  if (!collections?.length) return { error: 'Збірки не знайдено' }

  const rows = collections.map((c) => ({ collection_id: c.id, word_id: wordId }))
  const { error } = await supabase
    .from('collection_words')
    .upsert(rows, { onConflict: 'collection_id,word_id', ignoreDuplicates: true })

  if (error) return { error: error.message }

  revalidatePath('/words')
  revalidatePath('/collections')
  return { success: true }
}
