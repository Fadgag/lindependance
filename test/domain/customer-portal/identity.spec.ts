import { describe, expect, it } from 'vitest'
import { shouldInvalidateCustomerOtp } from '@/domain/customer-portal/identity'

describe('shouldInvalidateCustomerOtp', () => {
  it('invalidates pending codes when the staff changes or removes the contact email', () => {
    expect(shouldInvalidateCustomerOtp('old@example.com', 'new@example.com')).toBe(true)
    expect(shouldInvalidateCustomerOtp('old@example.com', null)).toBe(true)
  })

  it('does not invalidate codes when the field is untouched or normalizes to the same address', () => {
    expect(shouldInvalidateCustomerOtp('old@example.com', undefined)).toBe(false)
    expect(shouldInvalidateCustomerOtp('Old@Example.com', ' old@example.com ')).toBe(false)
  })
})
