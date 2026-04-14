export function formatForDateTimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const year = d.getFullYear()
  const month = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const hours = pad(d.getHours())
  const minutes = pad(d.getMinutes())
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export function getDefaultStart(): string {
  const now = new Date()
  const slotMs = 30 * 60 * 1000
  const rounded = new Date(Math.ceil(now.getTime() / slotMs) * slotMs)

  const min = new Date(rounded)
  min.setHours(8, 0, 0, 0)
  const max = new Date(rounded)
  max.setHours(18, 0, 0, 0)

  if (rounded.getTime() < min.getTime()) return formatForDateTimeLocal(min)
  if (rounded.getTime() > max.getTime()) {
    const nextDay = new Date(rounded)
    nextDay.setDate(nextDay.getDate() + 1)
    nextDay.setHours(8, 0, 0, 0)
    return formatForDateTimeLocal(nextDay)
  }
  return formatForDateTimeLocal(rounded)
}

