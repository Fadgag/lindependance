"use client"
import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, Plus } from 'lucide-react'
import dynamic from 'next/dynamic'
import {redirect} from "next/navigation";
import {auth} from "@/auth";

const CustomerModal = dynamic(() => import('@/components/customers/CustomerModal'), { ssr: false })

type ClientListItem = { id: string; firstName: string; lastName: string; phone: string; appointments?: { startTime?: string }[] }

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientListItem[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/customers', { signal: controller.signal, credentials: 'include' })
        if (res.ok) setClients(await res.json())
        } catch (err) {
            const maybe = err as { name?: unknown }
            if (maybe.name === 'AbortError') return
            import('../../lib/clientLogger').then(({ clientError }) => clientError('Erreur chargement clients', err))
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [])

  // no global CustomEvent usage: rely on router.refresh() and server revalidation

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(c => (`${c.firstName} ${c.lastName}`.toLowerCase().includes(q) || (c.phone || '').includes(q)))
  }, [clients, query])

  return (
    <div className="flex-1 p-8 space-y-6 overflow-y-auto" style={{ backgroundColor: '#FAF9F6' }}>
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-studio-text">Clients</h1>
          <p className="text-sm text-studio-muted">G&eacute;rez les fiches clients et l&apos;historique.</p>
        </div>
        <div className="w-80">
          <label className="relative block">
            <span className="absolute inset-y-0 left-3 flex items-center text-studio-muted"><Search size={16} /></span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10 pr-3 py-3 w-full rounded-3xl border border-studio-border bg-white" placeholder="Rechercher par nom ou téléphone" />
          </label>
        </div>
        <div className="ml-4">
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-3xl bg-studio-primary text-white">
            <Plus size={14} /> Nouveau Client
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 p-6 bg-white rounded-4xl">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-3 p-6 bg-white rounded-4xl">Aucun client trouvé.</div>
        ) : filtered.map(c => (
          <Link key={c.id} href={`/customers/${c.id}`} className="block p-4 bg-white rounded-4xl shadow-sm hover:shadow-md border border-studio-border no-underline text-studio-text">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-serif text-lg font-bold">{c.firstName} {c.lastName}</h3>
                <p className="text-sm text-studio-muted">{c.phone}</p>
              </div>
              <div className="text-sm text-studio-muted">Dernier RDV: --</div>
            </div>
          </Link>
        ))}
      </div>
        {/* Modal chargé côté client */}
        {modalOpen && (
          // import dynamique pour éviter problèmes SSR
          <React.Suspense>
              <CustomerModal isOpen={modalOpen} onCloseAction={() => setModalOpen(false)} />
          </React.Suspense>
        )}
    </div>
  )
}


