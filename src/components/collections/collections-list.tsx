'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Pencil, Trash2, Globe, Lock, Copy, UserMinus } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import {
  createCollection,
  updateCollection,
  deleteCollection,
  unfollowCollection,
  cloneCollection,
} from '@/app/actions/collections'
import { SUPPORTED_LANGUAGES } from '@/types'
import { CollectionForm } from './collection-form'

type OwnCollection = {
  id: string
  name: string
  description: string | null
  source_lang: string
  target_lang: string
  is_public: boolean
  is_default: boolean
  collection_words: { count: number }[]
  collection_follows: { count: number }[]
}

type FollowedCollection = {
  id: string
  name: string
  description: string | null
  source_lang: string
  target_lang: string
  is_public: boolean
  is_default: boolean
  users: { username: string } | null
  collection_words: { count: number }[]
}

interface CollectionsListProps {
  ownCollections: OwnCollection[]
  followedCollections: FollowedCollection[]
  defaultSourceLang: string
  defaultTargetLang: string
}

export function CollectionsList({
  ownCollections,
  followedCollections,
  defaultSourceLang,
  defaultTargetLang,
}: CollectionsListProps) {
  const t = useTranslations('collections')
  const tCatalog = useTranslations('catalog')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingCollection, setEditingCollection] = useState<OwnCollection | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleDelete = (id: string, name: string) => {
    if (!confirm(t('delete_confirm', { name }))) return
    startTransition(async () => {
      const result = await deleteCollection(id)
      if (result?.error) alert(result.error)
    })
  }

  const handleUnfollow = (id: string) => {
    startTransition(async () => {
      await unfollowCollection(id)
    })
  }

  const handleClone = (id: string) => {
    startTransition(async () => {
      const result = await cloneCollection(id)
      if (result?.error) alert(result.error)
    })
  }

  return (
    <div className="space-y-6">
      {/* Own collections */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            {t('my_collections')}
          </h2>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('new_collection')}
          </button>
        </div>

        {showCreateForm && (
          <CollectionForm
            defaultSourceLang={defaultSourceLang}
            defaultTargetLang={defaultTargetLang}
            onSubmit={async (formData) => {
              const result = await createCollection(formData)
              if (!result?.error) setShowCreateForm(false)
              return result
            }}
            onCancel={() => setShowCreateForm(false)}
          />
        )}

        {editingCollection && (
          <CollectionForm
            collection={editingCollection}
            defaultSourceLang={editingCollection.source_lang}
            defaultTargetLang={editingCollection.target_lang}
            onSubmit={async (formData) => {
              const result = await updateCollection(editingCollection.id, formData)
              if (!result?.error) setEditingCollection(null)
              return result
            }}
            onCancel={() => setEditingCollection(null)}
          />
        )}

        {ownCollections.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4">{t('empty_state')}</p>
        ) : (
          <div className="space-y-2">
            {ownCollections.map((col) => {
              const wordCount = col.collection_words?.[0]?.count ?? 0
              const followerCount = col.collection_follows?.[0]?.count ?? 0
              return (
                <div key={col.id} className="flex items-center gap-3 p-4 border border-border rounded-xl bg-card">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/collections/${col.id}`} className="font-medium hover:underline">{col.name}</Link>
                      {col.is_default && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {t('default_badge')}
                        </span>
                      )}
                      {col.is_public ? (
                        <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5">
                      {t('words_count', { count: wordCount })} ·{' '}
                      {SUPPORTED_LANGUAGES[col.source_lang as keyof typeof SUPPORTED_LANGUAGES] ?? col.source_lang} → {SUPPORTED_LANGUAGES[col.target_lang as keyof typeof SUPPORTED_LANGUAGES] ?? col.target_lang}
                      {col.is_public && ` · ${t('followers_count', { count: followerCount })}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingCollection(col)}
                      className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {!col.is_default && (
                      <button
                        onClick={() => handleDelete(col.id, col.name)}
                        disabled={isPending}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Followed collections */}
      {followedCollections.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            {t('subscriptions')}
          </h2>
          <div className="space-y-2">
            {followedCollections.map((col) => {
              const wordCount = col.collection_words?.[0]?.count ?? 0
              return (
                <div key={col.id} className="flex items-center gap-3 p-4 border border-border rounded-xl bg-card">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/collections/${col.id}`} className="font-medium hover:underline">{col.name}</Link>
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        {t('followed_badge')}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5">
                      {t('words_count', { count: wordCount })} ·{' '}
                      {col.users?.username && tCatalog('by_author', { username: col.users.username })}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleClone(col.id)}
                      disabled={isPending}
                      className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
                      title={t('clone_btn')}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleUnfollow(col.id)}
                      disabled={isPending}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                      title={t('unfollow_btn')}
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
