'use server'

import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'

export async function completeOnboarding(formData: FormData) {
  const t = await getTranslations('errors')

  const sourceLang = formData.get('source_lang') as string
  const targetLang = formData.get('target_lang') as string
  const dailyGoal = parseInt(formData.get('daily_goal') as string, 10)

  if (!sourceLang || !targetLang || !Number.isFinite(dailyGoal) || dailyGoal < 1 || dailyGoal > 500) {
    return { error: t('invalid_data') }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: t('unauthorized') }
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

  // Create the default dictionary once — there is no unique constraint on
  // is_default, so re-running onboarding must not create a second one.
  const { data: existingDefault } = await supabase
    .from('collections')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_default', true)
    .maybeSingle()

  if (!existingDefault) {
    const tCol = await getTranslations('collections')
    const { error: collectionError } = await supabase
      .from('collections')
      .insert({
        user_id: user.id,
        name: tCol('my_dictionary'),
        source_lang: sourceLang,
        target_lang: targetLang,
        is_default: true,
        is_public: false,
      })

    if (collectionError) {
      return { error: collectionError.message }
    }
  }

  // Initialize streak record
  await supabase.from('user_streaks').upsert(
    { user_id: user.id },
    { onConflict: 'user_id', ignoreDuplicates: true }
  )

  const locale = await getLocale()
  redirect(`/${locale}/dashboard`)
}
