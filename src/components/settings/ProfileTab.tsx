'use client'

import { useState, useTransition, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { updateProfile } from '@/app/actions/settings'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types'

interface ProfileTabProps {
  profile: User
}

export function ProfileTab({ profile }: ProfileTabProps) {
  const t = useTranslations('Settings')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const initials = profile.username.slice(0, 2).toUpperCase()

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setAvatarUploading(true)
    setError(null)

    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `${profile.id}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })

      if (uploadError) {
        setError(uploadError.message)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path)

      setAvatarUrl(publicUrl)
    } catch {
      setError('Upload failed')
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('avatar_url', avatarUrl)
    startTransition(async () => {
      const result = await updateProfile(formData)
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

      <div className="flex flex-col items-start gap-3">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-muted flex items-center justify-center text-xl font-semibold shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={profile.username} className="w-full h-full object-cover" />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={avatarUploading}
          className="text-sm text-primary hover:underline disabled:opacity-60"
        >
          {avatarUploading ? '...' : t('profile.changePhoto')}
        </button>
      </div>

      <Field label={t('profile.username')}>
        <input
          name="username"
          defaultValue={profile.username}
          className={inputClass}
        />
        <p className="text-xs text-muted-foreground mt-1">{t('profile.usernameHint')}</p>
      </Field>

      <Field label={t('profile.role')}>
        <input
          name="display_role"
          defaultValue={profile.display_role ?? ''}
          className={inputClass}
        />
      </Field>

      <Field label={t('profile.bio')}>
        <textarea
          name="bio"
          defaultValue={profile.bio ?? ''}
          rows={3}
          className={`${inputClass} h-auto py-2`}
        />
      </Field>

      <div className="flex justify-end">
        <button type="submit" disabled={isPending || avatarUploading} className={primaryBtn}>
          {isPending ? '...' : t('profile.save')}
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
