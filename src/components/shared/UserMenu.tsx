'use client'

import { useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import { useTransition, useEffect, useState } from 'react'
import { User, Settings, Sun, Moon, LogOut, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { logout } from '@/app/actions/auth'
import { useRouter } from 'next/navigation'

interface UserMenuProps {
  user: { username: string; avatar_url: string | null }
}

export function UserMenu({ user }: UserMenuProps) {
  const t = useTranslations('UserMenu')
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => setMounted(true), [])

  const isDark = mounted && resolvedTheme === 'dark'

  const initials = user.username ? user.username[0].toUpperCase() : '?'

  const handleLogout = () => {
    startTransition(async () => {
      await logout()
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.username}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
              {initials}
            </div>
          )}
          <span className="hidden sm:block font-medium">{user.username}</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 rounded-md p-1.5 space-y-0.5">
        <DropdownMenuItem className="py-1.5 px-2.5 rounded-sm" onClick={() => router.push(`/profile/${user.username}`)}>
          <User className="w-4 h-4 mr-2" />
          {t('profile')}
        </DropdownMenuItem>
        <DropdownMenuItem className="py-1.5 px-2.5 rounded-sm" onClick={() => router.push('/settings')}>
          <Settings className="w-4 h-4 mr-2" />
          {t('settings')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="py-1.5 px-2.5 rounded-sm flex items-center justify-between"
        >
          <span className="flex items-center gap-2">
            {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            {t('theme')}
          </span>
          <div className="w-8 h-4 rounded-full bg-muted relative flex-shrink-0">
            <div
              className={`absolute top-0.5 w-3 h-3 rounded-full bg-foreground transition-transform ${
                isDark ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-1" />
        <DropdownMenuItem
          onClick={handleLogout}
          disabled={isPending}
          className="py-1.5 px-2.5 rounded-sm text-destructive focus:text-destructive"
        >
          <LogOut className="w-4 h-4 mr-2" />
          {t('signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
