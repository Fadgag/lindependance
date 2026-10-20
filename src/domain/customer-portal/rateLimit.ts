export interface CustomerPortalOtpRateLimits {
  emailLimit: number
  ipLimit: number
}

export function getCustomerPortalOtpRateLimits(environment: {
  vercelEnvironment: string | undefined
  gitCommitRef: string | undefined
}): CustomerPortalOtpRateLimits {
  if (environment.vercelEnvironment === 'preview' && environment.gitCommitRef === 'preprod') {
    return { emailLimit: 10, ipLimit: 30 }
  }
  return { emailLimit: 3, ipLimit: 10 }
}

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
