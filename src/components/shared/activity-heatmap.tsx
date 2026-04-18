'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'

interface ActivityHeatmapProps {
  activityByDay: Record<string, number>
  weekdays: string[] // [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
}

interface Tooltip {
  text: string
  x: number
  y: number
}

function toLocalKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getLevel(count: number) {
  if (count === 0) return 0
  if (count < 5) return 1
  if (count < 15) return 2
  if (count < 30) return 3
  return 4
}

const LEVEL_CLASS: Record<number, string> = {
  0: 'bg-muted',
  1: 'bg-green-200 dark:bg-green-900',
  2: 'bg-green-400 dark:bg-green-700',
  3: 'bg-green-600 dark:bg-green-500',
  4: 'bg-green-800 dark:bg-green-300',
}

// Show label only on even rows (Mon=0, Wed=2, Fri=4, Sun=6)
const SHOW_LABEL = [true, false, true, false, true, false, true]

export function ActivityHeatmap({ activityByDay, weekdays }: ActivityHeatmapProps) {
  const { locale } = useParams<{ locale: string }>()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)

  const todayKey = toLocalKey(new Date())

  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Monday of current week
    const dow = today.getDay() // 0=Sun
    const daysSinceMon = (dow + 6) % 7
    const currentMonday = new Date(today)
    currentMonday.setDate(today.getDate() - daysSinceMon)

    // Start 52 weeks before current Monday
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

      // Month label: use the Monday of this week (first cell)
      const firstDay = week.find(Boolean)
      if (firstDay) {
        const month = new Date(firstDay.date).getMonth()
        if (month !== prevMonth) {
          monthLabels.push({
            weekIndex: weeks.length,
            label: fmt.format(new Date(firstDay.date)),
          })
          prevMonth = month
        }
      }

      weeks.push(week)
    }

    return { weeks, monthLabels }
  }, [activityByDay, locale])

  // Scroll to end on mount and when weeks change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
    }
  }, [weeks])

  // Build a map of weekIndex → month label, skip if next label is too close
  const monthLabelMap = useMemo(() => {
    const map = new Map<number, string>()
    for (let i = 0; i < monthLabels.length; i++) {
      const curr = monthLabels[i]
      const next = monthLabels[i + 1]
      const span = next ? next.weekIndex - curr.weekIndex : weeks.length - curr.weekIndex
      if (span >= 2) map.set(curr.weekIndex, curr.label)
    }
    return map
  }, [monthLabels, weeks.length])

  const CELL = 12
  const GAP = 2
  const ROW = CELL + GAP

  return (
    <div className="flex gap-1.5 select-none">
      {/* Sticky weekday labels */}
      <div className="flex flex-col shrink-0" style={{ paddingTop: 20, gap: GAP }}>
        {weekdays.map((label, i) => (
          <div
            key={i}
            className="text-muted-foreground text-right"
            style={{ fontSize: 10, height: CELL, lineHeight: `${CELL}px`, minWidth: 20 }}
          >
            {SHOW_LABEL[i] ? label : ''}
          </div>
        ))}
      </div>

      {/* Scrollable heatmap */}
      <div ref={scrollRef} className="overflow-x-auto">
        <div className="flex gap-0.5 min-w-max">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
              {/* Month label row */}
              <div style={{ height: 16, fontSize: 10, lineHeight: '16px' }} className="text-muted-foreground whitespace-nowrap">
                {monthLabelMap.get(wi) ?? ''}
              </div>

              {/* Day cells */}
              {week.map((day, di) =>
                day === null ? (
                  <div key={di} style={{ width: CELL, height: CELL }} />
                ) : (
                  <div
                    key={di}
                    style={{ width: CELL, height: CELL }}
                    className={[
                      'rounded-sm cursor-pointer transition-opacity hover:opacity-80',
                      LEVEL_CLASS[getLevel(day.count)],
                      day.date === todayKey ? 'ring-1 ring-primary ring-offset-1 ring-offset-card' : '',
                    ].join(' ')}
                    onMouseEnter={(e) => {
                      const count = day.count
                      const word =
                        count === 0
                          ? '0 слів'
                          : count === 1
                          ? '1 слово'
                          : count < 5
                          ? `${count} слова`
                          : `${count} слів`
                      setTooltip({
                        text: `${word} — ${day.date}`,
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

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-popover text-popover-foreground border border-border rounded-md shadow-md text-xs px-2 py-1 whitespace-nowrap"
          style={{ left: tooltip.x + 10, top: tooltip.y - 32 }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  )
}
