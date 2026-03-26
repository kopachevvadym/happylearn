'use client'

import { useTranslations } from 'next-intl'
import { useTransition } from 'react'
import { LogOut, User } from 'lucide-react'
import { logout } from '@/app/actions/auth'
import { ThemeToggle } from './theme-toggle'

interface AppHeaderProps {
  user: { username: string; avatar_url: string | null }
}

export function AppHeader({ user }: AppHeaderProps) {
  const t = useTranslations('nav')
  const [isPending, startTransition] = useTransition()

  const handleLogout = () => {
    startTransition(async () => {
      await logout()
    })
  }

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
      {/* Mobile logo */}
      <span className="font-bold md:hidden">happylearn</span>

      <div className="hidden md:block" />

      <div className="flex items-center gap-3">
        <ThemeToggle />

        <div className="flex items-center gap-2 text-sm">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground hidden sm:block">{user.username}</span>
        </div>

        <button
          onClick={handleLogout}
          disabled={isPending}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60"
          title={t('logout')}
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:block">{t('logout')}</span>
        </button>
      </div>
    </header>
  )
}
