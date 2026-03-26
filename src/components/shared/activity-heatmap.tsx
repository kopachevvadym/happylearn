'use client'

import { useMemo } from 'react'

interface ActivityHeatmapProps {
  activityByDay: Record<string, number>
}

export function ActivityHeatmap({ activityByDay }: ActivityHeatmapProps) {
  const weeks = useMemo(() => {
    const today = new Date()
    const days: { date: string; count: number }[] = []

    // Build 52 weeks of days
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      days.push({ date: key, count: activityByDay[key] ?? 0 })
    }

    // Group into weeks
    const result: typeof days[] = []
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7))
    }
    return result
  }, [activityByDay])

  const getColor = (count: number) => {
    if (count === 0) return 'bg-muted'
    if (count < 5) return 'bg-green-200 dark:bg-green-900'
    if (count < 15) return 'bg-green-400 dark:bg-green-700'
    if (count < 30) return 'bg-green-600 dark:bg-green-500'
    return 'bg-green-800 dark:bg-green-300'
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1 min-w-max">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day, di) => (
              <div
                key={di}
                title={`${day.date}: ${day.count} слів`}
                className={`w-3 h-3 rounded-sm ${getColor(day.count)}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
