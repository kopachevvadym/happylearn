'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Trash2, Copy, Check } from 'lucide-react'
import { createApiKey, deleteApiKey } from '@/app/actions/settings'
import type { ApiKey } from '@/types'

interface ApiKeysTabProps {
  apiKeys: Pick<ApiKey, 'id' | 'name' | 'last_used_at' | 'created_at'>[]
}

export function ApiKeysTab({ apiKeys: initialApiKeys }: ApiKeysTabProps) {
  const t = useTranslations('Settings')
  const [isPending, startTransition] = useTransition()
  const [apiKeys, setApiKeys] = useState(initialApiKeys)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = () => {
    if (!newKeyName.trim()) return
    setError(null)
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

  const handleDelete = (keyId: string, name: string) => {
    if (!confirm(t('apiKeys.deleteConfirm', { name }))) return
    startTransition(async () => {
      await deleteApiKey(keyId)
      setApiKeys((prev) => prev.filter((k) => k.id !== keyId))
    })
  }

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6 max-w-lg">
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {newKeyValue && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">{t('apiKeys.oneTimeWarning')}</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs break-all bg-white dark:bg-black/20 rounded px-2 py-1.5">{newKeyValue}</code>
            <button
              type="button"
              onClick={() => copyKey(newKeyValue)}
              className="p-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded shrink-0"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          {copied && <p className="text-xs text-green-600">{t('apiKeys.copied')}</p>}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder={t('apiKeys.keyName')}
          className={`flex-1 h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring`}
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={isPending || !newKeyName.trim()}
          className="h-10 px-3 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-60 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          {t('apiKeys.create')}
        </button>
      </div>

      <div className="space-y-2">
        {apiKeys.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t('apiKeys.noKeys')}</p>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-3 py-1.5 text-xs text-muted-foreground">
              <span>{t('apiKeys.name')}</span>
              <span>{t('apiKeys.created')}</span>
              <span>{t('apiKeys.lastUsed')}</span>
              <span />
            </div>
            {apiKeys.map((key) => (
              <div key={key.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-center px-3 py-3 border border-border rounded-lg">
                <span className="text-sm font-medium truncate">{key.name}</span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(key.created_at).toLocaleDateString()}
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : '—'}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(key.id, key.name)}
                  className="p-1.5 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
