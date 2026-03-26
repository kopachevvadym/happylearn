'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function completeOnboarding(formData: FormData) {
  const sourceLang = formData.get('source_lang') as string
  const targetLang = formData.get('target_lang') as string
  const dailyGoal = parseInt(formData.get('daily_goal') as string, 10)

  if (!sourceLang || !targetLang || !dailyGoal) {
    return { error: 'Заповніть всі поля' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Необхідна авторизація' }
  }

  // Upsert user preferences (handles case where trigger didn't create the row)
  const { error: updateError } = await supabase
    .from('users')
    .upsert({
      id: user.id,
      email: user.email!,
      username: user.user_metadata?.username || user.email!.split('@')[0],
      default_source_lang: sourceLang,
      default_target_lang: targetLang,
      daily_goal: dailyGoal,
      onboarding_completed: true,
    })

  if (updateError) {
    return { error: updateError.message }
  }

  // Create default "My Dictionary" collection
  const { error: collectionError } = await supabase
    .from('collections')
    .insert({
      user_id: user.id,
      name: 'Мій словник',
      source_lang: sourceLang,
      target_lang: targetLang,
      is_default: true,
      is_public: false,
    })

  if (collectionError && !collectionError.message.includes('duplicate')) {
    return { error: collectionError.message }
  }

  // Initialize streak record
  await supabase.from('user_streaks').upsert(
    { user_id: user.id },
    { onConflict: 'user_id', ignoreDuplicates: true }
  )

  redirect('/dashboard')
}
