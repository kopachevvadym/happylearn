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
    .select('word, source_lang, target_lang')
    .eq('user_id', user.id)
    .in('word', wordsData.map((w) => w.word))

  const existingKeys = new Set(
    (existing ?? []).map((e) => `${e.word.toLowerCase()}__${e.source_lang}__${e.target_lang}`)
  )

  const key = (w: { word: string; source_lang: string; target_lang: string }) =>
    `${w.word.toLowerCase()}__${w.source_lang}__${w.target_lang}`

  const toInsert = wordsData.filter((w) => !existingKeys.has(key(w)))
  const toUpdate = wordsData.filter((w) => existingKeys.has(key(w)) && !skipDuplicates)

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
        .eq('source_lang', w.source_lang)
        .eq('target_lang', w.target_lang)
    }
  }

  revalidatePath('/words')
  revalidatePath('/dashboard')
  return { success: true, inserted: toInsert.length, updated: toUpdate.length }
}

export async function analyzeImport(
  wordsData: Array<{ word: string; source_lang: string; target_lang: string }>
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const }

  const { data: existing } = await supabase
    .from('words')
    .select('word, source_lang, target_lang')
    .eq('user_id', user.id)
    .in('word', wordsData.map((w) => w.word))

  const existingKeys = new Set(
    (existing ?? []).map((e) => `${e.word.toLowerCase()}__${e.source_lang}__${e.target_lang}`)
  )

  const conflictKeys = wordsData
    .filter((w) => existingKeys.has(`${w.word.toLowerCase()}__${w.source_lang}__${w.target_lang}`))
    .map((w) => `${w.word.toLowerCase()}__${w.source_lang}__${w.target_lang}`)

  return { conflictKeys }
}

export async function exportBackup() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: words, error } = await supabase
    .from('words')
    .select(`
      word, translations, examples, source_lang, target_lang,
      word_progress(ease_factor, interval, repetitions, next_review_at, is_learned)
    `)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  const backup = (words ?? []).map((w) => ({
    word: w.word,
    translations: w.translations,
    examples: w.examples,
    source_lang: w.source_lang,
    target_lang: w.target_lang,
    progress: (w.word_progress as unknown as Record<string, unknown>[])?.[0] ?? null,
  }))

  return { success: true, data: backup }
}

export async function importBackup(
  wordsData: Array<{
    word: string
    translations: string[]
    examples: string[]
    source_lang: string
    target_lang: string
    progress?: {
      ease_factor: number
      interval: number
      repetitions: number
      next_review_at: string
      is_learned: boolean
    } | null
  }>,
  skipDuplicates: boolean
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const plainWords = wordsData.map(({ progress: _p, ...w }) => w)
  const importResult = await importWords(plainWords, skipDuplicates)
  if (!importResult || 'error' in importResult) return importResult

  // Restore progress for newly inserted words
  const wordsWithProgress = wordsData.filter((w) => w.progress)
  if (wordsWithProgress.length > 0) {
    const { data: insertedWords } = await supabase
      .from('words')
      .select('id, word, source_lang, target_lang')
      .eq('user_id', user.id)
      .in('word', wordsWithProgress.map((w) => w.word))

    if (insertedWords?.length) {
      const progressRecords = insertedWords.flatMap((dbWord) => {
        const source = wordsWithProgress.find(
          (w) =>
            w.word.toLowerCase() === dbWord.word.toLowerCase() &&
            w.source_lang === dbWord.source_lang &&
            w.target_lang === dbWord.target_lang
        )
        if (!source?.progress) return []
        return [{
          user_id: user.id,
          word_id: dbWord.id,
          ease_factor: source.progress.ease_factor,
          interval: source.progress.interval,
          repetitions: source.progress.repetitions,
          next_review_at: source.progress.next_review_at,
          is_learned: source.progress.is_learned,
        }]
      })

      if (progressRecords.length > 0) {
        await supabase
          .from('word_progress')
          .upsert(progressRecords, { onConflict: 'word_id' })
      }
    }
  }

  revalidatePath('/words')
  revalidatePath('/dashboard')
  return { success: true, inserted: importResult.inserted, updated: importResult.updated }
}
