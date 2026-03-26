'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { checkAndAwardBadges } from './badges'
import { z } from 'zod'

const collectionSchema = z.object({
  name: z.string().min(1, 'Назва обов\'язкова'),
  description: z.string().optional(),
  source_lang: z.string().min(2),
  target_lang: z.string().min(2),
  is_public: z.boolean().default(false),
})

export async function createCollection(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const parsed = collectionSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    source_lang: formData.get('source_lang'),
    target_lang: formData.get('target_lang'),
    is_public: formData.get('is_public') === 'true',
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Невалідні дані' }
  }

  const { data: collection, error } = await supabase
    .from('collections')
    .insert({ user_id: user.id, ...parsed.data })
    .select()
    .single()

  if (error) return { error: error.message }

  await checkAndAwardBadges(user.id, 'collection_created')
  if (parsed.data.is_public) {
    await checkAndAwardBadges(user.id, 'collection_published')
  }

  revalidatePath('/collections')
  revalidatePath('/dashboard')
  return { success: true, data: collection }
}

export async function updateCollection(collectionId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const isPublic = formData.get('is_public') === 'true'
  const parsed = collectionSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    source_lang: formData.get('source_lang'),
    target_lang: formData.get('target_lang'),
    is_public: isPublic,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Невалідні дані' }
  }

  const { error } = await supabase
    .from('collections')
    .update(parsed.data)
    .eq('id', collectionId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  if (isPublic) await checkAndAwardBadges(user.id, 'collection_published')

  revalidatePath('/collections')
  return { success: true }
}

export async function deleteCollection(collectionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Check it's not default
  const { data: col } = await supabase
    .from('collections')
    .select('is_default')
    .eq('id', collectionId)
    .eq('user_id', user.id)
    .single()

  if (!col) return { error: 'Not found' }
  if (col.is_default) return { error: 'Не можна видалити словник за замовчуванням' }

  const { error } = await supabase
    .from('collections')
    .delete()
    .eq('id', collectionId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/collections')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function followCollection(collectionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('collection_follows')
    .insert({ user_id: user.id, collection_id: collectionId })

  if (error) return { error: error.message }

  await checkAndAwardBadges(user.id, 'collection_followed')
  revalidatePath('/collections')
  revalidatePath('/catalog')
  return { success: true }
}

export async function unfollowCollection(collectionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('collection_follows')
    .delete()
    .eq('user_id', user.id)
    .eq('collection_id', collectionId)

  if (error) return { error: error.message }

  revalidatePath('/collections')
  revalidatePath('/catalog')
  return { success: true }
}

export async function removeWordFromCollection(collectionId: string, wordId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Verify the user owns the collection
  const { data: col } = await supabase
    .from('collections')
    .select('id')
    .eq('id', collectionId)
    .eq('user_id', user.id)
    .single()

  if (!col) return { error: 'Not found' }

  const { error } = await supabase
    .from('collection_words')
    .delete()
    .eq('collection_id', collectionId)
    .eq('word_id', wordId)

  if (error) return { error: error.message }

  revalidatePath(`/collections/${collectionId}`)
  return { success: true }
}

export async function cloneCollection(collectionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Get original collection
  const { data: original } = await supabase
    .from('collections')
    .select('*, collection_words(word_id, words(*))')
    .eq('id', collectionId)
    .single()

  if (!original) return { error: 'Збірка не знайдена' }

  // Create clone
  const { data: clone, error: cloneError } = await supabase
    .from('collections')
    .insert({
      user_id: user.id,
      name: `${original.name} (копія)`,
      description: original.description,
      source_lang: original.source_lang,
      target_lang: original.target_lang,
      is_public: false,
    })
    .select()
    .single()

  if (cloneError || !clone) return { error: cloneError?.message ?? 'Error' }

  // Clone words: create new word entries for the cloning user
  const collectionWords = original.collection_words as unknown as Array<{
    word_id: string
    words: {
      word: string
      translations: string[]
      examples: string[]
      source_lang: string
      target_lang: string
    }
  }>

  if (collectionWords?.length) {
    const newWords = await supabase
      .from('words')
      .insert(
        collectionWords.map((cw) => ({
          user_id: user.id,
          word: cw.words.word,
          translations: cw.words.translations,
          examples: cw.words.examples,
          source_lang: cw.words.source_lang,
          target_lang: cw.words.target_lang,
        }))
      )
      .select('id')

    if (newWords.data?.length) {
      await supabase.from('collection_words').insert(
        newWords.data.map((w) => ({ collection_id: clone.id, word_id: w.id }))
      )
    }
  }

  revalidatePath('/collections')
  return { success: true, data: clone }
}
