'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import {
  loginWithPassword,
  registerWithPassword,
  loginWithGoogle,
  sendMagicLink,
} from '@/app/actions/auth'

type Tab = 'login' | 'register' | 'magic'

export function AuthTabs() {
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')
  const [tab, setTab] = useState<Tab>('login')
  const [error, setError] = useState<string | null>(null)
  const [magicSent, setMagicSent] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleLogin = (formData: FormData) => {
    setError(null)
    startTransition(async () => {
      const result = await loginWithPassword(formData)
      if (result?.error) setError(result.error)
    })
  }

  const handleRegister = (formData: FormData) => {
    setError(null)
    startTransition(async () => {
      const result = await registerWithPassword(formData)
      if (result?.error) setError(result.error)
    })
  }

  const handleMagicLink = (formData: FormData) => {
    setError(null)
    startTransition(async () => {
      const result = await sendMagicLink(formData)
      if (result?.error) setError(result.error)
      else setMagicSent(true)
    })
  }

  const handleGoogle = () => {
    setError(null)
    startTransition(async () => {
      const result = await loginWithGoogle()
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
      {/* Tab switcher */}
      <div role="tablist" className="flex rounded-lg bg-muted p-1 gap-1">
        {(['login', 'register', 'magic'] as Tab[]).map((t_) => (
          <button
            key={t_}
            role="tab"
            aria-selected={tab === t_}
            onClick={() => { setTab(t_); setError(null); setMagicSent(false) }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === t_
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t_ === 'login' ? t('login_tab') : t_ === 'register' ? t('register_tab') : t('magic_link_btn')}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Login form */}
      {tab === 'login' && (
        <form action={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="login-email" className="text-sm font-medium">{t('email')}</label>
            <input
              id="login-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="login-password" className="text-sm font-medium">{t('password')}</label>
            <input
              id="login-password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            aria-busy={isPending}
            className="w-full h-10 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {isPending ? tCommon('loading') : t('login_btn')}
          </button>
        </form>
      )}

      {/* Register form */}
      {tab === 'register' && (
        <form action={handleRegister} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="reg-username" className="text-sm font-medium">{t('username')}</label>
            <input
              id="reg-username"
              name="username"
              type="text"
              required
              autoComplete="username"
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="my_username"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="reg-email" className="text-sm font-medium">{t('email')}</label>
            <input
              id="reg-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="reg-password" className="text-sm font-medium">{t('password')}</label>
            <input
              id="reg-password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            aria-busy={isPending}
            className="w-full h-10 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {isPending ? tCommon('loading') : t('register_btn')}
          </button>
          <p className="text-xs text-center text-muted-foreground">{t('terms')}</p>
        </form>
      )}

      {/* Magic link form */}
      {tab === 'magic' && (
        <div className="space-y-4">
          {magicSent ? (
            <div className="text-center py-4 space-y-2">
              <p className="text-2xl">📬</p>
              <p className="font-medium">{t('magic_link_sent')}</p>
            </div>
          ) : (
            <form action={handleMagicLink} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="magic-email" className="text-sm font-medium">{t('email')}</label>
                <input
                  id="magic-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="you@example.com"
                />
              </div>
              <button
                type="submit"
                disabled={isPending}
                aria-busy={isPending}
                className="w-full h-10 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {isPending ? tCommon('loading') : t('magic_link_btn')}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">{tCommon('or')}</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Google OAuth */}
      <button
        onClick={handleGoogle}
        disabled={isPending}
        className="w-full h-10 flex items-center justify-center gap-2 border border-input rounded-lg text-sm hover:bg-accent transition-colors disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        {t('google_btn')}
      </button>
    </div>
  )
}
