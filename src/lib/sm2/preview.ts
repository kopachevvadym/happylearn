import { sm2 } from './index'

export interface FormatProgress {
  current: 'flip' | 'quiz' | 'write'
  next: 'quiz' | 'write' | null
  stepsToNext: number | null
  stepsToLearned: number | null
  isLearned: boolean
}

/**
 * Returns the current format stage and how many correct answers
 * are needed to move to the next format or become learned.
 */
export function getFormatProgress(repetitions: number): FormatProgress {
  if (repetitions === 0) {
    return { current: 'flip', next: 'quiz', stepsToNext: 1, stepsToLearned: null, isLearned: false }
  }
  if (repetitions <= 2) {
    // needs repetitions=3 to move to write
    return { current: 'quiz', next: 'write', stepsToNext: 3 - repetitions, stepsToLearned: null, isLearned: false }
  }
  if (repetitions >= 5) {
    return { current: 'write', next: null, stepsToNext: null, stepsToLearned: 0, isLearned: true }
  }
  // write, not yet learned (needs repetitions=5)
  return { current: 'write', next: null, stepsToNext: null, stepsToLearned: 5 - repetitions, isLearned: false }
}

export interface SM2Preview {
  ease_factor: number
  interval: number
  repetitions: number
  next_review_at: Date
}

export function previewSm2Result(
  progress: { ease_factor: number; interval: number; repetitions: number } | null,
  quality: number
): SM2Preview {
  const result = sm2({
    easeFactor: progress?.ease_factor ?? 2.5,
    interval: progress?.interval ?? 0,
    repetitions: progress?.repetitions ?? 0,
    quality,
  })
  return {
    ease_factor: result.easeFactor,
    interval: result.interval,
    repetitions: result.repetitions,
    next_review_at: result.nextReviewAt,
  }
}
