import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { profileKeys } from '@/lib/queries/keys'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ProfileTab } from '@/components/settings/ProfileTab'
import { LoginLinkSection } from '@/components/settings/LoginLinkSection'
import { LanguagesTab } from '@/components/settings/LanguagesTab'
import { AppearanceTab } from '@/components/settings/AppearanceTab'
import { ApiKeysTab } from '@/components/settings/ApiKeysTab'
import { ImportExportTab } from '@/components/settings/ImportExportTab'
import { StudyTab } from '@/components/settings/StudyTab'

export default async function SettingsPage() {
  const t = await getTranslations('Settings')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const queryClient = new QueryClient()

  const [{ data: profile }, { data: apiKeys }] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).single(),
    supabase
      .from('api_keys')
      .select('id, name, prefix, last_used_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  // Seed profile into query cache so other pages share it without re-fetching
  if (profile) {
    queryClient.setQueryData(profileKeys.detail(user.id), profile)
    queryClient.setQueryData(profileKeys.langs(user.id), {
      default_source_lang: profile.default_source_lang,
      default_target_lang: profile.default_target_lang,
    })
  }

  if (!profile) return null

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>

        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile">{t('tabs.profile')}</TabsTrigger>
            <TabsTrigger value="languages">{t('tabs.languages')}</TabsTrigger>
            <TabsTrigger value="appearance">{t('tabs.appearance')}</TabsTrigger>
            <TabsTrigger value="apiKeys">{t('tabs.apiKeys')}</TabsTrigger>
            <TabsTrigger value="importExport">{t('tabs.importExport')}</TabsTrigger>
            <TabsTrigger value="study">{t('tabs.study')}</TabsTrigger>
          </TabsList>

          <TabsContent forceMount className="data-[state=inactive]:hidden" value="profile">
            <ProfileTab profile={profile} />
            <LoginLinkSection />
          </TabsContent>

          <TabsContent forceMount className="data-[state=inactive]:hidden" value="languages">
            <LanguagesTab profile={profile} />
          </TabsContent>

          <TabsContent forceMount className="data-[state=inactive]:hidden" value="appearance">
            <AppearanceTab />
          </TabsContent>

          <TabsContent forceMount className="data-[state=inactive]:hidden" value="apiKeys">
            <ApiKeysTab apiKeys={apiKeys ?? []} />
          </TabsContent>

          <TabsContent forceMount className="data-[state=inactive]:hidden" value="importExport">
            <ImportExportTab />
          </TabsContent>

          <TabsContent forceMount className="data-[state=inactive]:hidden" value="study">
            <StudyTab />
          </TabsContent>
        </Tabs>
      </div>
    </HydrationBoundary>
  )
}
