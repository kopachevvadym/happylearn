import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { UserMenu } from '@/components/shared/UserMenu'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile: { username: string; avatar_url: string | null } | null = null
  if (user) {
    const { data } = await supabase
      .from('users')
      .select('username, avatar_url')
      .eq('id', user.id)
      .single()
    profile = data
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 border-b border-border bg-background sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-full flex items-center justify-between">
          <Link href="/" className="font-bold text-lg">happylearn</Link>
          {profile && <UserMenu user={profile} />}
        </div>
      </header>
      {children}
    </div>
  )
}
