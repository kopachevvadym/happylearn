'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

interface ActivityHeatmapProps {
  activityByDay: Record<string, number>
  weekdays: string[] // [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
}

interface Tooltip {
  text: string
  x: number
  y: number
}

const CELL = 12
const GAP = 2
const MONTH_H = 16

// Only show label on even rows to avoid crowding
const SHOW_LABEL = [true, false, true, false, true, false, true]

const LEVEL_CLASS: Record<number, string> = {
  0: 'bg-muted',
  1: 'bg-green-200 dark:bg-green-900',
  2: 'bg-green-400 dark:bg-green-700',
  3: 'bg-green-600 dark:bg-green-500',
  4: 'bg-green-800 dark:bg-green-300',
}

function toLocalKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Parse a "YYYY-MM-DD" key as *local* midnight — new Date(key) would parse UTC
 * and shift the day for users west of UTC. */
function fromLocalKey(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function getLevel(count: number) {
  if (count === 0) return 0
  if (count < 5) return 1
  if (count < 15) return 2
  if (count < 30) return 3
  return 4
}

export function ActivityHeatmap({ activityByDay, weekdays }: ActivityHeatmapProps) {
  const { locale } = useParams<{ locale: string }>()
  const t = useTranslations('progress')
  const scrollRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)

  const todayKey = toLocalKey(new Date())
  const tooltipDateFmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }),
    [locale]
  )

  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const dow = today.getDay()
    const daysSinceMon = (dow + 6) % 7
    const currentMonday = new Date(today)
    currentMonday.setDate(today.getDate() - daysSinceMon)

    const start = new Date(currentMonday)
    start.setDate(currentMonday.getDate() - 52 * 7)

    const fmt = new Intl.DateTimeFormat(locale, { month: 'short' })
    const weeks: ({ date: string; count: number } | null)[][] = []
    const monthLabels: { weekIndex: number; label: string }[] = []
    const cursor = new Date(start)
    let prevMonth = -1

    while (cursor <= today) {
      const week: ({ date: string; count: number } | null)[] = []

      for (let d = 0; d < 7; d++) {
        if (cursor > today) {
          week.push(null)
        } else {
          const key = toLocalKey(cursor)
          week.push({ date: key, count: activityByDay[key] ?? 0 })
        }
        cursor.setDate(cursor.getDate() + 1)
      }

      const firstDay = week.find(Boolean)
      if (firstDay) {
        const firstDate = fromLocalKey(firstDay.date)
        const month = firstDate.getMonth()
        if (month !== prevMonth) {
          const next = monthLabels[monthLabels.length - 1]
          const span = next ? weeks.length - next.weekIndex : Infinity
          if (span >= 2) {
            monthLabels.push({ weekIndex: weeks.length, label: fmt.format(firstDate) })
          }
          prevMonth = month
        }
      }

      weeks.push(week)
    }

    return { weeks, monthLabels }
  }, [activityByDay, locale])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
    }
  }, [weeks])

  return (
    <div className="flex gap-1.5 select-none">
      {/* Sticky weekday labels — not inside the scroll container */}
      <div
        className="flex flex-col shrink-0 text-right"
        style={{ paddingTop: MONTH_H + GAP, gap: GAP }}
      >
        {weekdays.map((label, i) => (
          <div
            key={i}
            className="text-muted-foreground"
            style={{ fontSize: 10, height: CELL, lineHeight: `${CELL}px`, minWidth: 18 }}
          >
            {SHOW_LABEL[i] ? label : ''}
          </div>
        ))}
      </div>

      {/* Scrollable heatmap */}
      <div ref={scrollRef} className="overflow-x-auto">
        <div style={{ position: 'relative' }}>
          {/* Month labels: absolutely positioned so they don't affect cell spacing */}
          <div style={{ height: MONTH_H, position: 'relative', marginBottom: GAP }}>
            {monthLabels.map(({ weekIndex, label }) => (
              <span
                key={weekIndex}
                className="absolute text-muted-foreground whitespace-nowrap"
                style={{ left: weekIndex * (CELL + GAP), fontSize: 10, lineHeight: `${MONTH_H}px` }}
              >
                {label}
              </span>
            ))}
          </div>

          {/* Uniform cell grid — pure flex with consistent gap */}
          <div className="flex" style={{ gap: GAP }}>
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
                {week.map((day, di) =>
                  day === null ? (
                    <div key={di} style={{ width: CELL, height: CELL }} />
                  ) : (
                    <div
                      key={di}
                      style={{ width: CELL, height: CELL }}
                      className={[
                        'rounded-sm cursor-pointer transition-opacity hover:opacity-75',
                        LEVEL_CLASS[getLevel(day.count)],
                        day.date === todayKey ? 'ring-1 ring-primary ring-offset-1 ring-offset-card' : '',
                      ].join(' ')}
                      onMouseEnter={(e) => {
                        setTooltip({
                          text: `${t('heatmap_words', { count: day.count })} — ${tooltipDateFmt.format(fromLocalKey(day.date))}`,
                          x: e.clientX,
                          y: e.clientY,
                        })
                      }}
                      onMouseMove={(e) => setTooltip((t) => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-popover text-popover-foreground border border-border rounded-md shadow-md text-xs px-2 py-1 whitespace-nowrap"
          style={{ left: tooltip.x + 10, top: tooltip.y - 36 }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  )
}
