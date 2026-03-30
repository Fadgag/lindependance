import { getServerSession } from 'next-auth/next'
import authOptions from '@/lib/nextAuthOptions'
import { redirect } from 'next/navigation'

export default async function StatsPage() {
  const session = await getServerSession(authOptions as any)
  if (!session) return redirect('/auth/signin')
  // session.user.role is available thanks to callbacks
  if ((session as any).user?.role !== 'ADMIN') {
    return (
      <div className="p-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Accès restreint</h1>
        <p>Contactez votre gérante pour demander l'accès à cette section.</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Statistiques</h1>
      <p>Contenu des statistiques (réservé aux ADMIN)</p>
    </div>
  )
}

