'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Search } from 'lucide-react'
import type { Word } from '@/types'
import { SUPPORTED_LANGUAGES } from '@/types'
import { AddWordsBar } from './AddWordsBar'

interface UserCollection {
  id: string
  name: string
  is_default: boolean
}

interface PublicWordsTableProps {
  words: Word[]
  userCollections: UserCollection[] | null
  collectionSourceLang: string
  collectionTargetLang: string
}

export function PublicWordsTable({
  words,
  userCollections,
  collectionSourceLang,
  collectionTargetLang,
}: PublicWordsTableProps) {
  const t = useTranslations('CollectionPage')
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const isLoggedIn = userCollections !== null

  const filtered = words.filter(
    (w) =>
      w.word.toLowerCase().includes(search.toLowerCase()) ||
      (w.translations as string[]).some((tr) => tr.toLowerCase().includes(search.toLowerCase()))
  )

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((w) => selectedIds.has(w.id))

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allFilteredSelected) {
        filtered.forEach((w) => next.delete(w.id))
      } else {
        filtered.forEach((w) => next.add(w.id))
      }
      return next
    })
  }

  const toggleWord = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSuccess = () => setSelectedIds(new Set())

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {search ? t('notFound') : t('noWords')}
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          {/* Header row */}
          <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {isLoggedIn && (
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleSelectAll}
                title={t('selectAll')}
                className="w-4 h-4 rounded accent-primary cursor-pointer flex-shrink-0"
              />
            )}
            <span className="flex-1">{t('word')}</span>
            <span className="flex-1">{t('translation')}</span>
          </div>

          {/* Word rows */}
          <div className="divide-y divide-border">
            {filtered.map((word) => {
              const selected = selectedIds.has(word.id)
              return (
                <div
                  key={word.id}
                  className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                    selected ? 'bg-primary/5' : 'hover:bg-accent/40'
                  } ${isLoggedIn ? 'cursor-pointer' : ''}`}
                  onClick={isLoggedIn ? () => toggleWord(word.id) : undefined}
                >
                  {isLoggedIn && (
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleWord(word.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5 w-4 h-4 rounded accent-primary cursor-pointer flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{word.word}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {SUPPORTED_LANGUAGES[word.source_lang as keyof typeof SUPPORTED_LANGUAGES] ?? word.source_lang}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-muted-foreground">
                      {(word.translations as string[]).join(', ')}
                    </div>
                    {(word.examples as string[]).length > 0 && (
                      <div className="text-xs text-muted-foreground italic mt-0.5 truncate">
                        {(word.examples as string[])[0]}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Login hint for guests */}
      {!isLoggedIn && words.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          {t('loginToSelect')}
        </p>
      )}

      {/* Sticky bar — shown when words are selected */}
      {isLoggedIn && selectedIds.size > 0 && userCollections.length > 0 && (
        <AddWordsBar
          selectedWordIds={[...selectedIds]}
          collections={userCollections}
          onSuccess={handleSuccess}
          collectionSourceLang={collectionSourceLang}
          collectionTargetLang={collectionTargetLang}
        />
      )}
    </div>
  )
}
