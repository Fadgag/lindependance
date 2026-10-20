import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createOrReusePasswordResetToken: vi.fn(),
  deletePasswordResetToken: vi.fn(),
  emailSend: vi.fn(),
}))

vi.mock('@/services/auth-rate-limit.service', () => ({
  createOrReusePasswordResetToken: mocks.createOrReusePasswordResetToken,
  deletePasswordResetToken: mocks.deletePasswordResetToken,
}))
vi.mock('resend', () => ({
  Resend: vi.fn(function MockResend() {
    return { emails: { send: mocks.emailSend } }
  }),
}))

import { sendTestStaffActivationEmail } from '@/services/testStaffActivationEmail.service'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('test staff activation email', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('RESEND_API_KEY', 'test-api-key')
    vi.stubEnv('RESEND_FROM', 'recette@example.test')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://preprod.example.test')
    mocks.createOrReusePasswordResetToken.mockImplementation(async (_email: string, token: string) => ({
      token,
      created: true,
    }))
    mocks.emailSend.mockResolvedValue({ data: { id: 'email-1' }, error: null })
  })

  it('sends a one-time setup link without returning the token', async () => {
    const delivery = await sendTestStaffActivationEmail({
      email: 'staff@example.test',
      salonName: 'Salon de test',
    })

    expect(mocks.createOrReusePasswordResetToken).toHaveBeenCalledWith(
      'staff@example.test',
      expect.stringMatching(/^[a-f0-9]{64}$/),
      expect.any(Date),
    )
    const expiresAt = mocks.createOrReusePasswordResetToken.mock.calls[0][2]
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now() + 59 * 60 * 1000)
    expect(expiresAt.getTime()).toBeLessThan(Date.now() + 61 * 60 * 1000)
    expect(mocks.emailSend).toHaveBeenCalledWith(expect.objectContaining({
      from: 'recette@example.test',
      to: 'staff@example.test',
      subject: expect.any(String),
      html: expect.stringContaining('https://preprod.example.test/auth/new-password?token='),
    }))
    expect(mocks.emailSend.mock.calls[0][0].html).toContain('Salon de test')
    expect(delivery).toEqual({ sent: true, error: null })
    expect(JSON.stringify(delivery)).not.toMatch(/[a-f0-9]{64}/)
  })

  it('does not create a setup token or send when delivery configuration is missing', async () => {
    vi.stubEnv('RESEND_API_KEY', '')

    await expect(sendTestStaffActivationEmail({
      email: 'staff@example.test',
      salonName: 'Salon de test',
    })).resolves.toEqual({
      sent: false,
      error: expect.any(String),
    })

    expect(mocks.createOrReusePasswordResetToken).not.toHaveBeenCalled()
    expect(mocks.emailSend).not.toHaveBeenCalled()
  })

  it('deletes the setup token and reports provider errors without leaking details', async () => {
    mocks.emailSend.mockResolvedValueOnce({
      data: null,
      error: { message: 'provider error containing a private token' },
    })

    const delivery = await sendTestStaffActivationEmail({
      email: 'staff@example.test',
      salonName: 'Salon de test',
    })

    expect(delivery).toEqual({ sent: false, error: expect.any(String) })
    expect(delivery.error).not.toContain('private token')
    expect(mocks.deletePasswordResetToken).toHaveBeenCalledWith(
      'staff@example.test',
      expect.any(String),
    )
  })
})
