'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { sm2, getStudyFormat } from '@/lib/sm2'
import { getUserTimezone, dayKeyInTz, startOfDayInTz } from '@/lib/utils/timezone'
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

  // Due at day granularity in the user's timezone: a card scheduled for today
  // is studiable at any time of day, not only after the exact minute it was
  // last reviewed.
  const tz = await getUserTimezone()
  const todayKey = dayKeyInTz(new Date(), tz)

  const candidates = Array.from(wordMap.values())
    .map((word) => {
      const progress = progressMap.get(word.id) ?? null
      const isDue =
        !progress ||
        !progress.next_review_at ||
        dayKeyInTz(new Date(progress.next_review_at), tz) <= todayKey
      // Learned words (auto-graduated or manually marked) are out of rotation
      const isLearned = progress?.is_learned ?? false
      return { word, format: getStudyFormat(progress?.repetitions ?? 0), progress, isDue, isLearned }
    })
    .filter((c) => c.isDue && !c.isLearned)

  // Overdue reviews first (oldest due date first), then new words —
  // so a large backlog can never starve scheduled reviews.
  candidates.sort((a, b) => {
    if (!a.progress && !b.progress) return 0
    if (!a.progress) return 1
    if (!b.progress) return -1
    return (
      new Date(a.progress.next_review_at ?? 0).getTime() -
      new Date(b.progress.next_review_at ?? 0).getTime()
    )
  })

  return candidates
    .slice(0, 20)
    .map(({ word, format, progress }) => ({ word, format, progress }))
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
  isAdditional = false
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  if (!Number.isFinite(quality) || quality < 0 || quality > 5) {
    return { error: 'Invalid quality' }
  }

  const isCorrect = quality >= 3

  // Additional training is pure practice — it never touches the SM-2 schedule,
  // otherwise same-day re-reviews would double-advance intervals.
  if (!isAdditional) {
    // Read the current SRS state server-side instead of trusting the client,
    // which can be stale (second device, second tab) or forged.
    const { data: currentProgress } = await supabase
      .from('word_progress')
      .select('ease_factor, interval, repetitions, is_learned')
      .eq('user_id', user.id)
      .eq('word_id', wordId)
      .maybeSingle()

    const newProgress = sm2({
      easeFactor: currentProgress?.ease_factor ?? 2.5,
      interval: currentProgress?.interval ?? 0,
      repetitions: currentProgress?.repetitions ?? 0,
      quality,
    })

    const { error: progressError } = await supabase.from('word_progress').upsert(
      {
        user_id: user.id,
        word_id: wordId,
        ease_factor: newProgress.easeFactor,
        interval: newProgress.interval,
        repetitions: newProgress.repetitions,
        next_review_at: newProgress.nextReviewAt.toISOString(),
        // Graduate at 5 repetitions; never un-learn a word that was already
        // marked learned (manually or by an earlier graduation).
        is_learned: newProgress.repetitions >= 5 || (currentProgress?.is_learned ?? false),
      },
      { onConflict: 'user_id,word_id' }
    )
    if (progressError) return { error: progressError.message }
  }

  const { error: logError } = await supabase.from('study_session_words').insert({
    session_id: sessionId,
    word_id: wordId,
    format,
    is_correct: isCorrect,
  })
  if (logError) return { error: logError.message }

  return { success: true, isCorrect }
}

export async function getScheduledCount(collectionIds: string[]): Promise<number> {
  if (!collectionIds.length) return 0
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  type CWRow = { word_id: string }
  const { data: cwRaw } = await supabase
    .from('collection_words')
    .select('word_id')
    .in('collection_id', collectionIds)
  const wordIds = [...new Set((cwRaw as CWRow[] | null ?? []).map((r) => r.word_id))]
  if (!wordIds.length) return 0

  const { data: progressData } = await supabase
    .from('word_progress')
    .select('word_id, next_review_at, is_learned')
    .eq('user_id', user.id)
    .in('word_id', wordIds)

  const progressMap = new Map((progressData ?? []).map((p) => [p.word_id, p]))

  // Same due/learned rules as getStudyCards, so the promised count matches
  // what a session will actually serve.
  const tz = await getUserTimezone()
  const todayKey = dayKeyInTz(new Date(), tz)

  let count = 0
  for (const id of wordIds) {
    const progress = progressMap.get(id)
    if (progress?.is_learned) continue
    if (
      !progress ||
      !progress.next_review_at ||
      dayKeyInTz(new Date(progress.next_review_at), tz) <= todayKey
    )
      count++
  }
  return count
}

export async function getCompletedTodayCount(): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  // Start of "today" in the user's timezone, not the server's
  const tz = await getUserTimezone()
  const startOfToday = startOfDayInTz(new Date(), tz)

  const { count } = await supabase
    .from('study_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('finished_at', startOfToday.toISOString())
    .not('finished_at', 'is', null)

  return count ?? 0
}

export async function getAdditionalCards(collectionIds: string[]): Promise<StudyCard[]> {
  if (!collectionIds.length) return []
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  type CWRow = { word_id: string; words: import('@/types').Word | null }
  const { data: cwRaw } = await supabase
    .from('collection_words')
    .select('word_id, words(*)')
    .in('collection_id', collectionIds)
  const cwData = cwRaw as unknown as CWRow[] | null

  if (!cwData?.length) return []

  const wordMap = new Map<string, import('@/types').Word>()
  for (const cw of cwData) {
    if (cw.words && !wordMap.has(cw.words.id)) {
      wordMap.set(cw.words.id, cw.words as import('@/types').Word)
    }
  }

  const wordIds = Array.from(wordMap.keys())
  const { data: progressData } = await supabase
    .from('word_progress')
    .select('*')
    .eq('user_id', user.id)
    .in('word_id', wordIds)

  const progressMap = new Map((progressData ?? []).map((p) => [p.word_id, p]))

  // Random order (Fisher–Yates — the sort-comparator trick is biased), limit 20
  for (let i = wordIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[wordIds[i], wordIds[j]] = [wordIds[j], wordIds[i]]
  }
  const shuffled = wordIds.slice(0, 20)
  return shuffled.map((id) => {
    const word = wordMap.get(id)!
    const progress = progressMap.get(id) ?? null
    return { word, format: getStudyFormat(progress?.repetitions ?? 0), progress }
  })
}

/**
 * Extra quiz distractors for small batches: first translations of up to 50
 * words from the selected collections, deduplicated.
 */
export async function getDistractorTranslations(collectionIds: string[]): Promise<string[]> {
  if (!collectionIds.length) return []
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  type CWRow = { words: { translations: string[] } | null }
  const { data: cwRaw } = await supabase
    .from('collection_words')
    .select('words(translations)')
    .in('collection_id', collectionIds)
    .limit(50)

  const rows = cwRaw as unknown as CWRow[] | null
  return [
    ...new Set(
      (rows ?? [])
        .map((r) => (r.words?.translations as string[] | undefined)?.[0])
        .filter((tr): tr is string => Boolean(tr))
    ),
  ]
}

export async function finishStudySession(
  sessionId: string,
  totalWords: number,
  correctAnswers: number
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Session close and streak update are independent — run them in parallel
  const [{ error }] = await Promise.all([
    supabase
      .from('study_sessions')
      .update({
        total_words: totalWords,
        correct_answers: correctAnswers,
        finished_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('user_id', user.id),
    updateStreak(user.id),
  ])
  if (error) return { error: error.message }

  revalidatePath('/[locale]/dashboard', 'page')
  return { success: true }
}
