'use server'

import { createClient } from '@/lib/supabase/server'
import type { BadgeSlug } from '@/types'

type BadgeEvent =
  | 'word_added'
  | 'collection_created'
  | 'collection_published'
  | 'collection_followed'
  | 'streak_updated'

export async function checkAndAwardBadges(userId: string, event: BadgeEvent) {
  const supabase = await createClient()

  const toCheck: BadgeSlug[] = []

  if (event === 'word_added') {
    const { count } = await supabase
      .from('words')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .throwOnError()

    if (count && count >= 1) toCheck.push('first_word')
    if (count && count >= 10) toCheck.push('words_10')
    if (count && count >= 100) toCheck.push('words_100')
  }

  if (event === 'collection_created') {
    toCheck.push('first_collection')
  }

  if (event === 'collection_published') {
    toCheck.push('first_public')
  }

  if (event === 'collection_followed') {
    toCheck.push('first_follow')
  }

  if (event === 'streak_updated') {
    const { data: streak } = await supabase
      .from('user_streaks')
      .select('current_streak')
      .eq('user_id', userId)
      .single()

    if (streak?.current_streak && streak.current_streak >= 7) toCheck.push('streak_7')
    if (streak?.current_streak && streak.current_streak >= 30) toCheck.push('streak_30')
  }

  if (!toCheck.length) return

  // Get badge IDs
  const { data: badges } = await supabase
    .from('badges')
    .select('id, slug')
    .in('slug', toCheck)

  if (!badges?.length) return

  // Get already awarded badges
  const { data: existing } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', userId)
    .in(
      'badge_id',
      badges.map((b) => b.id)
    )

  const existingIds = new Set(existing?.map((e) => e.badge_id))
  const toAward = badges.filter((b) => !existingIds.has(b.id))

  if (!toAward.length) return

  await supabase.from('user_badges').insert(
    toAward.map((b) => ({ user_id: userId, badge_id: b.id }))
  )
}

export async function updateStreak(userId: string) {
  const supabase = await createClient()

  const now = new Date()
  const today = new Date(now.setHours(0, 0, 0, 0))

  const { data: streak } = await supabase
    .from('user_streaks')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!streak) {
    await supabase.from('user_streaks').insert({
      user_id: userId,
      current_streak: 1,
      longest_streak: 1,
      last_activity_at: new Date().toISOString(),
    })
    return
  }

  const lastActivity = streak.last_activity_at
    ? new Date(streak.last_activity_at)
    : null

  if (lastActivity) {
    const lastDay = new Date(lastActivity.setHours(0, 0, 0, 0))
    const diffDays = Math.round(
      (today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (diffDays === 0) {
      // Already updated today
      return
    } else if (diffDays === 1) {
      // Consecutive day
      const newStreak = streak.current_streak + 1
      await supabase
        .from('user_streaks')
        .update({
          current_streak: newStreak,
          longest_streak: Math.max(newStreak, streak.longest_streak),
          last_activity_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
    } else {
      // Streak broken
      await supabase
        .from('user_streaks')
        .update({
          current_streak: 1,
          last_activity_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
    }
  } else {
    await supabase
      .from('user_streaks')
      .update({
        current_streak: 1,
        longest_streak: Math.max(1, streak.longest_streak),
        last_activity_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
  }

  await checkAndAwardBadges(userId, 'streak_updated')
}
