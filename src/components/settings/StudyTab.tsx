'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'

const DEBUG_KEY = 'study_debug_mode'

export function StudyTab() {
  const t = useTranslations('Settings')
  const [debugMode, setDebugMode] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      setDebugMode(localStorage.getItem(DEBUG_KEY) === 'true')
    } catch {
      // ignore
    }
  }, [])

  const toggle = (value: boolean) => {
    setDebugMode(value)
    try {
      localStorage.setItem(DEBUG_KEY, String(value))
    } catch {
      // ignore
    }
  }

  if (!mounted) return null

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-medium">{t('study.debugMode')}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{t('study.debugModeDesc')}</div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={debugMode}
          onClick={() => toggle(!debugMode)}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${debugMode ? 'bg-primary' : 'bg-muted'}`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${debugMode ? 'translate-x-6' : 'translate-x-1'}`}
          />
        </button>
      </div>
    </div>
  )
}
