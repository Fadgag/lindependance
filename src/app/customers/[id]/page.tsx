"use client"
import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Calendar, Receipt, CreditCard } from 'lucide-react'
import CheckoutModal from '@/components/dashboard/CheckoutModal'
import type { CheckoutAppointment, Client } from '@/types/models'

export default function ClientDetail() {
  const params = useParams() as { id?: string }
  const id = params?.id
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingNotes, setEditingNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // État pour gérer l'ouverture de la modal de détail/paiement
  const [selectedApt, setSelectedApt] = useState<CheckoutAppointment | null>(null)

  const loadClient = async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/customers?id=${encodeURIComponent(id)}`)
      if (res.ok) {
        const data = await res.json()
        setClient(data)
        setEditingNotes(data.Note || '')
      }
    } catch (err) {
      console.error('Erreur chargement client', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadClient() }, [id])

  const saveNotes = async () => {
    if (!client) return
    setSaving(true)
    try {
      const res = await fetch('/api/customers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: client.id, notes: editingNotes })
      })
      if (res.ok) loadClient()
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 animate-pulse text-studio-muted">Chargement de la fiche client...</div>
  if (!client) return <div className="p-8 text-center">Client non trouvé</div>

  return (
      <div className="flex-1 p-8 space-y-6 bg-[#FAF9F6] min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/customers" className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 text-studio-muted">
              <ChevronLeft size={20} />
            </Link>
            <div>
              <h1 className="text-3xl font-serif font-bold text-studio-text">{client.firstName} {client.lastName}</h1>
              <p className="text-sm text-studio-muted">{client.phone}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Colonne gauche : Notes */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
              <h3 className="font-serif text-lg mb-4 flex items-center gap-2">
                <Receipt size={18} className="text-studio-primary" />
                Notes & Préférences
              </h3>
              <textarea
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  className="w-full p-4 border border-gray-100 rounded-2xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-studio-primary/20 transition-all"
                  rows={10}
                  placeholder="Allergies, préférences de massage, historique particulier..."
              />
              <button
                  disabled={saving}
                  onClick={saveNotes}
                  className="w-full mt-4 py-3 bg-studio-text text-white rounded-xl font-bold hover:bg-opacity-90 disabled:opacity-50 transition-all"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer les notes'}
              </button>
            </div>
          </div>

          {/* Colonne droite : Historique cliquable */}
          <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
            <h3 className="font-serif text-xl mb-6 flex items-center gap-2 text-studio-text">
              <Calendar size={20} className="text-studio-primary" />
              Historique des soins
            </h3>

            <div className="space-y-3">
                          {client.appointments && client.appointments.length > 0 ? (
                                  client.appointments.map((apt: CheckoutAppointment) => {
                                    // Guard and normalize startTime to avoid union/undefined issues
                                    const start = apt.startTime ? new Date(String(apt.startTime)) : null
                                    const formattedDate = start ? start.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : ''
                                    const formattedTime = start ? start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''
                                    const displayPrice = (apt.finalPrice ?? apt.service?.price)
                                    return (
                      <div
                          key={apt.id}
                          onClick={() => setSelectedApt({
                            ...apt,
                            customer: { name: `${client.firstName} ${client.lastName}` }
                          })}
                          className="flex items-center justify-between p-4 border border-gray-50 rounded-2xl hover:border-studio-primary/30 hover:bg-studio-primary/5 cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="bg-gray-50 p-3 rounded-xl group-hover:bg-white transition-colors">
                            <p className="text-[10px] uppercase font-black text-studio-primary text-center">{formattedDate}</p>
                          </div>
                          <div>
                            <p className="font-bold text-studio-text text-sm">{apt.service?.name}</p>
                            <p className="text-[11px] text-studio-muted italic">{formattedTime}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold text-studio-text text-sm">{displayPrice != null ? `${displayPrice} €` : '—'}</p>
                            <span className={`text-[9px] uppercase font-black ${apt.status === 'PAID' ? 'text-green-500' : 'text-orange-400'}`}>
                        {apt.status === 'PAID' ? 'Payé' : 'À encaisser'}
                      </span>
                          </div>
                        </div>
                      </div>
                      )
                      })
              ) : (
                  <div className="text-center py-12 text-studio-muted italic border-2 border-dashed border-gray-50 rounded-3xl">
                    Aucune prestation enregistrée pour le moment.
                  </div>
              )}
            </div>
          </div>
        </div>

        {/* La Modal qui s'ouvre au clic sur un rendez-vous de l'historique */}
        {selectedApt && (
            <CheckoutModal
                appointment={selectedApt}
                onClose={() => setSelectedApt(null)}
                onRefresh={loadClient} // Recharge les données client si on encaisse depuis l'historique
            />
        )}
      </div>
  )
}