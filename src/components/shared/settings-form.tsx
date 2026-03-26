'use client'

import { useState, useTransition, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import { Copy, Trash2, Plus, Download, Upload } from 'lucide-react'
import {
  updateProfile,
  updateLanguageSettings,
  createApiKey,
  deleteApiKey,
  exportData,
  importWords,
} from '@/app/actions/settings'
import type { User, ApiKey } from '@/types'
import { SUPPORTED_LANGUAGES } from '@/types'

interface SettingsFormProps {
  profile: User
  apiKeys: Pick<ApiKey, 'id' | 'name' | 'last_used_at' | 'created_at'>[]
}

export function SettingsForm({ profile, apiKeys: initialApiKeys }: SettingsFormProps) {
  const t = useTranslations('settings')
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [apiKeys, setApiKeys] = useState(initialApiKeys)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)

  const notify = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 3000)
  }

  const handleProfileSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateProfile(formData)
      if (result?.error) setError(result.error)
      else notify(t('profile_saved'))
    })
  }

  const handleLangSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateLanguageSettings(formData)
      if (result?.error) setError(result.error)
      else notify(t('profile_saved'))
    })
  }

  const handleCreateApiKey = () => {
    if (!newKeyName.trim()) return
    startTransition(async () => {
      const result = await createApiKey(newKeyName.trim())
      if (result?.error) {
        setError(result.error)
      } else if (result?.data) {
        setApiKeys((prev) => [result.data!, ...prev])
        setNewKeyValue(result.data.key)
        setNewKeyName('')
      }
    })
  }

  const handleDeleteApiKey = (keyId: string, name: string) => {
    if (!confirm(t('api_key_delete_confirm', { name }))) return
    startTransition(async () => {
      await deleteApiKey(keyId)
      setApiKeys((prev) => prev.filter((k) => k.id !== keyId))
    })
  }

  const handleExport = () => {
    startTransition(async () => {
      const result = await exportData()
      if (result?.data) {
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'happylearn-export.json'
        a.click()
        URL.revokeObjectURL(url)
      }
    })
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (!Array.isArray(data)) return setError('Invalid JSON format')
        startTransition(async () => {
          const result = await importWords(data, true)
          if (result?.error) setError(result.error)
          else notify(`Імпортовано: ${result.inserted} слів`)
        })
      } catch {
        setError('Invalid JSON file')
      }
    }
    reader.readAsText(file)
  }

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    setCopiedKey(true)
    setTimeout(() => setCopiedKey(false), 2000)
  }

  return (
    <div className="space-y-6">
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

      {/* Profile */}
      <section className="bg-card border border-border rounded-xl p-4 space-y-4">
        <h2 className="font-semibold">{t('profile_section')}</h2>
        <form onSubmit={handleProfileSave} className="space-y-3">
          <Field label={t('username_field')}>
            <input name="username" defaultValue={profile.username} className={inputClass} />
          </Field>
          <Field label={t('display_role_field')}>
            <input name="display_role" defaultValue={profile.display_role ?? ''} className={inputClass} />
          </Field>
          <Field label={t('bio_field')}>
            <textarea name="bio" defaultValue={profile.bio ?? ''} rows={3} className={`${inputClass} h-auto py-2`} />
          </Field>
          <Field label={t('avatar_url_field')}>
            <input name="avatar_url" type="url" defaultValue={profile.avatar_url ?? ''} className={inputClass} />
          </Field>
          <button type="submit" disabled={isPending} className={primaryBtn}>
            {isPending ? '...' : 'Зберегти профіль'}
          </button>
        </form>
      </section>

      {/* Languages & Goal */}
      <section className="bg-card border border-border rounded-xl p-4 space-y-4">
        <h2 className="font-semibold">{t('languages_section')}</h2>
        <form onSubmit={handleLangSave} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('source_lang_field')}>
              <select name="source_lang" defaultValue={profile.default_source_lang} className={inputClass}>
                {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </Field>
            <Field label={t('target_lang_field')}>
              <select name="target_lang" defaultValue={profile.default_target_lang} className={inputClass}>
                {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label={t('daily_goal_field')}>
            <select name="daily_goal" defaultValue={String(profile.daily_goal)} className={inputClass}>
              <option value="5">5 слів</option>
              <option value="10">10 слів</option>
              <option value="20">20 слів</option>
            </select>
          </Field>
          <button type="submit" disabled={isPending} className={primaryBtn}>
            {isPending ? '...' : 'Зберегти'}
          </button>
        </form>
      </section>

      {/* Appearance */}
      <section className="bg-card border border-border rounded-xl p-4 space-y-4">
        <h2 className="font-semibold">{t('appearance_section')}</h2>
        <div className="flex gap-3">
          {(['light', 'dark', 'system'] as const).map((t_) => (
            <button
              key={t_}
              onClick={() => setTheme(t_)}
              className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                mounted && theme === t_ ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
            >
              {t_ === 'light' ? t('theme_light') : t_ === 'dark' ? t('theme_dark') : t('theme_system')}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          {(['uk', 'en'] as const).map((locale) => (
            <button
              key={locale}
              onClick={() => router.push(`/${locale}/settings`)}
              className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors border-border hover:border-primary/50`}
            >
              {locale === 'uk' ? 'Українська' : 'English'}
            </button>
          ))}
        </div>
      </section>

      {/* API Keys */}
      <section className="bg-card border border-border rounded-xl p-4 space-y-4">
        <h2 className="font-semibold">{t('api_section')}</h2>

        {newKeyValue && (
          <div className="bg-muted rounded-lg p-3 space-y-2">
            <p className="text-xs text-muted-foreground">Збережіть ключ — він більше не буде показаний:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs break-all">{newKeyValue}</code>
              <button onClick={() => copyKey(newKeyValue)} className="p-1.5 hover:bg-accent rounded">
                <Copy className="w-4 h-4" />
              </button>
            </div>
            {copiedKey && <p className="text-xs text-green-600">Скопійовано!</p>}
          </div>
        )}

        <div className="flex gap-2">
          <input
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder={t('api_key_name')}
            className={`flex-1 h-9 ${inputClass}`}
          />
          <button
            onClick={handleCreateApiKey}
            disabled={isPending || !newKeyName.trim()}
            className="h-9 px-3 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-60 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            {t('api_new_key')}
          </button>
        </div>

        <div className="space-y-2">
          {apiKeys.map((key) => (
            <div key={key.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
              <div className="flex-1">
                <p className="text-sm font-medium">{key.name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(key.created_at).toLocaleDateString()}
                  {key.last_used_at && ` · Last used ${new Date(key.last_used_at).toLocaleDateString()}`}
                </p>
              </div>
              <button
                onClick={() => handleDeleteApiKey(key.id, key.name)}
                className="p-1.5 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {apiKeys.length === 0 && (
            <p className="text-sm text-muted-foreground">Немає ключів</p>
          )}
        </div>
      </section>

      {/* Import / Export */}
      <section className="bg-card border border-border rounded-xl p-4 space-y-4">
        <h2 className="font-semibold">{t('import_export_section')}</h2>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm hover:bg-accent transition-colors"
          >
            <Download className="w-4 h-4" />
            {t('export_btn')} JSON
          </button>
          <label className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm hover:bg-accent transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            {t('import_btn')} JSON
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">{t('import_format')}</p>
      </section>
    </div>
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
