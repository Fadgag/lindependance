"use client"

import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Save, X, Clock, Euro } from 'lucide-react'
import type { Service as ServiceType } from '@/types/models'

export default function ServiceManager() {
    const [services, setServices] = useState<ServiceType[]>([])
    const [isEditing, setIsEditing] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const [formData, setFormData] = useState<Partial<ServiceType>>({
        name: '',
        durationMinutes: 30,
        price: 0,
        color: '#C5908E'
    })

    const fetchServices = async () => {
        const res = await fetch('/api/services', { credentials: 'include' })
        if (res.ok) {
            const data = await res.json() as ServiceType[]
            setServices(data)
        }
    }

    useEffect(() => { fetchServices() }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        const method = isEditing ? 'PUT' : 'POST'
        const url = isEditing ? `/api/services?id=${isEditing}` : '/api/services'

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (res.ok) {
                setFormData({ name: '', durationMinutes: 30, price: 0, color: '#C5908E' })
                setIsEditing(null)
                fetchServices()
            }
        } catch (err) {
            import('../../lib/clientLogger').then(({ clientError }) => clientError('ServiceManager error', err))
        } finally {
            setIsLoading(false)
        }
    }

    const startEdit = (service: ServiceType) => {
        setIsEditing(service.id)
        setFormData({
            name: service.name,
            durationMinutes: service.durationMinutes,
            price: service.price,
            color: service.color || '#C5908E'
        })
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const cancelEdit = () => {
        setIsEditing(null)
        setFormData({ name: '', durationMinutes: 30, price: 0, color: '#C5908E' })
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* FORMULAIRE */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        {isEditing ? <Edit2 size={20} className="text-amber-500" /> : <Plus size={20} className="text-rose-400" />}
                        {isEditing ? "Modifier la prestation" : "Ajouter une prestation"}
                    </h2>
                    {isEditing && (
                        <button onClick={cancelEdit} className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-sm font-medium">
                            <X size={16} /> Annuler
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="flex flex-col gap-1 lg:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nom du service</label>
                        <input
                            type="text" placeholder="Coupe + Brushing..." value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-rose-100 transition-all"
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Durée (min)</label>
                        <div className="relative">
                            <Clock size={14} className="absolute left-3 top-3 text-slate-400" />
                            <input
                                type="number" step="5" value={formData.durationMinutes ?? 30}
                                onChange={e => setFormData({...formData, durationMinutes: Number.isNaN(parseInt(e.target.value)) ? 0 : parseInt(e.target.value)})}
                                className="w-full p-2.5 pl-9 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-rose-100"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prix (€)</label>
                        <div className="relative">
                            <Euro size={14} className="absolute left-3 top-3 text-slate-400" />
                            <input
                                type="number" step="0.5" value={formData.price ?? 0}
                                onChange={e => setFormData({...formData, price: Number.isNaN(parseFloat(e.target.value)) ? 0 : parseFloat(e.target.value)})}
                                className="w-full p-2.5 pl-9 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-rose-100"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Couleur</label>
                        <input
                            type="color" value={formData.color ?? '#C5908E'}
                            onChange={e => setFormData({...formData, color: e.target.value})}
                            className="w-full h-[42px] p-1 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                        />
                    </div>

                    <div className="lg:col-span-5 pt-2">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full py-3 rounded-xl font-bold text-white shadow-md transition-all flex items-center justify-center gap-2 ${
                                isEditing ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-900 hover:bg-slate-800'
                            }`}
                        >
                            {isLoading ? 'Enregistrement...' : isEditing ? <><Save size={18}/> Mettre à jour</> : <><Plus size={18}/> Créer la prestation</>}
                        </button>
                    </div>
                </form>
            </div>

            {/* LISTE DES SERVICES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.map(service => (
                    <div key={service.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-rose-200 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-1.5 h-12 rounded-full" style={{ backgroundColor: service.color ?? '#C5908E' }} />
                            <div>
                                <h3 className="font-bold text-slate-800">{service.name}</h3>
                                <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                                    <span className="flex items-center gap-1"><Clock size={12}/> {service.durationMinutes} min</span>
                                    <span className="flex items-center gap-1"><Euro size={12}/> {service.price}€</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEdit(service)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg">
                                <Edit2 size={16} />
                            </button>
                            <button onClick={async () => {
                                if(confirm("Supprimer ?")) {
                                    await fetch(`/api/services?id=${service.id}`, { method: 'DELETE', credentials: 'include' });
                                    fetchServices();
                                }
                            }} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}