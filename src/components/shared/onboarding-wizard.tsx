'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { completeOnboarding } from '@/app/actions/onboarding'
import { SUPPORTED_LANGUAGES, type LanguageCode } from '@/types'

const GOALS = [5, 10, 20] as const

export function OnboardingWizard() {
  const t = useTranslations('onboarding')
  const tCommon = useTranslations('common')
  const [step, setStep] = useState(1)
  const [sourceLang, setSourceLang] = useState<LanguageCode>('uk')
  const [targetLang, setTargetLang] = useState<LanguageCode>('en')
  const [dailyGoal, setDailyGoal] = useState(10)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = () => {
    setError(null)
    const formData = new FormData()
    formData.set('source_lang', sourceLang)
    formData.set('target_lang', targetLang)
    formData.set('daily_goal', String(dailyGoal))
    startTransition(async () => {
      const result = await completeOnboarding(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      {/* Progress indicator */}
      <div className="flex gap-2 mb-6">
        {[1, 2].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              s <= step ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 mb-4">
          {error}
        </div>
      )}

      {/* Step 1: Language pair */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-xl font-semibold">{t('step1_title')}</h2>
            <p className="text-muted-foreground text-sm mt-1">{t('step1_subtitle')}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('source_lang')}</label>
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value as LanguageCode)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('target_lang')}</label>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value as LanguageCode)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            {SUPPORTED_LANGUAGES[sourceLang]} → {SUPPORTED_LANGUAGES[targetLang]}
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={sourceLang === targetLang}
            className="w-full h-10 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {t('next')}
          </button>
        </div>
      )}

      {/* Step 2: Daily goal */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-xl font-semibold">{t('step2_title')}</h2>
            <p className="text-muted-foreground text-sm mt-1">{t('step2_subtitle')}</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {GOALS.map((goal) => (
              <button
                key={goal}
                onClick={() => setDailyGoal(goal)}
                className={`flex flex-col items-center p-4 rounded-xl border-2 transition-colors ${
                  dailyGoal === goal
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <span className="font-bold text-lg">{goal}</span>
                <span className="text-xs text-muted-foreground mt-1">
                  {goal === 5 ? t('goal_5_desc') : goal === 10 ? t('goal_10_desc') : t('goal_20_desc')}
                </span>
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 h-10 border border-input rounded-lg text-sm hover:bg-accent transition-colors"
            >
              ← {tCommon('back')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="flex-1 h-10 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {isPending ? '...' : t('start_btn')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
