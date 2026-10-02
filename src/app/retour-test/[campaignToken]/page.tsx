import PublicTestFeedbackForm from '@/components/test-feedback/PublicTestFeedbackForm'

export default async function PublicTestFeedbackPage({
  params,
}: {
  params: Promise<{ campaignToken: string }>
}) {
  const { campaignToken } = await params
  return <PublicTestFeedbackForm campaignToken={campaignToken} />
}
