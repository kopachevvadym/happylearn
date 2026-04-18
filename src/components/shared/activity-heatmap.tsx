'use client'

import { useMemo } from 'react'
import { ActivityCalendar } from 'react-activity-calendar'

interface ActivityHeatmapProps {
  activityByDay: Record<string, number>
}

export function ActivityHeatmap({ activityByDay }: ActivityHeatmapProps) {
  const data = useMemo(() => {
    const end = new Date()
    end.setHours(0, 0, 0, 0)

    const start = new Date(end)
    start.setFullYear(end.getFullYear() - 1)
    start.setDate(start.getDate() + 1)

    const toLocalDateKey = (d: Date) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }

    const result: { date: string; count: number; level: number }[] = []
    const cursor = new Date(start)

    while (cursor <= end) {
      const key = toLocalDateKey(cursor)
      const count = activityByDay[key] ?? 0
      const level =
        count === 0 ? 0 : count < 5 ? 1 : count < 15 ? 2 : count < 30 ? 3 : 4
      result.push({ date: key, count, level })
      cursor.setDate(cursor.getDate() + 1)
    }

    return result
  }, [activityByDay])

  return (
    <ActivityCalendar
      data={data}
      weekStart={1}
      showWeekdayLabels
      hideTotalCount
      labels={{
        weekdays: ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
      }}
      theme={{
        light: ['#e5e7eb', '#bbf7d0', '#4ade80', '#16a34a', '#14532d'],
        dark: ['#374151', '#14532d', '#15803d', '#22c55e', '#86efac'],
      }}
      tooltips={{
        activity: {
          text: (activity) =>
            activity.count === 0
              ? `0 слів — ${activity.date}`
              : `${activity.count} ${activity.count === 1 ? 'слово' : activity.count < 5 ? 'слова' : 'слів'} — ${activity.date}`,
        },
      }}
    />
  )
}
