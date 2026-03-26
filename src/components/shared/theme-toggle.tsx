'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

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
        title="Світла тема"
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
        title="Темна тема"
      >
        <Moon className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
