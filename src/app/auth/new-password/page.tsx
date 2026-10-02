import NewPasswordClient from './NewPasswordClient'

export default async function NewPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>
}) {
  const tokenValue = (await searchParams).token
  const token = Array.isArray(tokenValue) ? tokenValue[0] ?? '' : tokenValue ?? ''
  return <NewPasswordClient token={token} />
}


