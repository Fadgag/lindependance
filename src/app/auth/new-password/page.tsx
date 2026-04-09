import NewPasswordClient from './NewPasswordClient'

export default function NewPasswordPage({ searchParams }: { searchParams?: { token?: string } }) {
  const token = (searchParams && searchParams.token) || ''
  return <NewPasswordClient token={token} />
}



