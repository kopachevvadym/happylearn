'use client'

import { useTheme } from 'next-themes'
import { useTranslations } from 'next-intl'
import { Sun, Moon } from 'lucide-react'
import { useMounted } from '@/hooks/use-mounted'

export function ThemeToggle() {
  const t = useTranslations('common')
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useMounted()

  if (!mounted) {
    return <div className="w-[72px] h-8" />
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
      <button
        onClick={() => setTheme('light')}
        className={`w-8 h-7 flex items-center justify-center rounded-md transition-colors ${
          !isDark
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        title={t('theme_light')}
      >
        <Sun className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`w-8 h-7 flex items-center justify-center rounded-md transition-colors ${
          isDark
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        title={t('theme_dark')}
      >
        <Moon className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
