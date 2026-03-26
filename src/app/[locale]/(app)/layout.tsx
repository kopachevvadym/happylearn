import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppSidebar } from '@/components/shared/app-sidebar'
import { AppHeader } from '@/components/shared/app-header'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const { data: profileRaw } = await supabase
    .from('users')
    .select('username, avatar_url, onboarding_completed')
    .eq('id', user.id)
    .single()
  const profile = profileRaw as { username: string; avatar_url: string | null; onboarding_completed: boolean } | null

  // Redirect to onboarding if profile missing or not completed
  if (!profile || !profile.onboarding_completed) {
    redirect('/onboarding')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <AppHeader user={{ username: profile?.username ?? '', avatar_url: profile?.avatar_url ?? null }} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
