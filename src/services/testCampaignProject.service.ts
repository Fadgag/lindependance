import { z } from 'zod'

const owner = 'Fadgag'
const repository = 'lindependance'
const projectNumber = 1
const campaignStatusFieldName = 'Statut de recette'
const initialCampaignStatus = 'À lancer'
const campaignStatuses = ['À lancer', 'À suivre', 'Validé']

const GitHubResponseSchema = z.object({
  data: z.unknown().optional(),
  errors: z.array(z.object({ message: z.string() })).optional(),
})

const ProjectResponseSchema = z.object({
  user: z.object({
    projectV2: z.object({
      id: z.string(),
      fields: z.object({
        nodes: z.array(z.object({
          id: z.string().optional(),
          name: z.string().optional(),
          options: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
        }).passthrough()),
      }),
    }).nullable(),
  }).nullable(),
})

const IssueResponseSchema = z.object({
  node_id: z.string(),
  html_url: z.string().url(),
})

const ProjectItemResponseSchema = z.object({
  addProjectV2ItemById: z.object({
    item: z.object({ id: z.string() }),
  }),
})

const UpdatedProjectItemResponseSchema = z.object({
  updateProjectV2ItemFieldValue: z.object({
    projectV2Item: z.object({ id: z.string() }),
  }),
})

type ProjectCardInput = {
  campaignId: string
  dashboardUrl: string | null
}

type ProjectCardResult =
  | { status: 'created'; issueUrl: string }
  | { status: 'not_configured'; issueUrl: null }

export class TestCampaignProjectCardError extends Error {
  constructor(message: string, readonly issueUrl: string) {
    super(message)
    this.name = 'TestCampaignProjectCardError'
  }
}

async function requestGitHub<T extends z.ZodType>(
  url: string,
  token: string,
  schema: T,
  init?: RequestInit,
): Promise<z.infer<T>> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...init?.headers,
    },
  })
  if (!response.ok) {
    throw new Error(`GitHub API returned HTTP ${response.status}.`)
  }

  const payload: unknown = await response.json()
  if (url.endsWith('/graphql')) {
    const graphResponse = GitHubResponseSchema.parse(payload)
    if (graphResponse.errors?.length) {
      throw new Error(`GitHub GraphQL request failed: ${graphResponse.errors.map(({ message }) => message).join('; ')}`)
    }
    return schema.parse(graphResponse.data)
  }
  return schema.parse(payload)
}

function graphQlRequest(query: string, variables: Record<string, string | number>): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  }
}

export async function createTestCampaignProjectCard(
  input: ProjectCardInput,
): Promise<ProjectCardResult> {
  const token = process.env.GITHUB_PROJECT_TOKEN
  if (!token) return { status: 'not_configured', issueUrl: null }

  const projectResponse = await requestGitHub(
    'https://api.github.com/graphql',
    token,
    ProjectResponseSchema,
    graphQlRequest(
      `
        query($owner: String!, $projectNumber: Int!) {
          user(login: $owner) {
            projectV2(number: $projectNumber) {
              id
              fields(first: 100) {
                nodes {
                  ... on ProjectV2SingleSelectField {
                    id
                    name
                    options { id name }
                  }
                }
              }
            }
          }
        }
      `,
      { owner, projectNumber },
    ),
  )
  const project = projectResponse.user?.projectV2
  if (!project) {
    throw new Error(`Could not access ${owner}'s GitHub Project #${projectNumber}.`)
  }
  const campaignStatusField = project.fields.nodes.find(
    (field) => field.name === campaignStatusFieldName,
  )
  const missingStatus = campaignStatuses.find((status) => (
    !campaignStatusField?.options?.some((option) => option.name === status)
  ))
  const initialStatusOption = campaignStatusField?.options?.find(
    (option) => option.name === initialCampaignStatus,
  )
  if (!campaignStatusField?.id || missingStatus || !initialStatusOption) {
    throw new Error(`GitHub Project is missing the "${missingStatus ?? initialCampaignStatus}" campaign status option.`)
  }

  const issueBody = [
    'Cette carte de recette a été créée automatiquement par l’application.',
    '',
    `Identifiant interne : \`${input.campaignId}\``,
    ...(input.dashboardUrl ? [`Suivi de la campagne : ${input.dashboardUrl}`] : []),
    '',
    `Statut de recette : ${initialCampaignStatus}`,
    'Faire évoluer ce statut dans le GitHub Project : À lancer → À suivre → Validé.',
    '',
    'Les informations du salon, le lien public de test, les invitations et les retours ne sont pas publiés dans cette Issue.',
  ].join('\n')
  const issue = await requestGitHub(
    `https://api.github.com/repos/${owner}/${repository}/issues`,
    token,
    IssueResponseSchema,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Campagne de recette à lancer — ${input.campaignId}`,
        body: issueBody,
      }),
    },
  )

  try {
    const itemResult = await requestGitHub(
      'https://api.github.com/graphql',
      token,
      ProjectItemResponseSchema,
      graphQlRequest(
        `
          mutation($projectId: ID!, $contentId: ID!) {
            addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
              item { id }
            }
          }
        `,
        { projectId: project.id, contentId: issue.node_id },
      ),
    )

    await requestGitHub(
      'https://api.github.com/graphql',
      token,
      UpdatedProjectItemResponseSchema,
      graphQlRequest(
        `
          mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
            updateProjectV2ItemFieldValue(input: {
              projectId: $projectId,
              itemId: $itemId,
              fieldId: $fieldId,
              value: { singleSelectOptionId: $optionId }
            }) {
              projectV2Item { id }
            }
          }
        `,
        {
          projectId: project.id,
          itemId: itemResult.addProjectV2ItemById.item.id,
          fieldId: campaignStatusField.id,
          optionId: initialStatusOption.id,
        },
      ),
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown GitHub Project error.'
    throw new TestCampaignProjectCardError(
      `GitHub created the campaign Issue but could not finish adding it to the Project: ${message}`,
      issue.html_url,
    )
  }

  return { status: 'created', issueUrl: issue.html_url }
}
