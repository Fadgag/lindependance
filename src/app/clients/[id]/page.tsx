"use client"
import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

type AppointmentMinimal = { id: string; startTime: string; duration: number; service?: { name?: string; price?: number } }
type ClientDetailDTO = { id: string; firstName: string; lastName: string; phone: string; Note?: string | null; appointments?: AppointmentMinimal[] }

export default function ClientDetail() {
  const params = useParams() as { id?: string }
  const id = params?.id
  const [client, setClient] = useState<ClientDetailDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingNotes, setEditingNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'notes'|'packages'>('notes')
  const [catalog, setCatalog] = useState<any[]>([])
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/customers?id=${encodeURIComponent(id)}`, { signal: controller.signal })
        if (res.ok) {
          const data = await res.json()
          setClient(data)
          setEditingNotes(data.Note || '')
        }
        } catch (err) {
          const maybe = err as { name?: unknown }
          if (maybe.name === 'AbortError') return
          console.error('Erreur chargement client:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [id])

  useEffect(() => {
    // load package catalog
    const controller = new AbortController()
    const load = async () => {
      try {
        const res = await fetch('/api/packages', { signal: controller.signal })
        if (res.ok) setCatalog(await res.json())
      } catch (err) {
        const maybe = err as { name?: unknown }
        if (maybe.name === 'AbortError') return
        console.error('Erreur chargement catalogue forfaits:', err)
      }
    }
    load()
    return () => controller.abort()
  }, [])

  const saveNotes = async () => {
    if (!client) return
    setSaving(true)
    try {
      const res = await fetch('/api/customers', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: client.id, notes: editingNotes }) })
      if (res.ok) setClient(await res.json())
    } catch (err) {
      console.error('Erreur sauvegarde notes:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8">Chargement...</div>
  if (!client) return <div className="p-8">Client non trouvé</div>

  return (
    <div className="flex-1 p-8 space-y-6" style={{ backgroundColor: '#FAF9F6' }}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold text-studio-text">{client.firstName} {client.lastName}</h1>
          <p className="text-sm text-studio-muted">{client.phone}</p>
        </div>
        <div>
          <Link href="/clients" className="text-sm text-studio-primary hover:underline">Retour</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 studio-card p-6 bg-white rounded-4xl">
          <div className="flex gap-2 mb-4">
            <button className={`px-3 py-2 rounded ${activeTab === 'notes' ? 'bg-studio-primary text-white' : ''}`} onClick={() => setActiveTab('notes')}>Notes</button>
            <button className={`px-3 py-2 rounded ${activeTab === 'packages' ? 'bg-studio-primary text-white' : ''}`} onClick={() => setActiveTab('packages')}>Forfaits</button>
          </div>

          {activeTab === 'notes' ? (
            <div>
              <h3 className="font-serif text-lg mb-2">Préférences & Notes permanentes</h3>
              <textarea value={editingNotes} onChange={(e) => setEditingNotes(e.target.value)} className="w-full p-3 border rounded-xl" rows={8} />
              <div className="flex gap-2 mt-3">
                <button disabled={saving} onClick={saveNotes} className="px-4 py-2 bg-studio-primary text-white rounded-xl">{saving ? '...' : 'Sauvegarder'}</button>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="font-serif text-lg mb-2">Catalogue de Forfaits</h3>
              <div className="space-y-3">
                {catalog.map((p: any) => (
                  <div key={p.id} className="p-3 border rounded-md">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-bold">{p.name}</div>
                        <div className="text-sm text-studio-muted">{p.description}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{p.price.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>
                        <div className="text-sm text-studio-muted">{p.packageServices.map((s: any) => `${s.quantity}x ${s.service?.name}`).join(', ')}</div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <input type="radio" name="package" checked={selectedPackageId === p.id} onChange={() => setSelectedPackageId(p.id)} />
                      <button onClick={async () => {
                        if (!p.id) return
                        setSaving(true)
                        try {
                          const res = await fetch(`/api/customers/${encodeURIComponent(client.id)}/packages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ packageId: p.id, totalSessions: p.packageServices.reduce((acc: number, s: any) => acc + s.quantity, 0) }) })
                          if (res.ok) {
                            // refresh client
                            const updated = await fetch(`/api/customers?id=${encodeURIComponent(client.id)}`)
                            if (updated.ok) setClient(await updated.json())
                            alert('Forfait ajouté au client')
                          } else {
                            const payload = await res.json()
                            alert('Erreur achat: ' + (payload?.error || res.status))
                          }
                        } catch (err) { console.error(err); alert('Erreur achat') } finally { setSaving(false) }
                      }} className="ml-auto px-3 py-2 bg-studio-primary text-white rounded-md">Acheter</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 studio-card p-6 bg-white rounded-4xl">
          <h3 className="font-serif text-lg mb-4">Historique des rendez-vous</h3>
          {client.appointments && client.appointments.length > 0 ? (
            client.appointments.map((a: AppointmentMinimal) => (
              <div key={a.id} className="flex items-center justify-between p-3 border-b last:border-b-0">
                <div>
                  <div className="font-bold">{a.service?.name}</div>
                  <div className="text-sm text-studio-muted">{new Date(a.startTime).toLocaleDateString('fr-FR')} - {a.duration} min</div>
                </div>
                <div className="text-sm font-bold">{a.service?.price ? a.service.price.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) : ''}</div>
              </div>
            ))
          ) : (
            <div className="text-studio-muted">Aucun historique</div>
          )}
        </div>
      </div>
    </div>
  )
}




