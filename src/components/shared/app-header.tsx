'use client'

import { UserMenu } from './UserMenu'

interface AppHeaderProps {
  user: { username: string; avatar_url: string | null }
}

export function AppHeader({ user }: AppHeaderProps) {
  return (
    <header className="h-16 border-b border-border bg-card flex items-center px-6">
      {/* Mobile logo */}
      <span className="font-bold md:hidden">happylearn</span>

      <div className="max-w-4xl w-full mx-auto flex justify-end">
        <UserMenu user={user} />
      </div>
    </header>
  )
}
