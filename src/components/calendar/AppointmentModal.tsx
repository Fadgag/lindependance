"use client"

import React, { useState, useEffect } from 'react'
import { isAbortError } from '@/lib/utils'
import { format, addMinutes, isValid, parse, differenceInMinutes } from "date-fns"
import { Trash2, AlertTriangle, Zap } from "lucide-react"
import BaseModal from "@/components/ui/BaseModal"
import { CustomerPicker } from "./CustomerPicker"
import type { Customer as CustomerType, Service as ServiceType, Staff as StaffType } from '@/types/models'
import type { DateSelectArg } from '@fullcalendar/core'

// Utility to extract error message safely from unknown payloads
function extractErrorMessage(payload: unknown): string | null {
    if (!payload) return null
    if (typeof payload === 'string') return payload
    if (typeof payload === 'object' && payload !== null) {
        const p = payload as Record<string, unknown>
        const maybeError = p['error'] ?? p['message'] ?? p['detail']
        if (typeof maybeError === 'string') return maybeError
        try { return JSON.stringify(payload) } catch { return null }
    }
    return null
}

type Range = { start: Date; end: Date }
type InitialData = Partial<{
    id: string;
    title: string;
    start: string;
    end: string;
    serviceId: string;
    customerId: string;
    staffId: string;
    duration: number;
    note: string;
    extendedProps?: Record<string, unknown>
}>

interface AppointmentModalProps {
    isOpen: boolean
    onCloseAction: () => void
    onSuccess: () => Promise<void>
    selectedRange?: Range | null
    initialData?: InitialData | null
    services?: ServiceType[]
    customers?: CustomerType[]
    staffs?: StaffType[]
}

