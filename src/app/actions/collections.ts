'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { checkAndAwardBadges } from './badges'
import { z } from 'zod'

// Built per-request so validation messages follow the caller's locale
async function getCollectionSchema() {
  const t = await getTranslations('errors')
  return z.object({
    name: z.string().min(1, t('name_required')).max(200, t('too_long')),
    description: z.string().optional(),
    source_lang: z.string().min(2),
    target_lang: z.string().min(2),
    is_public: z.boolean().default(false),
  })
}

export async function createCollection(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const t = await getTranslations('errors')
  const parsed = (await getCollectionSchema()).safeParse({
    name: (formData.get('name') as string | null)?.trim(),
    description: formData.get('description') || undefined,
    source_lang: formData.get('source_lang'),
    target_lang: formData.get('target_lang'),
    is_public: formData.get('is_public') === 'true',
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t('invalid_data') }
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

  revalidatePath('/[locale]/collections', 'page')
  revalidatePath('/[locale]/dashboard', 'page')
  return { success: true, data: collection }
}

export async function updateCollection(collectionId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const t = await getTranslations('errors')
  const isPublic = formData.get('is_public') === 'true'
  const parsed = (await getCollectionSchema()).safeParse({
    name: (formData.get('name') as string | null)?.trim(),
    description: formData.get('description') || undefined,
    source_lang: formData.get('source_lang'),
    target_lang: formData.get('target_lang'),
    is_public: isPublic,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t('invalid_data') }
  }

  const { error } = await supabase
    .from('collections')
    .update(parsed.data)
    .eq('id', collectionId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  if (isPublic) await checkAndAwardBadges(user.id, 'collection_published')

  revalidatePath('/[locale]/collections', 'page')
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

  const t = await getTranslations('errors')
  if (!col) return { error: t('collection_not_found') }
  if (col.is_default) return { error: t('cant_delete_default') }

  const { error } = await supabase
    .from('collections')
    .delete()
    .eq('id', collectionId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/[locale]/collections', 'page')
  revalidatePath('/[locale]/dashboard', 'page')
  return { success: true }
}

export async function followCollection(collectionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Only public collections that aren't the caller's own can be followed
  const { data: target } = await supabase
    .from('collections')
    .select('id, user_id, is_public')
    .eq('id', collectionId)
    .single()

  const t = await getTranslations('errors')
  if (!target || (!target.is_public && target.user_id !== user.id)) {
    return { error: t('collection_not_found') }
  }
  if (target.user_id === user.id) {
    return { error: t('cant_follow_own') }
  }

  const { error } = await supabase
    .from('collection_follows')
    .insert({ user_id: user.id, collection_id: collectionId })

  if (error) return { error: error.message }

  await checkAndAwardBadges(user.id, 'collection_followed')
  revalidatePath('/[locale]/collections', 'page')
  revalidatePath('/[locale]/catalog', 'page')
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

  revalidatePath('/[locale]/collections', 'page')
  revalidatePath('/[locale]/catalog', 'page')
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

  revalidatePath('/[locale]/collections/[id]', 'page')
  return { success: true }
}

// 'use server' files may only export async functions — keep the constant local
const CATALOG_PAGE_SIZE = 100

/** Next page of the public catalog — used by the client's "load more". */
export async function fetchPublicCollections(offset: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const safeOffset = Number.isFinite(offset) && offset > 0 ? Math.floor(offset) : 0

  const query = supabase
    .from('collections')
    .select(`
      id, name, description, source_lang, target_lang, created_at, user_id,
      users:public_profiles(username, avatar_url),
      collection_words(count),
      collection_follows(count)
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .range(safeOffset, safeOffset + CATALOG_PAGE_SIZE - 1)

  if (user) query.neq('user_id', user.id)

  const { data } = await query
  return data ?? []
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

  const t = await getTranslations('errors')
  const tCol = await getTranslations('collections')
  // Only own or public collections can be cloned
  if (!original || (!original.is_public && original.user_id !== user.id)) {
    return { error: t('collection_not_found') }
  }

  // Create clone
  const { data: clone, error: cloneError } = await supabase
    .from('collections')
    .insert({
      user_id: user.id,
      name: `${original.name} (${tCol('copy_suffix')})`,
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

  revalidatePath('/[locale]/collections', 'page')
  return { success: true, data: clone }
}
