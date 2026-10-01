import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import AppointmentChangeRequests from '@/components/AppointmentChangeRequests'

export default async function ChangeRequestsPage() {
  const session = await auth()
  if (!session?.user) redirect('/auth/signin')
  if (session.user.accountType !== 'STAFF' || !session.user.organizationId) {
    redirect('/auth/signin')
  }
  return <AppointmentChangeRequests />
}
