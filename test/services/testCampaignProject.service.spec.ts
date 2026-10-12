import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { createTestCampaignProjectCard } from '@/services/testCampaignProject.service'

const projectFields = {
  id: 'project-1',
  fields: {
    nodes: [{
      id: 'field-1',
      name: 'Statut de recette',
      options: [
        { id: 'option-launch', name: 'À lancer' },
        { id: 'option-follow', name: 'À suivre' },
        { id: 'option-done', name: 'Validé' },
      ],
    }],
  },
}

beforeEach(() => {
  vi.stubEnv('GITHUB_PROJECT_TOKEN', 'test-token')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('test campaign GitHub Project integration', () => {
  it('creates a privacy-safe issue and adds it to the Project as À lancer', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ data: { user: { projectV2: projectFields } } }))
      .mockResolvedValueOnce(Response.json({
        node_id: 'issue-1',
        html_url: 'https://github.com/Fadgag/lindependance/issues/100',
      }))
      .mockResolvedValueOnce(Response.json({
        data: { addProjectV2ItemById: { item: { id: 'item-1' } } },
      }))
      .mockResolvedValueOnce(Response.json({
        data: { updateProjectV2ItemFieldValue: { projectV2Item: { id: 'item-1' } } },
      }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await createTestCampaignProjectCard({
      campaignId: 'campaign-1',
      dashboardUrl: 'https://app.example.test/test-campaigns/campaign-1',
    })

    expect(result).toEqual({
      status: 'created',
      issueUrl: 'https://github.com/Fadgag/lindependance/issues/100',
    })
    const issueRequest = fetchMock.mock.calls[1]
    const issueBody = z.object({
      title: z.string(),
      body: z.string(),
    }).parse(JSON.parse(String(issueRequest[1]?.body)))
    expect(issueRequest[0]).toBe('https://api.github.com/repos/Fadgag/lindependance/issues')
    expect(issueBody.title).toContain('campaign-1')
    expect(issueBody.body).toContain('https://app.example.test/test-campaigns/campaign-1')
    expect(issueBody.body).toContain('Statut de recette : À lancer')
    expect(issueBody.body).not.toContain('https://retour-test/')

    const addItemRequest = z.object({
      query: z.string(),
      variables: z.object({ projectId: z.string(), contentId: z.string() }),
    }).parse(JSON.parse(String(fetchMock.mock.calls[2][1]?.body)))
    expect(addItemRequest.variables).toEqual({ projectId: 'project-1', contentId: 'issue-1' })

    const updateStatusRequest = z.object({
      variables: z.object({
        projectId: z.string(),
        itemId: z.string(),
        fieldId: z.string(),
        optionId: z.string(),
      }),
    }).parse(JSON.parse(String(fetchMock.mock.calls[3][1]?.body)))
    expect(updateStatusRequest.variables).toEqual({
      projectId: 'project-1',
      itemId: 'item-1',
      fieldId: 'field-1',
      optionId: 'option-launch',
    })
  })

  it('reports that the card could not be generated when the integration token is not configured', async () => {
    vi.stubEnv('GITHUB_PROJECT_TOKEN', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(createTestCampaignProjectCard({
      campaignId: 'campaign-1',
      dashboardUrl: 'https://app.example.test/test-campaigns/campaign-1',
    })).resolves.toEqual({ status: 'not_configured', issueUrl: null })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fails explicitly when the Project does not have the campaign status option', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({
      data: {
        user: {
          projectV2: {
            ...projectFields,
            fields: { nodes: [{ id: 'field-1', name: 'Statut de recette', options: [] }] },
          },
        },
      },
    }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(createTestCampaignProjectCard({
      campaignId: 'campaign-1',
      dashboardUrl: 'https://app.example.test/test-campaigns/campaign-1',
    })).rejects.toThrow('GitHub Project is missing the "À lancer" campaign status option.')
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('keeps the created Issue URL when adding the Project item fails', async () => {
    const issueUrl = 'https://github.com/Fadgag/lindependance/issues/100'
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ data: { user: { projectV2: projectFields } } }))
      .mockResolvedValueOnce(Response.json({ node_id: 'issue-1', html_url: issueUrl }))
      .mockResolvedValueOnce(Response.json({ errors: [{ message: 'Project write denied' }] }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(createTestCampaignProjectCard({
      campaignId: 'campaign-1',
      dashboardUrl: 'https://app.example.test/test-campaigns/campaign-1',
    })).rejects.toMatchObject({ issueUrl })
  })
})
