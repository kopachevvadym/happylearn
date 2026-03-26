'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'
import { z } from 'zod'

const profileSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  display_role: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  avatar_url: z.string().url().optional().or(z.literal('')),
})

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const parsed = profileSchema.safeParse({
    username: formData.get('username'),
    display_role: formData.get('display_role') || undefined,
    bio: formData.get('bio') || undefined,
    avatar_url: formData.get('avatar_url') || undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid data' }
  }

  const { error } = await supabase
    .from('users')
    .update({
      username: parsed.data.username,
      display_role: parsed.data.display_role ?? null,
      bio: parsed.data.bio ?? null,
      avatar_url: parsed.data.avatar_url || null,
    })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { success: true }
}

export async function updateLanguageSettings(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('users')
    .update({
      default_source_lang: formData.get('source_lang') as string,
      default_target_lang: formData.get('target_lang') as string,
      daily_goal: parseInt(formData.get('daily_goal') as string, 10),
    })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function createApiKey(name: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const key = `hl_${randomBytes(32).toString('hex')}`

  const { data, error } = await supabase
    .from('api_keys')
    .insert({ user_id: user.id, name, key })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { success: true, data: { ...data, key } }
}

export async function deleteApiKey(keyId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', keyId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { success: true }
}

export async function exportData(collectionId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  let query = supabase
    .from('words')
    .select('word, translations, examples, source_lang, target_lang')
    .eq('user_id', user.id)

  if (collectionId) {
    const { data: cws } = await supabase
      .from('collection_words')
      .select('word_id')
      .eq('collection_id', collectionId)

    if (cws?.length) {
      query = query.in('id', cws.map((cw) => cw.word_id))
    }
  }

  const { data: words, error } = await query

  if (error) return { error: error.message }

  return { success: true, data: words }
}

export async function importWords(
  wordsData: Array<{
    word: string
    translations: string[]
    examples: string[]
    source_lang: string
    target_lang: string
  }>,
  skipDuplicates: boolean
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: existing } = await supabase
    .from('words')
    .select('word')
    .eq('user_id', user.id)
    .in('word', wordsData.map((w) => w.word))

  const existingWords = new Set(existing?.map((e) => e.word) ?? [])

  const toInsert = wordsData.filter((w) => !existingWords.has(w.word) || !skipDuplicates)
  const toUpdate = wordsData.filter((w) => existingWords.has(w.word) && !skipDuplicates)

  if (toInsert.length) {
    await supabase.from('words').insert(toInsert.map((w) => ({ ...w, user_id: user.id })))
  }

  if (toUpdate.length) {
    for (const w of toUpdate) {
      await supabase
        .from('words')
        .update({ translations: w.translations, examples: w.examples })
        .eq('user_id', user.id)
        .eq('word', w.word)
    }
  }

  revalidatePath('/words')
  revalidatePath('/dashboard')
  return { success: true, inserted: toInsert.length, updated: toUpdate.length }
}
