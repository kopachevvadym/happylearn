import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { SettingsForm } from '@/components/shared/settings-form'

export default async function SettingsPage() {
  const t = await getTranslations('settings')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: profile }, { data: apiKeys }] = await Promise.all([
    supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single(),
    supabase
      .from('api_keys')
      .select('id, name, last_used_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  if (!profile) return null

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <SettingsForm profile={profile} apiKeys={apiKeys ?? []} />
    </div>
  )
}
