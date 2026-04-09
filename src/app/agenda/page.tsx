import AppointmentScheduler from '@/components/AppointmentScheduler';
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function AgendaPage() {
    const session = await auth()
    if (!session) return redirect('/auth/signin')
    return (
        <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
            <AppointmentScheduler />
        </div>
    );
}