export default function AppointmentModal({
                                             isOpen,
                                             onCloseAction,
                                             onSuccess,
                                             selectedRange,
                                              initialData = null,
                                              services = [],
                                              customers = []
                                         }: AppointmentModalProps) {
    // --- ÉTATS DU FORMULAIRE ---
    // form state initializers created below so we can derive initial values from props
    const [isSaving, setIsSaving] = useState(false)

    // --- ÉTATS COLLISIONS ---
    // collision peut être mis à jour par le flux de sauvegarde; utilisé dans le rendu
     
    const [collision, setCollision] = useState(false)
    const [forceSave, setForceSave] = useState(false)

    // Initialize local state with sensible defaults; we'll populate them when the modal opens
    const [selectedCustomerState, setSelectedCustomerState] = useState<CustomerType | null>(null)
    const [serviceIdState, setServiceIdState] = useState("")
    const [noteState, setNoteState] = useState("")
    const [startTimeState, setStartTimeState] = useState("")
    const [durationState, setDurationState] = useState<number>(30)
    // --- Forfaits ---
    // Shape returned by API: includes sessionsRemaining and a nested package relation
    type CustomerPackage = { id: string; sessionsRemaining: number; package?: { id?: string; name?: string }; serviceId?: string | null }
    const [customerPackages, setCustomerPackages] = useState<CustomerPackage[]>([])
    const [usePackage, setUsePackage] = useState(false)
    const [selectedCustomerPackageId, setSelectedCustomerPackageId] = useState<string | null>(null)

    // (aliases already declared earlier)

    // When the modal opens (or when initialData/selectedRange/customers change), initialize form state
    useEffect(() => {
        if (!isOpen) return

        // compute initial values from initialData if editing
            if (initialData) {
            const start = initialData.start ? new Date(initialData.start) : null
            const d = initialData.duration || initialData.extendedProps?.duration || 30
            const startStr = start && isValid(start) ? format(start, "HH:mm") : ""
            const svcId = String(initialData.serviceId ?? initialData.extendedProps?.serviceId ?? '')
            const noteVal = String(initialData.note ?? initialData.extendedProps?.note ?? '')
            const cId = String(initialData.customerId ?? initialData.extendedProps?.customerId ?? '')
            const selected = customers.find((c) => (c as CustomerType).id === cId) || null

            setSelectedCustomerState(selected)
            setServiceIdState(svcId)
            setNoteState(noteVal)
            setStartTimeState(startStr)
            setDurationState(Number(d))
            // initialize package selection if present
            const cpId = initialData.extendedProps?.customerPackageId || null
            if (cpId) {
                setUsePackage(true)
                setSelectedCustomerPackageId(String(cpId))
            }
            return
        }

        // otherwise, if a range was selected in the calendar, use that
        if (selectedRange) {
            // selectedRange is a FullCalendar DateSelectArg; extract safely
            const sr = selectedRange as DateSelectArg
            const start = new Date(sr.start)
            const end = new Date(sr.end)
            const startStr = isValid(start) ? format(start, "HH:mm") : ""
            const diff = differenceInMinutes(end, start)

            setSelectedCustomerState(null)
            setServiceIdState("")
            setNoteState("")
            setStartTimeState(startStr)
            setDurationState(diff > 0 ? diff : 30)
            return
        }

        // default empty form
        setSelectedCustomerState(null)
        setServiceIdState("")
        setNoteState("")
        setStartTimeState("")
        setDurationState(30)
    }, [isOpen, initialData, selectedRange, customers])

    // Fetch available customer packages for selected customer + service
    useEffect(() => {
        setCustomerPackages([])
        setUsePackage(false)
        setSelectedCustomerPackageId(null)
        if (!isOpen) return
        if (!selectedCustomerState || !serviceIdState) return
        const controller = new AbortController()
            const load = async () => {
            try {
                const res = await fetch(`/api/customers/${encodeURIComponent(selectedCustomerState.id)}/packages?serviceId=${encodeURIComponent(serviceIdState)}`, { signal: controller.signal, credentials: 'include' })
                if (res.ok) {
                    const data = await res.json()
                    // data: array of CustomerPackage with package info
                    setCustomerPackages((data || []) as CustomerPackage[])
                }
            } catch (err) {
                    if (isAbortError(err)) return
                    import('../../lib/clientLogger').then(({ clientError }) => clientError('Erreur chargement forfaits client', err))
            }
        }
        load()
        return () => controller.abort()
    }, [isOpen, selectedCustomerState, serviceIdState])

    // Keep using the old state names for downstream code compatibility by aliasing
    const selectedCustomer = selectedCustomerState
    const setSelectedCustomer = setSelectedCustomerState
    const serviceId = serviceIdState
    const setServiceId = setServiceIdState
    const note = noteState
    const setNote = setNoteState
    const startTime = startTimeState
    const setStartTime = setStartTimeState
    const duration = durationState
    const setDuration = setDurationState

    // --- CONTRAINTES HORAIRES ---
    const HORAIRE_OUVERTURE = "08:00"
    const HORAIRE_FERMETURE = "20:00"

    function isTimeValid(time: string, durationMinutes: number) {
        if (!time) return false
        try {
            const start = parse(time, "HH:mm", new Date())
            const end = addMinutes(start, durationMinutes)
            const open = parse(HORAIRE_OUVERTURE, "HH:mm", new Date())
            const close = parse(HORAIRE_FERMETURE, "HH:mm", new Date())
            return start >= open && end <= close
        } catch {
            return false
        }
    }

    const isTimeOutOfBounds = !isTimeValid(startTime, duration)

    // Validation du formulaire (champs obligatoires + horaires + durée)
    const isFormInvalid = !selectedCustomer || !serviceId || isTimeOutOfBounds || (Number(duration) <= 0)

    /* reset collision/force flags when modal opens (intentionally setting state in effect) */
    useEffect(() => {
        if (!isOpen) return
        setTimeout(() => {
            setCollision(false)
            setForceSave(false)
        }, 0)
    }, [isOpen])

            // avoid calling setState after unmount while awaiting onSuccess
            const mountedRef = React.useRef(true)
            useEffect(() => {
                mountedRef.current = true
                return () => { mountedRef.current = false }
            }, [])

    // --- LOGIQUE MÉTIER ---
    const getEndTimeLabel = () => {
        if (!startTime) return "--:--"
        try {
            const date = parse(startTime, "HH:mm", new Date())
            return format(addMinutes(date, duration), "HH:mm")
        } catch { return "--:--" }
    }

    const handleServiceChange = (id: string) => {
        setServiceId(id)
        setCollision(false)
        const foundService = services.find((s) => s.id === id)
        if (foundService) {
            const newDur = foundService.durationMinutes || 30
            setDuration(Number(newDur))
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        // sécurité côté client: empêcher l'envoi si le formulaire est invalide
        if (isFormInvalid) return

        setIsSaving(true)
        const baseDate = new Date(initialData?.start || selectedRange?.start || new Date())
        const [h, m] = startTime.split(':').map(Number)
        baseDate.setHours(h, m, 0, 0)

        try {
            const res = await fetch('/api/appointments', {
                method: initialData?.id ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    id: initialData?.id,
                    start: baseDate.toISOString(),
                    end: addMinutes(baseDate, duration).toISOString(),
                    duration: Number(duration),
                    customerId: selectedCustomer.id,
                    serviceId,
                    note: note, // Envoi de la note à l'API
                    force: forceSave,
                    ...(usePackage && selectedCustomerPackageId ? { customerPackageId: selectedCustomerPackageId } : {}),
                }),
            })

                if (res.ok) {
                // Close the modal immediately, then refresh parent data asynchronously
                try {
                    onCloseAction()
                    await onSuccess()
                } catch (err) {
                    import('../../lib/clientLogger').then(({ clientError }) => clientError('onSuccess failed', err))
                    // If the modal is still mounted, show an error and keep saving state
                                    if (mountedRef.current) {
                                                        alert("Erreur lors de la mise à jour de l&apos;agenda.")
                                                    }
                } finally {
                    if (mountedRef.current) setIsSaving(false)
                }
                } else {
                let payload: unknown = null
                try { payload = await res.json() } catch { /* ignore */ }
                import('../../lib/clientLogger').then(({ clientError }) => clientError('Save failed', { status: res.status, payload }))
                if (res.status === 409) {
                    setCollision(true)
                    setIsSaving(false)
                } else {
                    const msg = extractErrorMessage(payload) || (String(payload) || `HTTP ${res.status}`)
                    // show a user-friendly alert and keep modal open for fixes
                    alert('Erreur serveur: ' + msg)
                    setIsSaving(false)
                }
            }
        } catch (error) {
            import('../../lib/clientLogger').then(({ clientError }) => clientError('Save error', error))
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!initialData?.id || !confirm("Supprimer ce rendez-vous ?")) return
        setIsSaving(true)
        try {
            const res = await fetch(`/api/appointments?id=${initialData.id}`, { method: 'DELETE', credentials: 'include' })
                if (res.ok) {
                try {
                    onCloseAction()
                    await onSuccess()
                } catch (err) {
                    import('../../lib/clientLogger').then(({ clientError }) => clientError('onSuccess failed (delete)', err))
                    if (mountedRef.current) alert('Erreur lors de la mise à jour de l&apos;agenda.')
                } finally {
                    if (mountedRef.current) setIsSaving(false)
                }
            } else {
                let payload: unknown = null
                try { payload = await res.json() } catch { /* ignore */ }
                const msg = extractErrorMessage(payload) || `HTTP ${res.status}`
                alert('Erreur suppression: ' + msg)
                if (mountedRef.current) setIsSaving(false)
            }
        } catch (err) {
            import('../../lib/clientLogger').then(({ clientError }) => clientError('Delete error', err))
            if (mountedRef.current) setIsSaving(false)
        }
    }

    const found = services.find(s => s.id === serviceId)
    const currentServiceColor = (found && found.color) ? found.color : "#CBD5E1"

    if (!isOpen) return null

    return (
                <BaseModal isOpen={isOpen} onClose={onCloseAction} title={initialData?.id ? "Modifier le RDV" : "Nouveau RDV"}>
            <form onSubmit={handleSave} className="flex flex-col gap-5">

                {/* SECTION CLIENT */}
                <div>
                    <label className="text-[11px] font-bold text-studio-muted mb-2 block uppercase">Client</label>
                    <CustomerPicker
                        customers={customers}
                        onSelect={(id: string) => setSelectedCustomer(customers.find(c => c.id === id) || null)}
                        selectedId={selectedCustomer?.id}
                    />
                </div>

                {/* SECTION TEMPS */}
                <div className="grid grid-cols-2 gap-3 p-4 bg-[#F8FAFC] rounded-2xl border border-[#F1F5F9]">
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase">Début</label>
                        <input
                            type="time"
                            value={startTime}
                            onChange={(e) => {setStartTime(e.target.value); setCollision(false)}}
                            className="w-full border-none bg-transparent text-lg font-bold outline-none text-slate-800"
                        />
                        {isTimeOutOfBounds && (
                            <div className="text-[12px] text-red-500 mt-1">L&apos;heure doit être comprise entre {HORAIRE_OUVERTURE} et {HORAIRE_FERMETURE}.</div>
                        )}
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Durée (min)</label>
                        <input
                            type="number"
                            step="5"
                            value={duration}
                            onChange={(e) => {setDuration(e.target.valueAsNumber || 0); setCollision(false)}}
                            className="w-full border-none bg-transparent text-lg font-bold outline-none text-slate-800"
                        />
                    </div>
                    <div className="col-span-2 text-[10px] text-slate-400 border-t border-slate-200 pt-2 mt-1">
                        Fin prévue à : <strong className="text-slate-600">{getEndTimeLabel()}</strong>
                    </div>
                </div>

                {/* SECTION SERVICE ET NOTE */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-studio-muted flex items-center gap-1.5 uppercase">
                            Service
                            {serviceId && (
                                <span className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ backgroundColor: currentServiceColor }} />
                            )}
                        </label>
                        <select
                            value={serviceId}
                            onChange={(e) => handleServiceChange(e.target.value)}
                            className="p-2.5 rounded-xl border border-slate-200 outline-none bg-white text-sm"
                        >
                            <option value="">Choisir un service...</option>
                            {services.map((s) => (
                                <option key={s.id} value={s.id}>{s.name} ({s.durationMinutes} min)</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-studio-muted uppercase">Note</label>
                        <input
                            type="text"
                            placeholder="Ex: Cheveux épais, café noir..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="p-2.5 rounded-xl border border-slate-200 outline-none bg-white text-sm text-slate-800"
                        />
                    </div>
                </div>

                {/* FORFAIT */}
                {customerPackages.length > 0 && (
                    <div className="mt-3 p-4 bg-white rounded-xl border border-slate-200">
                        <label className="flex items-center gap-2">
                            <input type="checkbox" checked={usePackage} onChange={(e) => setUsePackage(e.target.checked)} />
                            <span className="text-sm font-bold">Utiliser une session de forfait</span>
                        </label>
                        {usePackage && (
                            <div className="mt-2">
                                <select value={selectedCustomerPackageId || ''} onChange={(e) => setSelectedCustomerPackageId(e.target.value || null)} className="w-full p-2 border rounded-md">
                                    <option value="">Choisir un forfait...</option>
                                    {customerPackages.map((p) => (
                                        <option key={p.id} value={p.id}>{(p.package?.name || '') + ' — Reste ' + p.sessionsRemaining + ' session(s)'}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                )}

                {/* ACTIONS */}
                <div className="flex justify-between items-center mt-2">
                    {/* Alerte courte si client/service non sélectionné */}
                    {(!selectedCustomer || !serviceId) && (
                        <div className="text-[12px] text-yellow-600 flex items-center gap-2">
                            <AlertTriangle size={14} /> Veuillez sélectionner un client et un service
                        </div>
                    )}

                    {collision && (
                        <div className="text-[12px] text-red-600 flex items-center gap-2">
                            <AlertTriangle size={14} /> Conflit détecté — vérifiez les horaires ou forcez l&apos;enregistrement
                        </div>
                    )}
                    {initialData?.id && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="text-red-500 text-[11px] font-bold flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                        >
                            <Trash2 size={14} /> SUPPRIMER
                        </button>
                    )}
                    <div className="flex gap-2 ml-auto">
                        <button type="button" onClick={onCloseAction} className="px-5 py-2 text-slate-400 font-bold text-sm">
                            ANNULER
                        </button>
                        <button
                            type="submit"
                            disabled={isFormInvalid || isSaving}
                            className="px-7 py-3 bg-studio-primary text-white rounded-full font-bold text-sm flex items-center gap-2 shadow-lg shadow-studio-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? "..." : <><Zap size={14} /> CONFIRMER</>}
                        </button>
                    </div>
                </div>
            </form>
        </BaseModal>
    )
}