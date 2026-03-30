'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  LayoutDashboard,
  BookOpen,
  Library,
  GraduationCap,
  Settings,
  Globe,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, key: 'dashboard' },
  { href: '/words', icon: BookOpen, key: 'words' },
  { href: '/collections', icon: Library, key: 'collections' },
  { href: '/study', icon: GraduationCap, key: 'study' },
  { href: '/settings', icon: Settings, key: 'settings' },
] as const

export function AppSidebar() {
  const t = useTranslations('nav')
  const pathname = usePathname()

  // Strip locale prefix for comparison
  const currentPath = pathname.replace(/^\/(uk|en)/, '') || '/'

  return (
    <aside className="hidden md:flex w-56 flex-col border-r border-border bg-card h-full">
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-border">
        <span className="font-bold text-lg">happylearn</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ href, icon: Icon, key }) => {
          const isActive = currentPath.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t(key)}
            </Link>
          )
        })}
      </nav>

      {/* Catalog link */}
      <div className="p-3 border-t border-border">
        <Link
          href="/catalog"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Globe className="w-4 h-4" />
          {t('catalog')}
        </Link>
      </div>
    </aside>
  )
}
