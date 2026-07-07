'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Check, Inbox, Loader2 } from 'lucide-react'
import { useWordsTimeline, useWordProgress } from '@/lib/queries'
import type { Word } from '@/types'

interface WordsTimelineBoardProps {
  userId: string
}

/** Local calendar-day key ("YYYY-MM-DD") — matches the activity heatmap. */
function dayKeyFromDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Parse a "YYYY-MM-DD" key back into a *local* midnight Date (no UTC drift). */
function dateFromDayKey(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function WordsTimelineBoard({ userId }: WordsTimelineBoardProps) {
  const t = useTranslations('timeline')
  const tWords = useTranslations('words')
  const locale = useLocale()

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useWordsTimeline(userId)
  const { data: progress = [] } = useWordProgress(userId)

  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const didInitScroll = useRef(false)
  // scrollWidth captured right before an "older" fetch, so we can keep the
  // viewport anchored after older columns are prepended on the left.
  const pendingAnchor = useRef<number | null>(null)

  // Local "now", refreshed at midnight (and on tab focus) so the Today/Yesterday
  // labels stay correct if the dashboard is left open across the day boundary.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const timer = setTimeout(() => setNow(new Date()), next.getTime() - now.getTime() + 1000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') setNow(new Date())
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [now])

  // Flatten pages, de-duping by id (guards against page-boundary overlap).
  const words = useMemo(() => {
    const seen = new Set<string>()
    const out: Word[] = []
    for (const page of data?.pages ?? []) {
      for (const w of page) {
        if (!seen.has(w.id)) {
          seen.add(w.id)
          out.push(w)
        }
      }
    }
    return out
  }, [data])

  const learnedIds = useMemo(
    () => new Set(progress.filter((p) => p.is_learned).map((p) => p.word_id)),
    [progress]
  )

  // Group by local day. `words` is newest-first, so Map keys are newest→oldest;
  // reverse to render columns oldest→newest (newest day sits on the right).
  const days = useMemo(() => {
    const map = new Map<string, Word[]>()
    for (const w of words) {
      const key = dayKeyFromDate(new Date(w.created_at))
      const bucket = map.get(key)
      if (bucket) bucket.push(w)
      else map.set(key, [w])
    }
    return [...map.entries()].reverse()
  }, [words])

  const { todayKey, yesterdayKey, weekdayFmt, dayMonthFmt } = useMemo(() => {
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    return {
      todayKey: dayKeyFromDate(now),
      yesterdayKey: dayKeyFromDate(yesterday),
      weekdayFmt: new Intl.DateTimeFormat(locale, { weekday: 'short' }),
      dayMonthFmt: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }),
    }
  }, [locale, now])

  const pageCount = data?.pages.length ?? 0

  // On first content, jump to the far right (newest day).
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el || didInitScroll.current || words.length === 0) return
    el.scrollLeft = el.scrollWidth
    didInitScroll.current = true
  }, [words.length])

  // After a page loads, compensate scrollLeft so the words the user was looking
  // at stay put instead of jumping when older columns are prepended on the left.
  // Keyed on pageCount so it also runs (and clears the anchor) for empty pages.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (pendingAnchor.current == null) return
    if (el) el.scrollLeft += el.scrollWidth - pendingAnchor.current
    pendingAnchor.current = null
  }, [pageCount])

  // Fetch older words when the left sentinel comes into view.
  useEffect(() => {
    const el = scrollRef.current
    const sentinel = sentinelRef.current
    if (!el || !sentinel) return

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          pendingAnchor.current = el.scrollWidth
          fetchNextPage()
        }
      },
      { root: el, rootMargin: '0px 0px 0px 200px' } // arm slightly before the left edge
    )
    io.observe(sentinel)
    return () => io.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const headerPrimary = (key: string, date: Date) => {
    if (key === todayKey) return t('today')
    if (key === yesterdayKey) return t('yesterday')
    return weekdayFmt.format(date)
  }

  return (
    <section className="bg-card border border-border rounded-xl p-4">
      <div className="mb-3">
        <h2 className="font-semibold">{t('title')}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{t('subtitle')}</p>
      </div>

      {isLoading ? (
        <BoardSkeleton />
      ) : words.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
          <Inbox aria-hidden="true" className="w-8 h-8 opacity-60" />
          <span className="text-sm">{t('empty')}</span>
        </div>
      ) : (
        <div className="relative">
          <div
            ref={scrollRef}
            className="flex items-start gap-3 overflow-x-auto overflow-y-hidden pb-2 -mx-1 px-1"
          >
            {/* Leftmost: sentinel (oldest edge) — stretches full height to stay observable */}
            <div ref={sentinelRef} aria-hidden="true" className="shrink-0 w-px self-stretch" />

            {!hasNextPage && (
              <div className="shrink-0 self-center flex flex-col items-center gap-1.5 px-1 text-muted-foreground/70">
                <div className="h-8 w-px bg-border" />
                <span className="text-[10px] uppercase tracking-wider whitespace-nowrap [writing-mode:vertical-rl] rotate-180">
                  {t('start')}
                </span>
                <div className="h-8 w-px bg-border" />
              </div>
            )}

            {days.map(([key, dayWords]) => {
              const date = dateFromDayKey(key)
              const isToday = key === todayKey
              return (
                <div
                  key={key}
                  className={`flex flex-col w-60 shrink-0 rounded-xl border overflow-hidden ${
                    isToday ? 'border-primary/40 bg-primary/5' : 'border-border/60 bg-muted/40'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2 shrink-0 px-3 py-2 border-b border-border/60">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold capitalize truncate">
                        {headerPrimary(key, date)}
                      </div>
                      <div className="text-xs text-muted-foreground">{dayMonthFmt.format(date)}</div>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-muted-foreground bg-background/70 rounded-full px-2 py-0.5">
                      {dayWords.length}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 p-1.5 max-h-56 overflow-y-auto">
                    {dayWords.map((w) => {
                      const learned = learnedIds.has(w.id)
                      return (
                        <div
                          key={w.id}
                          className={`rounded-lg border px-2.5 py-1.5 transition-colors ${
                            learned
                              ? 'border-green-200 bg-green-50/60 dark:border-green-900 dark:bg-green-950/20'
                              : 'border-border bg-card'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-medium leading-snug break-words">
                              {w.word}
                            </span>
                            {learned && (
                              <Check
                                aria-label={tWords('learned_badge')}
                                className="w-3.5 h-3.5 mt-0.5 shrink-0 text-green-600 dark:text-green-400"
                              />
                            )}
                          </div>
                          {(w.translations as string[]).length > 0 && (
                            <div className="text-xs text-muted-foreground mt-0.5 break-words">
                              {(w.translations as string[]).join(', ')}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Loading overlay — sits OUTSIDE the scroller so mounting it never
              changes scrollWidth (which would jolt the anchored viewport). */}
          {isFetchingNextPage && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pr-6 pl-1 bg-gradient-to-r from-card via-card/90 to-transparent text-muted-foreground">
              <Loader2 aria-hidden="true" className="w-5 h-5 animate-spin" />
              <span className="sr-only">{t('loading')}</span>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function BoardSkeleton() {
  return (
    <div className="flex items-start gap-3 overflow-hidden">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col w-60 shrink-0 rounded-xl border border-border/60 bg-muted/40 overflow-hidden"
        >
          <div className="px-3 py-2 border-b border-border/60 space-y-1.5">
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            <div className="h-3 w-12 bg-muted rounded animate-pulse" />
          </div>
          <div className="flex flex-col gap-1.5 p-1.5">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="rounded-lg border border-border bg-card px-2.5 py-1.5 space-y-1.5">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-3 w-32 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
