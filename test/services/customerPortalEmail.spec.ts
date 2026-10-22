import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { resendSendMock } = vi.hoisted(() => ({
  resendSendMock: vi.fn(),
}))

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: resendSendMock }
  },
}))

import {
  createAppointmentIcs,
  sendCustomerPortalOtpEmail,
  sendCustomerPortalSavedEmail,
  sendCustomerPortalDisabledEmail,
  sendAppointmentConfirmation,
  sendAppointmentChangeDecisionEmail,
} from '@/services/customerPortalEmail.service'

beforeEach(() => {
  vi.stubEnv('RESEND_API_KEY', 'resend-test-key')
  vi.mocked(resendSendMock).mockResolvedValue({ error: null })
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('createAppointmentIcs', () => {
  it('uses persisted UTC instants, the organization timezone and a stable event id', () => {
    const appointment = {
      id: 'appointment-123',
      startTime: new Date('2026-10-01T08:00:00.000Z'),
      endTime: new Date('2026-10-01T09:00:00.000Z'),
      createdAt: new Date('2026-09-30T12:00:00.000Z'),
      serviceName: 'Coupe; soin, finition',
      organizationName: 'Atelier',
      timezone: 'Europe/Paris',
      portalUrl: 'https://example.test/portail/atelier/reserver',
    }

    const first = createAppointmentIcs(appointment)
    const second = createAppointmentIcs(appointment)

    expect(first).toBe(second)
    expect(first).toContain('UID:appointment-123@customer-portal')
    expect(first).toContain('DTSTART:20261001T080000Z')
    expect(first).toContain('DTEND:20261001T090000Z')
    expect(first).toContain('X-WR-TIMEZONE:Europe/Paris')
    expect(first).toContain('SUMMARY:Coupe\\; soin\\, finition')
    expect(first).not.toContain('customerId')
  })

  describe('sendCustomerPortalOtpEmail', () => {
    it('uses the organization template and escapes rendered plain text as HTML', async () => {
      await sendCustomerPortalOtpEmail({
        to: 'client@example.test',
        code: '123456',
        organizationName: '<Atelier>',
        template: 'Bienvenue chez {{organizationName}}\nVotre code : {{code}}',
      })

      expect(resendSendMock).toHaveBeenCalledWith(expect.objectContaining({
        to: 'client@example.test',
        html: expect.stringContaining('Bienvenue chez &lt;Atelier&gt;<br>Votre code : 123456'),
      }))
      expect(resendSendMock).toHaveBeenCalledWith(expect.objectContaining({
        html: expect.not.stringContaining('<Atelier>'),
      }))
    })
  })

  describe('sendCustomerPortalSavedEmail', () => {
    it('sends the saved-address notice with an escaped reservation link', async () => {
      await sendCustomerPortalSavedEmail({
        to: 'client@example.test',
        organizationName: '<Atelier>',
        portalUrl: 'https://example.test/portail/atelier/reserver?next=booking&source=staff',
      })

      const sentEmail = vi.mocked(resendSendMock).mock.lastCall?.[0]
      expect(sentEmail).toMatchObject({
        to: 'client@example.test',
        subject: 'Votre adresse e-mail pour réserver chez <Atelier>',
      })
      expect(sentEmail.html).toContain('Cette adresse e-mail est bien enregistrée dans votre fiche client chez &lt;Atelier&gt;.')
      expect(sentEmail.html).toContain('Pour prendre vos rendez-vous en ligne, utilisez cette adresse e-mail.')
      expect(sentEmail.html).toContain('Merci de confirmer au personnel du salon que vous avez bien reçu ce message.')
      expect(sentEmail.html).toContain('href="https://example.test/portail/atelier/reserver?next=booking&amp;source=staff"')
      expect(sentEmail.html).toContain('Réserver en ligne')
      expect(sentEmail.html).not.toContain('<Atelier>')
    })
  })

  describe('sendAppointmentConfirmation', () => {
    it('renders the custom plain-text message safely and keeps the calendar attachment', async () => {
      await sendAppointmentConfirmation({
        to: 'client@example.test',
        template: 'Rendez-vous {{serviceName}} le {{date}} à {{startTime}}-{{endTime}}. {{portalUrl}}',
        appointment: {
          id: 'appointment-123',
          startTime: new Date('2026-10-01T08:00:00.000Z'),
          endTime: new Date('2026-10-01T09:00:00.000Z'),
          createdAt: new Date('2026-09-30T12:00:00.000Z'),
          serviceName: '<Coupe>',
          organizationName: 'Atelier',
          timezone: 'Europe/Paris',
          portalUrl: 'https://example.test/portail/atelier',
        },
      })

      expect(resendSendMock).toHaveBeenCalledWith(expect.objectContaining({
        to: 'client@example.test',
        html: expect.stringContaining('Rendez-vous &lt;Coupe&gt; le jeudi 1 octobre 2026 à 10:00-11:00'),
        attachments: [expect.objectContaining({ filename: 'rendez-vous.ics' })],
      }))
      expect(resendSendMock).toHaveBeenCalledWith(expect.objectContaining({
        html: expect.not.stringContaining('<Coupe>'),
      }))
    })
  })

  describe('sendAppointmentChangeDecisionEmail', () => {
    const appointment = {
      id: 'appointment-123',
      startTime: new Date('2026-10-01T08:00:00.000Z'),
      endTime: new Date('2026-10-01T09:00:00.000Z'),
      createdAt: new Date('2026-09-30T12:00:00.000Z'),
      lastModified: new Date('2026-10-01T07:00:00.000Z'),
      sequence: 4,
      serviceName: 'Coupe',
      organizationName: 'Atelier',
      timezone: 'Europe/Paris',
      portalUrl: 'https://example.test/portail/atelier/mes-rdv',
    }

    it('sends an accepted schedule with an updated calendar invitation', async () => {
      await sendAppointmentChangeDecisionEmail({
        to: 'verified@example.test',
        decision: 'APPROVED',
        reviewReason: null,
        appointment,
      })

      const sentEmail = vi.mocked(resendSendMock).mock.lastCall?.[0]
      expect(sentEmail).toMatchObject({
        to: 'verified@example.test',
        subject: 'Votre rendez-vous a été modifié chez Atelier',
        attachments: [expect.objectContaining({ filename: 'rendez-vous-modifie.ics' })],
      })
      expect(sentEmail.html).toContain('Votre demande de changement a été acceptée.')
      expect(sentEmail.html).toContain('jeudi 1 octobre 2026')
      expect(sentEmail.html).toContain('10:00')
      expect(sentEmail.html).toContain('href="https://example.test/portail/atelier/mes-rdv"')
      const calendar = sentEmail.attachments[0].content.toString()
      expect(calendar).toContain('UID:appointment-123@customer-portal')
      expect(calendar).toContain('SEQUENCE:4')
      expect(calendar).toContain('DTSTART:20261001T080000Z')
      expect(calendar).toContain('DTSTAMP:20261001T070000Z')
    })

    it('sends a rejection and includes the staff reason without a calendar attachment', async () => {
      await sendAppointmentChangeDecisionEmail({
        to: 'verified@example.test',
        decision: 'REJECTED',
        reviewReason: 'Créneau <indisponible>',
        appointment,
      })

      const sentEmail = vi.mocked(resendSendMock).mock.lastCall?.[0]
      expect(sentEmail).toMatchObject({
        to: 'verified@example.test',
        subject: 'Réponse à votre demande de changement chez Atelier',
      })
      expect(sentEmail.html).toContain('Votre demande de changement a été refusée.')
      expect(sentEmail.html).toContain('Créneau &lt;indisponible&gt;')
      expect(sentEmail.html).toContain('rendez-vous reste prévu')
      expect(sentEmail.html).not.toHaveProperty('attachments')
    })

    it('sends a neutral rejection email when no reason was provided', async () => {
      await sendAppointmentChangeDecisionEmail({
        to: 'verified@example.test',
        decision: 'REJECTED',
        reviewReason: null,
        appointment,
      })

      const sentEmail = vi.mocked(resendSendMock).mock.lastCall?.[0]
      expect(sentEmail.html).toContain('Votre demande de changement a été refusée.')
      expect(sentEmail.html).not.toContain('Motif du salon')
      expect(sentEmail.html).toContain('rendez-vous reste prévu')
    })
  })

  describe('sendCustomerPortalDisabledEmail', () => {
    it('sends a notification to the requested organization administrator', async () => {
      await sendCustomerPortalDisabledEmail({
        to: 'admin@atelier.fr',
        organizationName: 'Atelier',
      })

      expect(resendSendMock).toHaveBeenCalledWith(expect.objectContaining({
        to: 'admin@atelier.fr',
        subject: 'Portail client désactivé pour Atelier',
        html: expect.stringContaining('Aucun praticien actif'),
      }))
    })
  })
})
