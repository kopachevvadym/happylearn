'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { updateLanguageSettings } from '@/app/actions/settings'
import { SUPPORTED_LANGUAGES } from '@/types'
import type { User } from '@/types'

interface LanguagesTabProps {
  profile: User
}

export function LanguagesTab({ profile }: LanguagesTabProps) {
  const t = useTranslations('Settings')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateLanguageSettings(formData)
      if (result?.error) setError(result.error)
      else {
        setSuccess(t('profile.save'))
        setTimeout(() => setSuccess(null), 3000)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      {success && (
        <div className="text-sm text-green-700 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg px-3 py-2">
          {success}
        </div>
      )}

      <Field label={t('languages.sourceLanguage')}>
        <select name="source_lang" defaultValue={profile.default_source_lang ?? 'en'} className={inputClass}>
          {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
            <option key={code} value={code}>{name}</option>
          ))}
        </select>
      </Field>

      <Field label={t('languages.targetLanguage')}>
        <select name="target_lang" defaultValue={profile.default_target_lang ?? 'uk'} className={inputClass}>
          {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
            <option key={code} value={code}>{name}</option>
          ))}
        </select>
      </Field>

      <Field label={t('languages.dailyGoal')}>
        <select name="daily_goal" defaultValue={String(profile.daily_goal)} className={inputClass}>
          <option value="5">5 {t('languages.words')}</option>
          <option value="10">10 {t('languages.words')}</option>
          <option value="20">20 {t('languages.words')}</option>
        </select>
      </Field>

      <div className="flex justify-end">
        <button type="submit" disabled={isPending} className={primaryBtn}>
          {isPending ? '...' : t('languages.save')}
        </button>
      </div>
    </form>
  )
}

const inputClass = 'w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const primaryBtn = 'h-10 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  )
}
