export const logger = {
  info: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'test') console.info(...args)
  },
  warn: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'test') console.warn(...args)
  },
  error: (...args: unknown[]) => {
    // Always log errors; teams can replace this implementation with a proper logger (Sentry, Winston...) later
    console.error(...args)
  },
  debug: (...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') console.debug(...args)
  }
}

