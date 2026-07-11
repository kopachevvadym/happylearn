import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { UserMenu } from './UserMenu'

export async function PublicHeader() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const tNav = await getTranslations('nav')
  const tLanding = await getTranslations('landing')

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
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
        <Link href="/" className="font-bold text-xl">happylearn</Link>
        <nav className="flex items-center gap-4">
          {profile ? (
            <UserMenu user={profile} />
          ) : (
            <>
              <Link
                href="/catalog"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {tNav('catalog')}
              </Link>
              <Link
                href="/auth"
                className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                {tLanding('cta_start')}
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
