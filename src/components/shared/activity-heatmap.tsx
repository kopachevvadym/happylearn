'use client'

import { useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'
import CalHeatmap from 'cal-heatmap'
import Tooltip from 'cal-heatmap/plugins/Tooltip'
import CalendarLabel from 'cal-heatmap/plugins/CalendarLabel'
import 'cal-heatmap/cal-heatmap.css'

interface ActivityHeatmapProps {
  activityByDay: Record<string, number>
  weekdays: string[]
}

export function ActivityHeatmap({ activityByDay, weekdays }: ActivityHeatmapProps) {
  const { resolvedTheme } = useTheme()
  const scrollRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const calRef = useRef<CalHeatmap | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    calRef.current?.destroy()

    const isDark = resolvedTheme === 'dark'

    const data = Object.entries(activityByDay).map(([date, value]) => ({
      date: new Date(date).getTime(),
      value,
    }))

    const end = new Date()
    end.setHours(0, 0, 0, 0)
    const start = new Date(end)
    start.setFullYear(end.getFullYear() - 1)
    start.setDate(start.getDate() + 1)

    const cal = new CalHeatmap()
    calRef.current = cal

    cal.paint(
      {
        itemSelector: containerRef.current,
        theme: isDark ? 'dark' : 'light',
        date: {
          start,
          locale: { weekStart: 1 },
        },
        range: 13,
        domain: { type: 'month', gutter: 4 },
        subDomain: { type: 'day', width: 12, height: 12, gutter: 2 },
        data: {
          source: data,
          x: 'date',
          y: 'value',
          defaultValue: 0,
        },
        scale: {
          color: {
            range: isDark
              ? ['#1f2937', '#14532d', '#15803d', '#22c55e', '#86efac']
              : ['#f1f5f9', '#bbf7d0', '#4ade80', '#16a34a', '#14532d'],
            interpolate: 'rgb',
            type: 'threshold',
            domain: [1, 5, 15, 30],
          },
        },
      },
      [
        [
          Tooltip,
          {
            enabled: true,
            text: (_ts: number, value: number | null, d: { format: (f: string) => string }) => {
              const date = d.format('YYYY-MM-DD')
              if (!value) return `0 слів — ${date}`
              const word = value === 1 ? 'слово' : value < 5 ? 'слова' : 'слів'
              return `${value} ${word} — ${date}`
            },
          },
        ],
        [
          CalendarLabel,
          {
            width: 30,
            textAlign: 'start',
            text: () => weekdays,
            padding: [0, 4, 0, 0],
          },
        ],
      ],
    )

    // Scroll to the right so the most recent data is visible
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
      }
    })

    return () => {
      cal.destroy()
      calRef.current = null
    }
  }, [resolvedTheme, activityByDay, weekdays])

  return (
    <div ref={scrollRef} className="overflow-x-auto">
      <div ref={containerRef} className="pl-8" />
    </div>
  )
}
