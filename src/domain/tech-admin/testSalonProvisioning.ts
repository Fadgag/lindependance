export function canProvisionTestSalon(deployment: {
  vercelEnvironment?: string
  gitCommitRef?: string
}): boolean {
  return deployment.vercelEnvironment === 'preview'
    && deployment.gitCommitRef === 'preprod'
}
