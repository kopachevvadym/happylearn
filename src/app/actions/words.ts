'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { checkAndAwardBadges } from './badges'
import { z } from 'zod'

// Built per-request so validation messages follow the caller's locale
async function getWordSchema() {
  const t = await getTranslations('errors')
  return z.object({
    word: z.string().min(1, t('word_required')).max(200, t('too_long')),
    translations: z.array(z.string().min(1)).min(1, t('min_one_translation')),
    examples: z.array(z.string()).optional().default([]),
    source_lang: z.string().min(2),
    target_lang: z.string().min(2),
  })
}

export async function addWord(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const t = await getTranslations('errors')
  const translations = formData.getAll('translations') as string[]
  const examples = formData.getAll('examples') as string[]

  const parsed = (await getWordSchema()).safeParse({
    word: (formData.get('word') as string | null)?.trim(),
    translations: translations.map((tr) => tr.trim()).filter(Boolean),
    examples: examples.filter(Boolean),
    source_lang: formData.get('source_lang'),
    target_lang: formData.get('target_lang'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t('invalid_data') }
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
    // The word row is already saved — a failed link must not throw an
    // unhandled exception (a retry would create a duplicate word).
    const { error: linkError } = await supabase
      .from('collection_words')
      .insert({ collection_id: defaultCollection.id, word_id: word.id })
    if (linkError) {
      console.error('Failed to link word to default collection', linkError)
    }
  }

  await checkAndAwardBadges(user.id, 'word_added')

  revalidatePath('/[locale]/words', 'page')
  revalidatePath('/[locale]/dashboard', 'page')
  return { success: true, data: word }
}

export async function updateWord(wordId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const t = await getTranslations('errors')
  const translations = formData.getAll('translations') as string[]
  const examples = formData.getAll('examples') as string[]

  const parsed = (await getWordSchema()).safeParse({
    word: (formData.get('word') as string | null)?.trim(),
    translations: translations.map((tr) => tr.trim()).filter(Boolean),
    examples: examples.filter(Boolean),
    source_lang: formData.get('source_lang'),
    target_lang: formData.get('target_lang'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t('invalid_data') }
  }

  const { error } = await supabase
    .from('words')
    .update(parsed.data)
    .eq('id', wordId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/[locale]/words', 'page')
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

  revalidatePath('/[locale]/words', 'page')
  revalidatePath('/[locale]/dashboard', 'page')
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

  revalidatePath('/[locale]/words', 'page')
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
  if (!valid.length) {
    const t = await getTranslations('errors')
    return { error: t('no_valid_rows') }
  }

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

  revalidatePath('/[locale]/words', 'page')
  revalidatePath('/[locale]/dashboard', 'page')
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

  revalidatePath('/[locale]/collections', 'page')
  revalidatePath('/[locale]/words', 'page')
  revalidatePath('/[locale]/dashboard', 'page')

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
  revalidatePath('/[locale]/words', 'page')
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
  revalidatePath('/[locale]/words', 'page')
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
  revalidatePath('/[locale]/words', 'page')
  revalidatePath('/[locale]/dashboard', 'page')
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

  // Only the caller's own words may be linked — foreign ids would otherwise
  // expose another user's words through a public collection.
  const { data: ownWords } = await supabase
    .from('words')
    .select('id')
    .eq('user_id', user.id)
    .in('id', wordIds)

  if (!ownWords?.length) return { error: 'Not found' }

  const rows = ownWords.map((w) => ({ collection_id: collectionId, word_id: w.id }))
  const { error } = await supabase
    .from('collection_words')
    .upsert(rows, { onConflict: 'collection_id,word_id', ignoreDuplicates: true })

  if (error) return { error: error.message }
  revalidatePath('/[locale]/words', 'page')
  revalidatePath('/[locale]/collections', 'page')
  return { success: true }
}

export async function mergeDuplicates() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: words, error: fetchError } = await supabase
    .from('words')
    .select('id, word, translations, examples, source_lang, target_lang, created_at')
    .eq('user_id', user.id)

  if (fetchError || !words) return { error: fetchError?.message ?? 'Failed to fetch words' }

  const groups = new Map<string, typeof words>()
  for (const w of words) {
    const key = `${w.word.toLowerCase()}__${w.source_lang}__${w.target_lang}`
    const group = groups.get(key) ?? []
    group.push(w)
    groups.set(key, group)
  }

  const duplicateGroups = [...groups.values()].filter((g) => g.length > 1)
  if (duplicateGroups.length === 0) return { mergedCount: 0, groupsCount: 0 }

  // Bulk-read progress and collection links for every affected word up front —
  // the previous per-group/per-duplicate queries made large merges take minutes.
  const affectedIds = duplicateGroups.flatMap((g) => g.map((w) => w.id))
  const [{ data: allProgress }, { data: allLinks }] = await Promise.all([
    supabase
      .from('word_progress')
      .select('*')
      .in('word_id', affectedIds)
      .eq('user_id', user.id),
    supabase
      .from('collection_words')
      .select('collection_id, word_id')
      .in('word_id', affectedIds),
  ])

  type ProgressRow = NonNullable<typeof allProgress>[number]
  const progressByWord = new Map((allProgress ?? []).map((p) => [p.word_id, p]))
  const linksByWord = new Map<string, string[]>()
  for (const l of allLinks ?? []) {
    const list = linksByWord.get(l.word_id) ?? []
    list.push(l.collection_id)
    linksByWord.set(l.word_id, list)
  }

  let mergedCount = 0
  const allDuplicateIds: string[] = []

  for (const group of duplicateGroups) {
    const sorted = [...group].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    const [primary, ...duplicates] = sorted

    const allTranslations = [...new Set(group.flatMap((w) => w.translations as string[]))]
    const allExamples = [...new Set(group.flatMap((w) => w.examples as string[]))]

    // The survivor keeps the most advanced study history: repetitions first
    // (actual progress), then interval, then the latest review date — ease
    // factor alone says nothing about how far the word has been learned.
    const bestProgress = group.reduce<ProgressRow | null>((best, w) => {
      const cur = progressByWord.get(w.id)
      if (!cur) return best
      if (!best) return cur
      if (cur.repetitions !== best.repetitions) return cur.repetitions > best.repetitions ? cur : best
      if (cur.interval !== best.interval) return cur.interval > best.interval ? cur : best
      return new Date(cur.next_review_at) > new Date(best.next_review_at) ? cur : best
    }, null)

    await supabase
      .from('words')
      .update({ translations: allTranslations, examples: allExamples })
      .eq('id', primary.id)

    if (bestProgress && bestProgress.word_id !== primary.id) {
      await supabase
        .from('word_progress')
        .upsert(
          {
            user_id: user.id,
            word_id: primary.id,
            ease_factor: bestProgress.ease_factor,
            interval: bestProgress.interval,
            repetitions: bestProgress.repetitions,
            next_review_at: bestProgress.next_review_at,
            is_learned: bestProgress.is_learned,
          },
          { onConflict: 'user_id,word_id' }
        )
    }

    // Re-link the duplicates' collections to the surviving word
    const relinkRows = duplicates.flatMap((d) =>
      (linksByWord.get(d.id) ?? []).map((collection_id) => ({
        collection_id,
        word_id: primary.id,
      }))
    )
    if (relinkRows.length) {
      await supabase
        .from('collection_words')
        .upsert(relinkRows, { onConflict: 'collection_id,word_id', ignoreDuplicates: true })
    }

    allDuplicateIds.push(...duplicates.map((w) => w.id))
    mergedCount += duplicates.length
  }

  // One delete for all duplicates instead of one per group
  if (allDuplicateIds.length) {
    const { error: deleteError } = await supabase
      .from('words')
      .delete()
      .in('id', allDuplicateIds)
      .eq('user_id', user.id)
    if (deleteError) return { error: deleteError.message }
  }

  revalidatePath('/[locale]/words', 'page')
  revalidatePath('/[locale]/dashboard', 'page')
  return { mergedCount, groupsCount: duplicateGroups.length }
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

  if (!collections?.length) {
    const t = await getTranslations('errors')
    return { error: t('collections_not_found') }
  }

  const rows = collections.map((c) => ({ collection_id: c.id, word_id: wordId }))
  const { error } = await supabase
    .from('collection_words')
    .upsert(rows, { onConflict: 'collection_id,word_id', ignoreDuplicates: true })

  if (error) return { error: error.message }

  revalidatePath('/[locale]/words', 'page')
  revalidatePath('/[locale]/collections', 'page')
  return { success: true }
}
