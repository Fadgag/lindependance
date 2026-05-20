// Small helper to race a promise against a timeout.
// Extracted from handlers to avoid duplication and ensure consistent typing.
export async function withTimeout<T>(p: Promise<T>, ms?: number): Promise<T> {
  const timeoutMs = typeof ms === 'number' ? ms : Number(process.env.DB_OPERATION_TIMEOUT_MS || 5000)
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('DB_TIMEOUT')), timeoutMs) })
  try {
    return await Promise.race([p, timeout]) as T
  } finally {
    if (timer) clearTimeout(timer)
  }
}

