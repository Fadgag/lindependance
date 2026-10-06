import { describe, expect, it } from 'vitest'
import {
  buildTestCampaignExport,
  buildTestCampaignExportFilename,
} from '@/domain/test-feedback/campaignExport'

describe('buildTestCampaignExport', () => {
  it('keeps all campaign feedback while excluding tokens and database identifiers', () => {
    const result = buildTestCampaignExport({
      exportedAt: '2026-10-05T09:00:00.000Z',
      data: {
        campaign: {
          id: 'campaign-internal-id',
          name: 'Recette réservation',
          scenarioGroups: ['ONLINE_BOOKING'],
          profiles: ['USER'],
          status: 'ACTIVE',
          publicToken: 'secret-public-token',
          createdAt: '2026-10-04T09:00:00.000Z',
          closedAt: null,
          organizationName: 'Osez le T’re',
        },
        progress: {
          total: 1,
          tested: 1,
          passed: 0,
          failed: 1,
          blocked: 0,
          remaining: 0,
          currentResults: [{ profile: 'USER', scenarioId: 'CUS-01', status: 'FAIL', createdAt: '2026-10-04T09:30:00.000Z' }],
        },
        scenarios: [{
          id: 'CUS-01',
          profile: 'USER',
          title: 'Ouvrir la réservation',
          priority: 'P1',
          steps: 'Ouvrir le lien.',
          expected: 'Le formulaire de réservation apparaît.',
          result: {
            id: 'feedback-internal-id',
            status: 'FAIL',
            comment: 'Le lien affiche une erreur.',
            environment: 'Safari sur iPhone',
            createdAt: '2026-10-04T09:30:00.000Z',
          },
        }],
        history: [{
          id: 'history-internal-id',
          profile: 'USER',
          scenarioId: 'CUS-01',
          scenarioTitle: 'Ouvrir la réservation',
          scenarioPriority: 'P1',
          status: 'FAIL',
          environment: 'Safari sur iPhone',
          comment: 'Le lien affiche une erreur.',
          createdAt: '2026-10-04T09:30:00.000Z',
        }],
        campaignReviews: [{
          id: 'review-internal-id',
          profile: 'USER',
          clarity: 'MOSTLY_CLEAR',
          duration: 'ABOUT_RIGHT',
          links: 'VERY_USEFUL',
          satisfaction: 'SATISFIED',
          comment: 'Les consignes étaient faciles à suivre.',
          createdAt: '2026-10-04T09:35:00.000Z',
        }],
      },
    })

    expect(result).toEqual({
      format: 'lindependance-test-campaign-feedback',
      version: 1,
      exportedAt: '2026-10-05T09:00:00.000Z',
      campaign: {
        name: 'Recette réservation',
        organizationName: 'Osez le T’re',
        scenarioGroups: ['ONLINE_BOOKING'],
        profiles: ['USER'],
        status: 'ACTIVE',
        createdAt: '2026-10-04T09:00:00.000Z',
        closedAt: null,
      },
      progress: {
        total: 1,
        tested: 1,
        passed: 0,
        failed: 1,
        blocked: 0,
        remaining: 0,
      },
      scenarios: [{
        id: 'CUS-01',
        profile: 'USER',
        title: 'Ouvrir la réservation',
        priority: 'P1',
        steps: 'Ouvrir le lien.',
        expected: 'Le formulaire de réservation apparaît.',
        result: {
          status: 'FAIL',
          comment: 'Le lien affiche une erreur.',
          environment: 'Safari sur iPhone',
          createdAt: '2026-10-04T09:30:00.000Z',
        },
      }],
      history: [{
        profile: 'USER',
        scenarioId: 'CUS-01',
        scenarioTitle: 'Ouvrir la réservation',
        scenarioPriority: 'P1',
        status: 'FAIL',
        environment: 'Safari sur iPhone',
        comment: 'Le lien affiche une erreur.',
        createdAt: '2026-10-04T09:30:00.000Z',
      }],
      campaignReviews: [{
        profile: 'USER',
        clarity: 'MOSTLY_CLEAR',
        duration: 'ABOUT_RIGHT',
        links: 'VERY_USEFUL',
        satisfaction: 'SATISFIED',
        comment: 'Les consignes étaient faciles à suivre.',
        createdAt: '2026-10-04T09:35:00.000Z',
      }],
    })
    expect(JSON.stringify(result)).not.toContain('secret-public-token')
    expect(JSON.stringify(result)).not.toContain('internal-id')
  })

  it('creates a safe campaign filename with an ISO calendar date', () => {
    expect(buildTestCampaignExportFilename('Recette réservation !', new Date('2026-10-05T09:00:00.000Z')))
      .toBe('recette-reservation-2026-10-05.json')
    expect(buildTestCampaignExportFilename('***', new Date('2026-10-05T09:00:00.000Z')))
      .toBe('campagne-2026-10-05.json')
  })
})
