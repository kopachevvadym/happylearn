'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Search, Globe, Users } from 'lucide-react'
import { followCollection, unfollowCollection } from '@/app/actions/collections'
import { SUPPORTED_LANGUAGES } from '@/types'

type CatalogCollection = {
  id: string
  name: string
  description: string | null
  source_lang: string
  target_lang: string
  created_at: string
  user_id: string
  users: { username: string; avatar_url: string | null } | null
  collection_words: { count: number }[]
  collection_follows: { count: number }[]
}

interface CatalogClientProps {
  collections: CatalogCollection[]
  followedIds: Set<string>
  isLoggedIn: boolean
  currentUserId: string | null
}

export function CatalogClient({ collections, followedIds: initialFollowed, isLoggedIn, currentUserId }: CatalogClientProps) {
  const t = useTranslations('catalog')
  const [search, setSearch] = useState('')
  const [langFilter, setLangFilter] = useState('')
  const [sortBy, setSortBy] = useState<'new' | 'popular'>('new')
  const [followed, setFollowed] = useState(initialFollowed)
  const [isPending, startTransition] = useTransition()

  const filtered = collections
    .filter((c) => {
      const matchSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.users?.username.toLowerCase().includes(search.toLowerCase())
      const matchLang = !langFilter || c.source_lang === langFilter || c.target_lang === langFilter
      return matchSearch && matchLang
    })
    .sort((a, b) => {
      if (sortBy === 'popular') {
        const aFollowers = a.collection_follows?.[0]?.count ?? 0
        const bFollowers = b.collection_follows?.[0]?.count ?? 0
        return bFollowers - aFollowers
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const handleFollowToggle = (id: string) => {
    if (!isLoggedIn) {
      window.location.href = '/auth'
      return
    }
    const isFollowed = followed.has(id)
    setFollowed((prev) => {
      const next = new Set(prev)
      if (isFollowed) next.delete(id)
      else next.add(id)
      return next
    })
    startTransition(async () => {
      if (isFollowed) await unfollowCollection(id)
      else await followCollection(id)
    })
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search_placeholder')}
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={langFilter}
          onChange={(e) => setLangFilter(e.target.value)}
          className="h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Всі мови</option>
          {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
            <option key={code} value={code}>{name}</option>
          ))}
        </select>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setSortBy('new')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${sortBy === 'new' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
          >
            {t('sort_new')}
          </button>
          <button
            onClick={() => setSortBy('popular')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${sortBy === 'popular' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
          >
            {t('sort_popular')}
          </button>
        </div>
      </div>

      {/* Collections grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((col) => {
          const wordCount = col.collection_words?.[0]?.count ?? 0
          const followerCount = col.collection_follows?.[0]?.count ?? 0
          const isFollowed = followed.has(col.id)

          return (
            <div key={col.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div>
                <a href={`/catalog/${col.id}`} className="font-semibold hover:underline">
                  {col.name}
                </a>
                {col.description && (
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{col.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" />
                  {SUPPORTED_LANGUAGES[col.source_lang as keyof typeof SUPPORTED_LANGUAGES] ?? col.source_lang} → {SUPPORTED_LANGUAGES[col.target_lang as keyof typeof SUPPORTED_LANGUAGES] ?? col.target_lang}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span>{wordCount} слів</span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {followerCount}
                  </span>
                </div>
                {col.users?.username && (
                  <a
                    href={`/profile/${col.users.username}`}
                    className="text-xs hover:underline text-muted-foreground"
                  >
                    @{col.users.username}
                  </a>
                )}
              </div>
              {currentUserId !== col.user_id && (
                <button
                  onClick={() => handleFollowToggle(col.id)}
                  disabled={isPending}
                  className={`w-full h-9 rounded-lg text-sm font-medium transition-colors ${
                    isFollowed
                      ? 'border-2 border-border hover:bg-accent'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  } disabled:opacity-60`}
                >
                  {isFollowed ? 'Відписатись' : isLoggedIn ? 'Підписатись' : t('login_to_follow')}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          Нічого не знайдено
        </div>
      )}
    </div>
  )
}
