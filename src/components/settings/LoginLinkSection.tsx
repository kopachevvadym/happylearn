'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Link2, Copy, Check, TriangleAlert } from 'lucide-react'
import { generateLoginLink } from '@/app/actions/settings'

export function LoginLinkSection() {
  const t = useTranslations('Settings')
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleGenerate = () => {
    setError(null)
    setCopied(false)
    startTransition(async () => {
      const result = await generateLoginLink()
      if (result?.error || !result?.url) {
        setError(result?.error ?? t('loginLink.failed'))
        return
      }
      setUrl(result.url)
    })
  }

  const handleCopy = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable — the user can still select the text manually
    }
  }

  return (
    <section className="mt-10 pt-6 border-t border-border max-w-lg space-y-3">
      <div>
        <h2 className="text-sm font-medium flex items-center gap-2">
          <Link2 aria-hidden="true" className="w-4 h-4" />
          {t('loginLink.title')}
        </h2>
        <p className="text-xs text-muted-foreground mt-1">{t('loginLink.description')}</p>
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {url ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              aria-label={t('loginLink.title')}
              className="flex-1 h-10 px-3 rounded-lg border border-input bg-muted/50 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="h-10 px-3 rounded-lg border border-border text-sm hover:bg-accent transition-colors flex items-center gap-1.5 shrink-0"
            >
              {copied ? (
                <Check aria-hidden="true" className="w-4 h-4 text-green-500" />
              ) : (
                <Copy aria-hidden="true" className="w-4 h-4" />
              )}
              {copied ? t('loginLink.copied') : t('loginLink.copy')}
            </button>
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
            <TriangleAlert aria-hidden="true" className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            {t('loginLink.warning')}
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isPending}
          className="h-10 px-4 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors disabled:opacity-60"
        >
          {isPending ? '…' : t('loginLink.generate')}
        </button>
      )}

      {url && (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isPending}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60"
        >
          {isPending ? '…' : t('loginLink.regenerate')}
        </button>
      )}
    </section>
  )
}
