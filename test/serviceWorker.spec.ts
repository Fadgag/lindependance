import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { resolve } from 'node:path'
import { expect, it, vi } from 'vitest'

type MockResponse = {
  ok: boolean
  type: string
  bodyUsed: boolean
  clone: () => MockResponse
}

type FetchEventMock = {
  request: { method: string; url: string }
  respondWith: (response: Promise<MockResponse>) => void
  waitUntil: (promise: Promise<unknown>) => void
}

it('clones network responses before returning them to the page', async () => {
  const listeners = new Map<string, (event: FetchEventMock) => void>()
  const cachedResponse: MockResponse = {
    ok: true,
    type: 'basic',
    bodyUsed: false,
    clone: () => cachedResponse,
  }
  const response: MockResponse = {
    ok: true,
    type: 'basic',
    bodyUsed: false,
    clone: vi.fn(() => {
      if (response.bodyUsed) throw new TypeError('Response body is already used')
      return cachedResponse
    }),
  }
  const cachePut = vi.fn()
  const caches = {
    open: vi.fn(async () => ({ put: cachePut })),
    match: vi.fn(),
    keys: vi.fn(async () => []),
    delete: vi.fn(async () => true),
  }
  const workerSelf = {
    addEventListener: (type: string, listener: (event: FetchEventMock) => void) => {
      listeners.set(type, listener)
    },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
  }
  const networkFetch = vi.fn(async () => response)
  const script = readFileSync(resolve(process.cwd(), 'public/sw.js'), 'utf8')

  runInNewContext(script, { self: workerSelf, caches, fetch: networkFetch, URL })

  const fetchHandler = listeners.get('fetch')
  if (!fetchHandler) throw new Error('Service worker fetch handler was not registered')

  let responsePromise: Promise<MockResponse> | undefined
  let cacheLifetime: Promise<void> | undefined
  fetchHandler({
    request: { method: 'GET', url: 'https://example.test/portail/salon/reserver' },
    respondWith: (promise) => {
      responsePromise = promise.then((result) => {
        result.bodyUsed = true
        return result
      })
    },
    waitUntil: (promise) => {
      cacheLifetime = promise.then(() => undefined)
    },
  })

  if (!responsePromise || !cacheLifetime) {
    throw new Error('Service worker did not handle the page request')
  }
  await Promise.all([responsePromise, cacheLifetime])

  expect(response.clone).toHaveBeenCalledOnce()
  expect(cachePut).toHaveBeenCalledOnce()
})
