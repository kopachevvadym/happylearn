'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Trash2, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react'
import { Dialog, AlertDialog } from 'radix-ui'
import { createApiKey, deleteApiKey } from '@/app/actions/settings'
import type { ApiKey } from '@/types'

// ─── Types ───────────────────────────────────────────────────────────────────

type ApiKeyRow = Pick<ApiKey, 'id' | 'name' | 'prefix' | 'last_used_at' | 'created_at'>

interface ApiKeysTabProps {
  apiKeys: ApiKeyRow[]
}

interface Endpoint {
  id: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  descriptionKey: string
  pathParams?: string[]
  exampleBody?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = 'https://happylearn.club/api/v1'

const ENDPOINTS: Endpoint[] = [
  { id: 'get-words', method: 'GET', path: '/api/v1/words', descriptionKey: 'getWords' },
  {
    id: 'post-words',
    method: 'POST',
    path: '/api/v1/words',
    descriptionKey: 'postWords',
    exampleBody: JSON.stringify(
      { word: 'beautiful', translations: ['гарний', 'прекрасний'], examples: ['She is beautiful.'], source_lang: 'en', target_lang: 'uk' },
      null, 2
    ),
  },
  {
    id: 'put-words',
    method: 'PUT',
    path: '/api/v1/words/:id',
    descriptionKey: 'putWords',
    pathParams: ['id'],
    exampleBody: JSON.stringify({ translations: ['гарний'] }, null, 2),
  },
  { id: 'delete-words', method: 'DELETE', path: '/api/v1/words/:id', descriptionKey: 'deleteWords', pathParams: ['id'] },
  { id: 'get-collections', method: 'GET', path: '/api/v1/collections', descriptionKey: 'getCollections' },
  {
    id: 'post-collections',
    method: 'POST',
    path: '/api/v1/collections',
    descriptionKey: 'postCollections',
    exampleBody: JSON.stringify({ name: 'Business English', source_lang: 'en', target_lang: 'uk', is_public: false }, null, 2),
  },
  { id: 'get-collection', method: 'GET', path: '/api/v1/collections/:id', descriptionKey: 'getCollection', pathParams: ['id'] },
  { id: 'get-public-collections', method: 'GET', path: '/api/v1/public/collections', descriptionKey: 'getPublicCollections' },
  { id: 'get-me', method: 'GET', path: '/api/v1/me', descriptionKey: 'getMe' },
  { id: 'export', method: 'GET', path: '/api/v1/export', descriptionKey: 'export' },
  {
    id: 'import',
    method: 'POST',
    path: '/api/v1/import',
    descriptionKey: 'import',
    exampleBody: JSON.stringify([{ word: 'beautiful', translations: ['гарний'], source_lang: 'en', target_lang: 'uk' }], null, 2),
  },
]

const METHOD_STYLES: Record<string, string> = {
  GET: 'bg-secondary text-secondary-foreground',
  POST: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  PUT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  DELETE: 'bg-destructive/10 text-destructive',
}

// ─── EndpointTester ───────────────────────────────────────────────────────────

function EndpointTester({
  endpoint,
  apiKeys,
  createdKey,
}: {
  endpoint: Endpoint
  apiKeys: ApiKeyRow[]
  createdKey: string | null
}) {
  const t = useTranslations('Settings.apiKeys')
  const [selectedKeyId, setSelectedKeyId] = useState(apiKeys[0]?.id ?? '')
  const [pathParams, setPathParams] = useState<Record<string, string>>({})
  const [body, setBody] = useState(endpoint.exampleBody ?? '')
  const [response, setResponse] = useState<{ status: number; data: unknown } | null>(null)
  const [loading, setLoading] = useState(false)

  const buildUrl = () => {
    let path = endpoint.path
    for (const [k, v] of Object.entries(pathParams)) {
      path = path.replace(`:${k}`, encodeURIComponent(v))
    }
    // Use relative path so the request goes to the same origin (avoids CORS in dev and prod)
    return path
  }

  const getBearerKey = () => {
    // If the currently-selected key was just created, we have the full key in state
    if (createdKey && apiKeys[0]?.id === selectedKeyId) return createdKey
    return ''
  }

  const handleTest = async () => {
    const bearerKey = getBearerKey()
    if (!bearerKey) return
    setLoading(true)
    setResponse(null)
    try {
      const res = await fetch(buildUrl(), {
        method: endpoint.method,
        headers: {
          Authorization: `Bearer ${bearerKey}`,
          'Content-Type': 'application/json',
        },
        body: ['POST', 'PUT'].includes(endpoint.method) ? body : undefined,
      })
      const data = await res.json().catch(() => null)
      setResponse({ status: res.status, data })
    } catch {
      setResponse({ status: 0, data: { error: 'Network error' } })
    } finally {
      setLoading(false)
    }
  }

  const bearerKey = getBearerKey()
  const canTest = apiKeys.length > 0 && !!bearerKey

  return (
    <div className="space-y-3 pt-2 px-1">
      {/* API key selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-20 shrink-0">{t('selectKey')}</span>
        {apiKeys.length === 0 ? (
          <span className="text-xs text-muted-foreground">{t('noKeysForTester')}</span>
        ) : (
          <select
            value={selectedKeyId}
            onChange={(e) => setSelectedKeyId(e.target.value)}
            className="h-8 rounded-lg border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {apiKeys.map((k) => (
              <option key={k.id} value={k.id}>{k.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Path params */}
      {endpoint.pathParams?.map((param) => (
        <div key={param} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-20 shrink-0 font-mono">{`:${param}`}</span>
          <input
            className="h-8 flex-1 rounded-lg border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder={param}
            value={pathParams[param] ?? ''}
            onChange={(e) => setPathParams((p) => ({ ...p, [param]: e.target.value }))}
          />
        </div>
      ))}

      {/* Body */}
      {['POST', 'PUT'].includes(endpoint.method) && (
        <div>
          <label className="text-xs text-muted-foreground block mb-1">{t('body')}</label>
          <textarea
            className="w-full font-mono text-xs bg-muted rounded-lg p-3 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-ring border border-transparent"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
      )}

      {/* Execute */}
      <button
        type="button"
        onClick={handleTest}
        disabled={loading || !canTest}
        className="h-8 px-3 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? t('executing') : t('executeRequest')}
      </button>

      {!canTest && apiKeys.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Повний ключ доступний тільки одразу після створення
        </p>
      )}

      {/* Response */}
      {response && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-muted-foreground">{t('response')}</span>
            <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${response.status > 0 && response.status < 400 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-destructive/10 text-destructive'}`}>
              {response.status || 'ERR'}
            </span>
          </div>
          <pre className="bg-muted rounded-lg p-3 text-xs overflow-auto max-h-56">
            {JSON.stringify(response.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

// ─── ApiDocs ──────────────────────────────────────────────────────────────────

function ApiDocs({ apiKeys, createdKey }: { apiKeys: ApiKeyRow[]; createdKey: string | null }) {
  const t = useTranslations('Settings.apiKeys')
  const [open, setOpen] = useState<Set<string>>(new Set())

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="mt-10">
      <h3 className="font-medium mb-3">{t('docs')}</h3>

      <div className="bg-muted rounded-lg p-3 font-mono text-sm mb-3">
        {t('baseUrl')}: {BASE_URL}
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        {t('authHeader')}:{' '}
        <code className="bg-muted px-2 py-0.5 rounded text-xs">
          Authorization: Bearer YOUR_API_KEY
        </code>
      </p>

      <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
        {ENDPOINTS.map((endpoint) => {
          const isOpen = open.has(endpoint.id)
          return (
            <div key={endpoint.id}>
              <button
                type="button"
                onClick={() => toggle(endpoint.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
              >
                <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-mono font-bold shrink-0 ${METHOD_STYLES[endpoint.method]}`}>
                  {endpoint.method}
                </span>
                <code className="text-sm text-foreground">{endpoint.path}</code>
                <span className="text-sm text-muted-foreground font-normal ml-1 flex-1">
                  {t(`endpoints.${endpoint.descriptionKey}` as Parameters<typeof t>[0])}
                </span>
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </button>
              {isOpen && (
                <div className="border-t border-border bg-muted/30 px-4 py-3">
                  <EndpointTester endpoint={endpoint} apiKeys={apiKeys} createdKey={createdKey} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ApiKeysTab({ apiKeys: initialApiKeys }: ApiKeysTabProps) {
  const t = useTranslations('Settings')
  const [isPending, startTransition] = useTransition()
  const [apiKeys, setApiKeys] = useState(initialApiKeys)
  const [newKeyName, setNewKeyName] = useState('')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [showKeyDialog, setShowKeyDialog] = useState(false)
  const [copied, setCopied] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
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
        setCreatedKey(result.data.key)
        setNewKeyName('')
        setShowKeyDialog(true)
      }
    })
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    const { id } = deleteTarget
    setError(null)
    startTransition(async () => {
      const result = await deleteApiKey(id)
      if (result?.error) {
        // The key is still active server-side — don't lie by removing it
        setError(result.error)
        setDeleteTarget(null)
        return
      }
      setApiKeys((prev) => prev.filter((k) => k.id !== id))
      setDeleteTarget(null)
    })
  }

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const closeKeyDialog = () => {
    setShowKeyDialog(false)
    // keep createdKey in state so EndpointTester can use it in the session
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* ── Section header ── */}
      <p className="text-sm text-muted-foreground">{t('apiKeys.description')}</p>

      {/* ── Create row ── */}
      <div className="flex gap-2">
        <input
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder={t('apiKeys.keyName')}
          className="flex-1 h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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

      {/* ── Keys table ── */}
      <div className="space-y-1">
        {apiKeys.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t('apiKeys.noKeys')}</p>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 px-3 py-1.5 text-xs text-muted-foreground">
              <span>{t('apiKeys.name')}</span>
              <span>{t('apiKeys.prefix')}</span>
              <span>{t('apiKeys.created')}</span>
              <span>{t('apiKeys.lastUsed')}</span>
              <span />
            </div>
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 items-center px-3 py-3 border border-border rounded-lg"
              >
                <span className="text-sm font-medium truncate">{key.name}</span>
                <code className="text-xs bg-muted px-2 py-1 rounded whitespace-nowrap">
                  {key.prefix}••••••
                </code>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {key.created_at ? new Date(key.created_at).toLocaleDateString() : '—'}
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : t('apiKeys.never')}
                </span>
                <button
                  type="button"
                  onClick={() => setDeleteTarget({ id: key.id, name: key.name })}
                  className="p-1.5 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── New key dialog ── */}
      <Dialog.Root open={showKeyDialog} onOpenChange={(open) => { if (!open) closeKeyDialog() }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background rounded-xl border border-border shadow-xl p-6 space-y-4 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
            <Dialog.Title className="text-base font-semibold">
              {t('apiKeys.newKeyTitle')}
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              {t('apiKeys.newKeyDesc')}
            </Dialog.Description>
            {createdKey && (
              <div className="flex items-center gap-2 bg-muted rounded-lg p-3">
                <code className="flex-1 text-xs break-all">{createdKey}</code>
                <button
                  type="button"
                  onClick={() => copyKey(createdKey)}
                  className="p-1.5 hover:bg-accent rounded shrink-0"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            )}
            {copied && <p className="text-xs text-green-600">{t('apiKeys.copied')}</p>}
            <button
              type="button"
              onClick={closeKeyDialog}
              className="w-full h-10 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
            >
              {t('apiKeys.understood')}
            </button>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ── Delete confirmation dialog ── */}
      <AlertDialog.Root open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background rounded-xl border border-border shadow-xl p-6 space-y-4 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
            <AlertDialog.Title className="text-base font-semibold">
              {t('apiKeys.deleteConfirm', { name: deleteTarget?.name ?? '' })}
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-muted-foreground">
              {t('apiKeys.deleteDesc')}
            </AlertDialog.Description>
            <div className="flex justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <button
                  type="button"
                  className="h-9 px-4 rounded-lg border border-border text-sm hover:bg-muted"
                >
                  {t('importExport.cancel')}
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="h-9 px-4 rounded-lg bg-destructive/10 text-destructive text-sm hover:bg-destructive/20 disabled:opacity-60"
                >
                  {t('apiKeys.delete')}
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      {/* ── API Docs ── */}
      <ApiDocs apiKeys={apiKeys} createdKey={createdKey} />
    </div>
  )
}
