'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { sm2, getStudyFormat } from '@/lib/sm2'
import { updateStreak } from './badges'
import type { StudyCard } from '@/types'

export async function getStudyCards(collectionIds: string[]): Promise<StudyCard[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Get words from selected collections
  type CWRow = { word_id: string; words: import('@/types').Word | null }
  const { data: collectionWordsRaw } = await supabase
    .from('collection_words')
    .select('word_id, words(*)')
    .in('collection_id', collectionIds)
  const collectionWords = collectionWordsRaw as unknown as CWRow[] | null

  if (!collectionWords?.length) return []

  // Deduplicate words
  const wordMap = new Map<string, import('@/types').Word>()
  for (const cw of collectionWords) {
    if (cw.words && !wordMap.has(cw.words.id)) {
      wordMap.set(cw.words.id, cw.words as import('@/types').Word)
    }
  }

  const wordIds = Array.from(wordMap.keys())

  // Get progress for these words
  const { data: progressData } = await supabase
    .from('word_progress')
    .select('*')
    .eq('user_id', user.id)
    .in('word_id', wordIds)

  const progressMap = new Map(progressData?.map((p) => [p.word_id, p]) ?? [])

  // Sort: due words first, then new words
  const now = new Date()
  const cards: StudyCard[] = Array.from(wordMap.values())
    .map((word) => {
      const progress = progressMap.get(word.id) ?? null
      const isDue = !progress || new Date(progress.next_review_at) <= now
      return { word, format: getStudyFormat(progress?.repetitions ?? 0), progress, isDue }
    })
    .filter((c) => c.isDue)
    .slice(0, 20)
    .map(({ word, format, progress }) => ({ word, format, progress }))

  return cards
}

export async function createStudySession(collectionIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('study_sessions')
    .insert({
      user_id: user.id,
      collection_ids: collectionIds,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { success: true, data }
}

export async function submitStudyAnswer(
  sessionId: string,
  wordId: string,
  format: 'flip' | 'quiz' | 'write',
  quality: number,
  currentProgress: {
    ease_factor: number
    interval: number
    repetitions: number
  } | null
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const isCorrect = quality >= 3

  // Calculate new SM-2 values
  const newProgress = sm2({
    easeFactor: currentProgress?.ease_factor ?? 2.5,
    interval: currentProgress?.interval ?? 0,
    repetitions: currentProgress?.repetitions ?? 0,
    quality,
  })

  // Upsert word progress
  await supabase.from('word_progress').upsert(
    {
      user_id: user.id,
      word_id: wordId,
      ease_factor: newProgress.easeFactor,
      interval: newProgress.interval,
      repetitions: newProgress.repetitions,
      next_review_at: newProgress.nextReviewAt.toISOString(),
      is_learned: newProgress.repetitions >= 5,
    },
    { onConflict: 'user_id,word_id' }
  )

  // Record in session
  await supabase.from('study_session_words').insert({
    session_id: sessionId,
    word_id: wordId,
    format,
    is_correct: isCorrect,
  })

  return { success: true, isCorrect }
}

export async function finishStudySession(
  sessionId: string,
  totalWords: number,
  correctAnswers: number
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  await supabase
    .from('study_sessions')
    .update({
      total_words: totalWords,
      correct_answers: correctAnswers,
      finished_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .eq('user_id', user.id)

  await updateStreak(user.id)

  revalidatePath('/progress')
  revalidatePath('/dashboard')
  return { success: true }
}
