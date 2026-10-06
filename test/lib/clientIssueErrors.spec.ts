import { describe, expect, it } from 'vitest'
import { createClientIssueErrorBuffer } from '@/lib/clientIssueErrors'

describe('client issue error buffer', () => {
  it('keeps only the five most recent bounded errors in memory', () => {
    const buffer = createClientIssueErrorBuffer()
    for (let index = 0; index < 7; index += 1) {
      buffer.record({ name: `Error ${index}`, message: `Failure ${index}` })
    }
    buffer.record({ name: 'x'.repeat(120), message: 'x'.repeat(2_500) })

    expect(buffer.read()).toHaveLength(5)
    expect(buffer.read()[0]).toEqual({ name: 'Error 3', message: 'Failure 3' })
    expect(buffer.read()[4]?.name).toHaveLength(100)
    expect(buffer.read()[4]?.message).toHaveLength(2_000)
  })

  it('does not retain empty error messages', () => {
    const buffer = createClientIssueErrorBuffer()
    buffer.record({ name: 'Error', message: '   ' })

    expect(buffer.read()).toEqual([])
  })
})
