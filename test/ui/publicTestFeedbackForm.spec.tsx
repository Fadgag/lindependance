import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import PublicTestFeedbackForm from '@/components/test-feedback/PublicTestFeedbackForm'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

describe('PublicTestFeedbackForm', () => {
  it('shows the real organization name and slug and provides direct scenario links', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        name: 'Recette bêta',
        scenarioGroups: ['ONLINE_BOOKING'],
        status: 'ACTIVE',
        organizationName: 'Osez le T’re',
        organizationSlug: 'osez-le-tre',
        organizationPortalEnabled: true,
        profiles: ['USER'],
        scenarios: [],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        name: 'Recette bêta',
        scenarioGroups: ['ONLINE_BOOKING'],
        status: 'ACTIVE',
        organizationName: 'Osez le T’re',
        organizationSlug: 'osez-le-tre',
        organizationPortalEnabled: true,
        profiles: ['USER'],
        scenarios: [{
          id: 'CUS-01',
          profile: 'USER',
          title: 'Ouvrir la réservation du bon salon',
          priority: 'P0',
          steps: 'Ouvrir le lien de réservation du salon.',
          expected: 'La réservation s’ouvre pour le salon souhaité.',
        }],
      }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    render(<PublicTestFeedbackForm campaignToken="public-token" />)
    expect(await screen.findByText('Osez le T’re')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: /Client du salon/ }))

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Ouvrir le portail de réservation' })).toHaveAttribute(
        'href',
        '/portail/osez-le-tre/reserver',
      )
    })
    expect(screen.queryByText(/slug/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/ORG-A|CUS-\d+|P0/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ouvrir le portail de réservation' }))
      .toHaveAttribute('target', '_blank')
    expect(screen.getByRole('checkbox', { name: /Ouvrir la réservation du bon salon/ })).toBeInTheDocument()
    expect(screen.queryByText('CUS-01')).not.toBeInTheDocument()
    expect(screen.queryByText('P0')).not.toBeInTheDocument()
  })

  it('keeps checked scenarios in the checklist until explicit submission and marks sent results', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        name: 'Recette bêta',
        scenarioGroups: ['ONLINE_BOOKING'],
        status: 'ACTIVE',
        organizationName: 'Osez le T’re',
        organizationSlug: 'osez-le-tre',
        organizationPortalEnabled: true,
        profiles: ['USER'],
        scenarios: [],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        name: 'Recette bêta',
        scenarioGroups: ['ONLINE_BOOKING'],
        status: 'ACTIVE',
        organizationName: 'Osez le T’re',
        organizationSlug: 'osez-le-tre',
        organizationPortalEnabled: true,
        profiles: ['USER'],
        scenarios: [
          {
            id: 'CUS-01',
            profile: 'USER',
            title: 'Résolution de l’organisation',
            priority: 'P0',
            steps: 'Ouvrir la réservation.',
            expected: 'La réservation s’ouvre.',
          },
          {
            id: 'CUS-02',
            profile: 'USER',
            title: 'Choix de prestation',
            priority: 'P0',
            steps: 'Choisir une prestation.',
            expected: 'Les créneaux s’affichent.',
          },
        ],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ created: 1 }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ created: 1 }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    render(<PublicTestFeedbackForm campaignToken="public-token" />)
    fireEvent.click(await screen.findByRole('radio', { name: /Client du salon/ }))
    const checkboxes = await screen.findAllByRole('checkbox')
    fireEvent.click(checkboxes[0])

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const submitButton = screen.getByRole('button', { name: 'Envoyer mes réponses' })
    expect(submitButton).toBeInTheDocument()
    expect(submitButton).toHaveClass('bg-studio-text')

    fireEvent.click(screen.getByRole('button', { name: 'Envoyer mes réponses' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))

    expect(checkboxes[0]).toBeChecked()
    expect(screen.getByText('Réponse envoyée')).toBeInTheDocument()
    fireEvent.click(checkboxes[1])
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer mes réponses' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))
    const secondSubmission = JSON.parse(String(fetchMock.mock.calls[3][1]?.body))
    expect(secondSubmission.results).toEqual([{ scenarioId: 'CUS-02', status: 'PASS' }])
    expect(checkboxes[0]).toBeChecked()
    expect(checkboxes[1]).toBeChecked()
  })

  it('restores unfinished scenario results after the tester reopens the campaign page', async () => {
    const campaignResponse = () => new Response(JSON.stringify({
      name: 'Recette bêta',
      scenarioGroups: ['ONLINE_BOOKING'],
      status: 'ACTIVE',
      organizationName: 'Osez le T’re',
      organizationSlug: 'osez-le-tre',
      organizationPortalEnabled: true,
      profiles: ['USER'],
      scenarios: [],
    }), { status: 200 })
    const scenariosResponse = () => new Response(JSON.stringify({
      name: 'Recette bêta',
      scenarioGroups: ['ONLINE_BOOKING'],
      status: 'ACTIVE',
      organizationName: 'Osez le T’re',
      organizationSlug: 'osez-le-tre',
      organizationPortalEnabled: true,
      profiles: ['USER'],
      scenarios: [{
        id: 'CUS-01',
        profile: 'USER',
        title: 'Résolution de l’organisation',
        priority: 'P0',
        steps: 'Ouvrir la réservation.',
        expected: 'La réservation s’ouvre.',
      }],
    }), { status: 200 })
    const fetchMock = vi.fn()
      .mockImplementationOnce(async () => campaignResponse())
      .mockImplementationOnce(async () => scenariosResponse())
      .mockImplementationOnce(async () => campaignResponse())
      .mockImplementationOnce(async () => scenariosResponse())
    vi.stubGlobal('fetch', fetchMock)

    const { unmount } = render(<PublicTestFeedbackForm campaignToken="public-token" />)
    fireEvent.click(await screen.findByRole('radio', { name: /Client du salon/ }))
    fireEvent.click((await screen.findAllByRole('checkbox'))[0])
    fireEvent.change(screen.getByLabelText('Sur quel appareil faites-vous le test ? (facultatif)'), {
      target: { value: 'Safari sur iPhone' },
    })
    fireEvent.change(screen.getByLabelText('Comment cela s’est-il passé ?'), { target: { value: 'FAIL' } })
    fireEvent.change(screen.getByLabelText('Que s’est-il passé ? (obligatoire)'), {
      target: { value: 'Le bouton de réservation ne répond pas.' },
    })
    fireEvent.change(screen.getByLabelText('Les consignes étaient-elles compréhensibles ?'), {
      target: { value: 'MOSTLY_CLEAR' },
    })

    expect(await screen.findByRole('button', { name: 'Envoyer mes réponses' })).toBeEnabled()
    await waitFor(() => {
      const saved = window.localStorage.getItem('test-feedback:draft:public-token:USER')
      expect(saved).not.toBeNull()
      expect(JSON.parse(saved ?? '{}').selected).toHaveProperty('CUS-01')
    })
    unmount()

    render(<PublicTestFeedbackForm campaignToken="public-token" />)
    fireEvent.click(await screen.findByRole('radio', { name: /Client du salon/ }))

    await waitFor(() => expect(screen.getByRole('checkbox')).toBeChecked())
    expect(screen.getByLabelText('Sur quel appareil faites-vous le test ? (facultatif)')).toHaveValue('Safari sur iPhone')
    expect(screen.getByLabelText('Comment cela s’est-il passé ?')).toHaveValue('FAIL')
    expect(screen.getByLabelText('Que s’est-il passé ? (obligatoire)'))
      .toHaveValue('Le bouton de réservation ne répond pas.')
    expect(screen.getByLabelText('Les consignes étaient-elles compréhensibles ?'))
      .toHaveValue('MOSTLY_CLEAR')
    expect(screen.getByRole('button', { name: 'Envoyer mes réponses' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it('submits optional campaign feedback together with at least one checked scenario', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        name: 'Recette bêta',
        scenarioGroups: ['ONLINE_BOOKING'],
        status: 'ACTIVE',
        organizationName: 'Osez le T’re',
        organizationSlug: 'osez-le-tre',
        organizationPortalEnabled: true,
        profiles: ['USER'],
        scenarios: [],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        name: 'Recette bêta',
        scenarioGroups: ['ONLINE_BOOKING'],
        status: 'ACTIVE',
        organizationName: 'Osez le T’re',
        organizationSlug: 'osez-le-tre',
        organizationPortalEnabled: true,
        profiles: ['USER'],
        scenarios: [{
          id: 'CUS-01',
          profile: 'USER',
          title: 'Résolution de l’organisation',
          priority: 'P0',
          steps: 'Ouvrir la réservation.',
          expected: 'La réservation s’ouvre.',
        }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ created: 1 }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    render(<PublicTestFeedbackForm campaignToken="public-token" />)
    fireEvent.click(await screen.findByRole('radio', { name: /Client du salon/ }))
    const scenarioCheckbox = await screen.findByRole('checkbox')
    fireEvent.click(scenarioCheckbox)
    fireEvent.change(screen.getByLabelText('Les consignes étaient-elles compréhensibles ?'), {
      target: { value: 'MOSTLY_CLEAR' },
    })
    fireEvent.change(screen.getByLabelText('Comment avez-vous trouvé la durée de ce test ?'), {
      target: { value: 'ABOUT_RIGHT' },
    })
    fireEvent.change(screen.getByLabelText('Les liens directs vers les pages à tester vous ont-ils aidé ?'), {
      target: { value: 'VERY_USEFUL' },
    })
    fireEvent.change(screen.getByLabelText('Comment évaluez-vous globalement ce test ?'), {
      target: { value: 'SATISFIED' },
    })
    fireEvent.change(screen.getByLabelText('Votre commentaire ou une idée pour améliorer ce test'), {
      target: { value: 'Les liens directs m’ont aidé à suivre les étapes.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer mes réponses' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    const submission = JSON.parse(String(fetchMock.mock.calls[2][1]?.body))
    expect(submission).toMatchObject({
      profile: 'USER',
      results: [{ scenarioId: 'CUS-01', status: 'PASS' }],
      campaignReview: {
        clarity: 'MOSTLY_CLEAR',
        duration: 'ABOUT_RIGHT',
        links: 'VERY_USEFUL',
        satisfaction: 'SATISFIED',
        comment: 'Les liens directs m’ont aidé à suivre les étapes.',
      },
    })
  })
})
