'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { SUPPORTED_LANGUAGES } from '@/types'

interface CollectionFormProps {
  collection?: {
    name: string
    description: string | null
    source_lang: string
    target_lang: string
    is_public: boolean
  }
  defaultSourceLang: string
  defaultTargetLang: string
  onSubmit: (formData: FormData) => Promise<{ error?: string; success?: boolean } | undefined>
  onCancel: () => void
}

export function CollectionForm({
  collection,
  defaultSourceLang,
  defaultTargetLang,
  onSubmit,
  onCancel,
}: CollectionFormProps) {
  const t = useTranslations('collections')
  const tWords = useTranslations('words')
  const tCommon = useTranslations('common')
  const [isPublic, setIsPublic] = useState(collection?.is_public ?? false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('is_public', String(isPublic))
    startTransition(async () => {
      const result = await onSubmit(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="border border-border rounded-xl p-4 bg-card space-y-4">
      <h3 className="font-semibold">
        {collection ? t('edit_collection') : t('new_collection')}
      </h3>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">{t('name_field')}</label>
          <input
            name="name"
            defaultValue={collection?.name}
            required
            className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">{t('description_field')}</label>
          <input
            name="description"
            defaultValue={collection?.description ?? ''}
            className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">{tWords('sourceLanguage')}</label>
            <select
              name="source_lang"
              defaultValue={collection?.source_lang ?? defaultSourceLang}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">{tWords('targetLanguage')}</label>
            <select
              name="target_lang"
              defaultValue={collection?.target_lang ?? defaultTargetLang}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => setIsPublic(!isPublic)}
            className={`relative w-10 h-5 rounded-full transition-colors ${isPublic ? 'bg-primary' : 'bg-muted'}`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isPublic ? 'translate-x-5' : 'translate-x-0.5'}`}
            />
          </div>
          <span className="text-sm">{t('public_toggle')}</span>
        </label>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-10 border border-input rounded-lg text-sm hover:bg-accent transition-colors"
          >
            {tCommon('cancel')}
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 h-10 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {isPending ? '...' : collection ? tCommon('save') : t('create_btn')}
          </button>
        </div>
      </form>
    </div>
  )
}
