import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ProfileTab } from '@/components/settings/ProfileTab'
import { LanguagesTab } from '@/components/settings/LanguagesTab'
import { AppearanceTab } from '@/components/settings/AppearanceTab'
import { ApiKeysTab } from '@/components/settings/ApiKeysTab'
import { ImportExportTab } from '@/components/settings/ImportExportTab'

export default async function SettingsPage() {
  const t = await getTranslations('Settings')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: profile }, { data: apiKeys }] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).single(),
    supabase
      .from('api_keys')
      .select('id, name, last_used_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  if (!profile) return null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">{t('tabs.profile')}</TabsTrigger>
          <TabsTrigger value="languages">{t('tabs.languages')}</TabsTrigger>
          <TabsTrigger value="appearance">{t('tabs.appearance')}</TabsTrigger>
          <TabsTrigger value="apiKeys">{t('tabs.apiKeys')}</TabsTrigger>
          <TabsTrigger value="importExport">{t('tabs.importExport')}</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab profile={profile} />
        </TabsContent>

        <TabsContent value="languages">
          <LanguagesTab profile={profile} />
        </TabsContent>

        <TabsContent value="appearance">
          <AppearanceTab />
        </TabsContent>

        <TabsContent value="apiKeys">
          <ApiKeysTab apiKeys={apiKeys ?? []} />
        </TabsContent>

        <TabsContent value="importExport">
          <ImportExportTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
