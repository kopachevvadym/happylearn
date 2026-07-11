export interface SM2Input {
  easeFactor: number   // default 2.5
  interval: number     // days, default 0
  repetitions: number  // default 0
  quality: number      // 0-5 (0=complete fail, 5=perfect)
}

export interface SM2Output {
  easeFactor: number
  interval: number
  repetitions: number
  nextReviewAt: Date
}

/**
 * SM-2 spaced repetition algorithm.
 * quality: flip: know=5 / don't know=1
 *          quiz: correct=4 / incorrect=1
 *          write: exact=5 / close=3 / incorrect=1
 */
export function sm2(input: SM2Input): SM2Output {
  const { quality } = input
  let { easeFactor, interval, repetitions } = input

  if (quality < 3) {
    // Failed — reset repetitions and interval. Per canonical SM-2 the ease
    // factor is NOT changed on a failed review, otherwise every lapse would
    // permanently tank the word's scheduling.
    repetitions = 0
    interval = 1
  } else {
    if (repetitions === 0) {
      interval = 1
    } else if (repetitions === 1) {
      interval = 6
    } else {
      interval = Math.round(interval * easeFactor)
    }
    repetitions += 1

    // Update ease factor (minimum 1.3) — successful reviews only
    easeFactor = Math.max(
      1.3,
      easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    )
  }

  const nextReviewAt = new Date()
  nextReviewAt.setDate(nextReviewAt.getDate() + interval)

  return { easeFactor, interval, repetitions, nextReviewAt }
}

/**
 * Determine the study format for a word based on its repetition count.
 */
export function getStudyFormat(repetitions: number): 'flip' | 'quiz' | 'write' {
  if (repetitions === 0) return 'flip'
  if (repetitions <= 2) return 'quiz'
  return 'write'
}
