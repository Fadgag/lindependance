export function isRateLimitExceeded(
  eventTimes: Date[],
  now: Date,
  windowMilliseconds: number,
  limit: number,
): boolean {
  const threshold = now.getTime() - windowMilliseconds
  const recentEvents = eventTimes.filter((event) => {
    const timestamp = event.getTime()
    return timestamp >= threshold && timestamp <= now.getTime()
  })
  return recentEvents.length >= limit
}
