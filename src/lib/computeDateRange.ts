export type RangeKey = 'today' | 'week' | 'month' | '30days'

export function computeDateRange(period: RangeKey | string = '30days') {
  const now = new Date()
  const start = new Date(now)
  const end = new Date(now)

  if (period === 'today') {
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
  } else if (period === 'week') {
    // week starting Monday
    const day = start.getDay() || 7 // Sunday -> 7
    const diff = day - 1
    start.setDate(start.getDate() - diff)
    start.setHours(0, 0, 0, 0)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)
  } else if (period === 'month') {
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
    end.setMonth(start.getMonth() + 1)
    end.setDate(0)
    end.setHours(23, 59, 59, 999)
  } else if (period === '30days') {
    start.setDate(start.getDate() - 30)
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
  } else {
    // fallback last 30 days
    start.setDate(start.getDate() - 30)
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
  }

  return { start: start.toISOString(), end: end.toISOString() }
}

