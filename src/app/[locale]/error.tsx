'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { AlertTriangle } from 'lucide-react'

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('errors')

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 space-y-4">
      <AlertTriangle aria-hidden="true" className="w-12 h-12 text-destructive" />
      <p className="text-lg font-medium">{t('generic')}</p>
      <button
        type="button"
        onClick={reset}
        className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors"
      >
        {t('try_again')}
      </button>
    </div>
  )
}
