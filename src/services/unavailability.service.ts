import type { Recurrence } from '@/types/models'

/** Generate series of (start, end) pairs based on recurrence rule — up to 6 months ahead */
export function buildOccurrences(
  start: Date,
  end: Date,
  recurrence: Recurrence,
): Array<{ start: Date; end: Date }> {
  if (recurrence === 'NONE') return [{ start, end }]

  const durationMs = end.getTime() - start.getTime()
  const occurrences: Array<{ start: Date; end: Date }> = []
  const maxDate = new Date(start.getFullYear(), start.getMonth() + 6, start.getDate())
  const stepDays = recurrence === 'WEEKLY' ? 7 : recurrence === 'BIWEEKLY' ? 14 : 0 // MONTHLY handled below

  let current = new Date(start)
  while (current <= maxDate) {
    occurrences.push({ start: new Date(current), end: new Date(current.getTime() + durationMs) })
    if (recurrence === 'MONTHLY') {
      current = new Date(
        current.getFullYear(),
        current.getMonth() + 1,
        current.getDate(),
        current.getHours(),
        current.getMinutes(),
      )
    } else {
      current = new Date(current.getTime() + stepDays * 24 * 60 * 60 * 1000)
    }
  }
  return occurrences
}

