'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import { Search, Globe, Users } from 'lucide-react'
import { followCollection, unfollowCollection, fetchPublicCollections } from '@/app/actions/collections'
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
  const tCol = useTranslations('collections')
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [langFilter, setLangFilter] = useState('')
  const [sortBy, setSortBy] = useState<'new' | 'popular'>('new')
  const [followed, setFollowed] = useState(initialFollowed)
  const [isPending, startTransition] = useTransition()

  // The server renders the first page; further pages load on demand
  const [items, setItems] = useState<CatalogCollection[]>(collections)
  const [hasMore, setHasMore] = useState(collections.length >= 100)
  const [isLoadingMore, startLoadMore] = useTransition()

  const loadMore = () => {
    startLoadMore(async () => {
      const next = (await fetchPublicCollections(items.length)) as unknown as CatalogCollection[]
      setItems((prev) => {
        const known = new Set(prev.map((c) => c.id))
        return [...prev, ...next.filter((c) => !known.has(c.id))]
      })
      setHasMore(next.length >= 100)
    })
  }

  const filtered = items
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
      // Locale-aware client navigation instead of a full reload to /auth
      router.push('/auth')
      return
    }
    const isFollowed = followed.has(id)
    const apply = (followedNow: boolean) =>
      setFollowed((prev) => {
        const next = new Set(prev)
        if (followedNow) next.add(id)
        else next.delete(id)
        return next
      })
    apply(!isFollowed) // optimistic
    startTransition(async () => {
      const result = isFollowed ? await unfollowCollection(id) : await followCollection(id)
      if (result?.error) apply(isFollowed) // roll back on failure
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
          <option value="">{t('all_languages')}</option>
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
                <Link href={`/catalog/${col.id}`} className="font-semibold hover:underline">
                  {col.name}
                </Link>
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
                  <span>{tCol('words_count', { count: wordCount })}</span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {followerCount}
                  </span>
                </div>
                {col.users?.username && (
                  <Link
                    href={`/profile/${col.users.username}`}
                    className="text-xs hover:underline text-muted-foreground"
                  >
                    @{col.users.username}
                  </Link>
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
                  {isFollowed ? tCol('unfollow_btn') : isLoggedIn ? tCol('follow_btn') : t('login_to_follow')}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          {t('no_results')}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="h-10 px-6 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors disabled:opacity-60"
          >
            {isLoadingMore ? '…' : t('load_more')}
          </button>
        </div>
      )}
    </div>
  )
}
