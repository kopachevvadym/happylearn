'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function AppearanceTab() {
  const t = useTranslations('Settings')
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => setMounted(true), [])

  const handleLocaleChange = (locale: string) => {
    const segments = pathname.split('/')
    segments[1] = locale
    router.push(segments.join('/'))
  }

  const currentLocale = pathname.split('/')[1]

  return (
    <div className="space-y-6 max-w-lg">
      <div className="space-y-3">
        <p className="text-sm font-medium">{t('appearance.theme')}</p>
        <div className="flex gap-2">
          {(['light', 'dark', 'system'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={cn(
                'flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors',
                mounted && theme === value
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-border hover:border-primary/50 text-muted-foreground'
              )}
            >
              {value === 'light' ? t('appearance.light') : value === 'dark' ? t('appearance.dark') : t('appearance.system')}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">{t('appearance.language')}</p>
        <div className="flex gap-2">
          {(['uk', 'en'] as const).map((locale) => (
            <button
              key={locale}
              type="button"
              onClick={() => handleLocaleChange(locale)}
              className={cn(
                'flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors',
                currentLocale === locale
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-border hover:border-primary/50 text-muted-foreground'
              )}
            >
              {locale === 'uk' ? 'Українська' : 'English'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
