"use client"
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { isAbortError } from '@/lib/utils'
import type { Customer, Service, Staff, InitialAppointmentData } from '@/types/models'
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import frLocale from '@fullcalendar/core/locales/fr';
import type { DateSelectArg, EventClickArg, EventContentArg, EventMountArg, EventDropArg, DatesSetArg } from '@fullcalendar/core';
import AppointmentModal from './calendar/AppointmentModal';
import UnavailabilityModal from './calendar/UnavailabilityModal';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/animations/shift-away.css';
import { BanIcon } from 'lucide-react';

interface CalEvent {
    id: string;
    title?: string;
    start?: string;
    end?: string;
    extendedProps?: Record<string, unknown>;
    color?: string
    classNames?: string[]
    display?: string
    allDay?: boolean
}

export default function AppointmentScheduler() {

    const [events, setEvents] = useState<CalEvent[]>([]);
    const [unavailabilities, setUnavailabilities] = useState<CalEvent[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRange, setSelectedRange] = useState<DateSelectArg | null>(null);
    const [editingEvent, setEditingEvent] = useState<InitialAppointmentData | null>(null);
    const [mounted, setMounted] = useState(false);
    useEffect(() => { const id = setTimeout(() => setMounted(true), 0); return () => clearTimeout(id) }, []);
    const lastRangeRef = useRef<{ start?: string; end?: string } | null>(null);
    const rangeControllerRef = useRef<AbortController | null>(null);

    // Unavailability modal state
    const [isUnavailModalOpen, setIsUnavailModalOpen] = useState(false);
    const [unavailInitialStart, setUnavailInitialStart] = useState<Date | null>(null);
    const [unavailInitialEnd, setUnavailInitialEnd] = useState<Date | null>(null);
    const [unavailEditingId, setUnavailEditingId] = useState<string | null>(null);
    const [unavailEditingTitle, setUnavailEditingTitle] = useState<string | null>(null);
    const [unavailEditingGroupId, setUnavailEditingGroupId] = useState<string | null>(null);

    // Horaires d'ouverture configurables
    const [openingTime, setOpeningTime] = useState("08:00")
    const [closingTime, setClosingTime] = useState("20:00")
    useEffect(() => {
        let mounted = true
        const load = async () => {
            try {
                const res = await fetch('/api/organization/settings')
                if (!res.ok) return
                const data = await res.json()
                if (mounted) {
                    if (typeof data?.openingTime === 'string') setOpeningTime(data.openingTime)
                    if (typeof data?.closingTime === 'string') setClosingTime(data.closingTime)
                }
            } catch { /* garder les valeurs par défaut */ }
        }
        load()
        const handler = () => load()
        window.addEventListener('organization:settings-updated', handler)
        return () => { mounted = false; window.removeEventListener('organization:settings-updated', handler) }
    }, [])

    const FullCalendarComponent = FullCalendar

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [staffs, setStaffs] = useState<Staff[]>([]);

    // --- CHARGEMENT DES DONNÉES ---
    const fetchAppointments = useCallback(async (start?: string, end?: string, signal?: AbortSignal) => {
        try {
            const params = new URLSearchParams()
            if (start) params.set('start', start)
            if (end) params.set('end', end)
            const url = `/api/appointments${params.toString() ? `?${params}` : ''}`
            const res = await fetch(url, { signal, credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                if (!signal || !signal.aborted) setEvents(data);
            }
        } catch (err) {
            if (isAbortError(err)) return
            import('../lib/clientLogger').then(({ clientError }) => clientError('Erreur RDV', err))
        }
    }, []);

    const fetchUnavailabilities = useCallback(async (start?: string, end?: string) => {
        try {
            const params = new URLSearchParams()
            if (start) params.set('start', start)
            if (end) params.set('end', end)
            const url = `/api/unavailability${params.toString() ? `?${params}` : ''}`
            const res = await fetch(url, { credentials: 'include' })
            if (res.ok) setUnavailabilities(await res.json())
        } catch (err) {
            if (isAbortError(err)) return
            import('../lib/clientLogger').then(({ clientError }) => clientError('fetchUnavailabilities error', err))
        }
    }, []);

    // Listen for external appointment updates (e.g. created from QuickAppointmentModal)
    useEffect(() => {
        function onUpdated() {
            // Recharge sur la plage des 3 mois autour d'aujourd'hui
            const now = new Date()
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
            const end = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString()
            fetchAppointments(start, end)
        }
        window.addEventListener('appointments:updated', onUpdated);

    // Refresh customers list when a new customer is created inline
    async function onCustomersUpdated() {
        try {
            const res = await fetch('/api/customers', { credentials: 'include' })
            if (res.ok) setCustomers(await res.json())
        } catch {}
    }
    window.addEventListener('customers:updated', onCustomersUpdated)
        return () => {
            window.removeEventListener('appointments:updated', onUpdated)
            window.removeEventListener('customers:updated', onCustomersUpdated)
        }
    }, [fetchAppointments]);

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        const loadResources = async () => {
            // Charge les RDV pour 2 mois autour de maintenant au démarrage
            const now = new Date()
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
            const end = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString()
            await fetchAppointments(start, end, signal);
            await fetchUnavailabilities(start, end);
            try {
                const [resC, resS, resT] = await Promise.all([
                    fetch('/api/customers', { signal, credentials: 'include' }),
                    fetch('/api/services', { signal, credentials: 'include' }),
                    fetch('/api/staff', { signal, credentials: 'include' })
                ]);
                if (!signal.aborted) {
                    if (resC.ok) setCustomers(await resC.json());
                    if (resS.ok) setServices(await resS.json());
                    if (resT.ok) setStaffs(await resT.json());
                }
            } catch (err) {
                if (isAbortError(err)) return
                import('../lib/clientLogger').then(({ clientError }) => clientError('Erreur ressources', err))
            }
        };

        loadResources();
        return () => controller.abort();
    }, [fetchAppointments, fetchUnavailabilities]);

    // Helper: check if a range overlaps with any unavailability
    const checkUnavailabilityConflict = useCallback((start: Date, end: Date): CalEvent | null => {
        return unavailabilities.find((u) => {
            const uStart = new Date(u.start!)
            const uEnd = new Date(u.end!)
            return start < uEnd && end > uStart
        }) ?? null
    }, [unavailabilities]);

    // All calendar events: appointments + unavailabilities merged
    const allEvents = [...events, ...unavailabilities];

    return (
        <div className="flex-1 flex flex-col h-full w-full p-6 min-h-0">
            {/* Toolbar */}
            <div className="flex justify-end mb-3">
                <button
                    onClick={() => {
                        setUnavailInitialStart(new Date())
                        setUnavailInitialEnd(new Date(Date.now() + 3600000))
                        setUnavailEditingId(null)
                        setUnavailEditingTitle(null)
                        setIsUnavailModalOpen(true)
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold transition-colors border border-slate-200"
                >
                    <BanIcon size={15} /> Indisponibilité
                </button>
            </div>

            <div className="studio-card flex-1 p-6 min-h-0 overflow-hidden bg-white rounded-4xl border border-studio-border shadow-sm">
                {mounted ? (
                    <FullCalendar
                        key={`${openingTime}-${closingTime}`}
                        plugins={[timeGridPlugin, interactionPlugin, dayGridPlugin]}
                        initialView="timeGridWeek"
                        height="100%"
                        contentHeight="100%"
                        expandRows={true}
                        events={allEvents}
                        locale="fr"
                        locales={[frLocale]}
                        selectable={true}
                        editable={true}
                        nowIndicator={true}
                        slotMinTime={`${openingTime}:00`}
                        slotMaxTime={`${closingTime}:00`}
                        allDaySlot={false}
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'timeGridDay,timeGridWeek'
                        }}

                        datesSet={(info: DatesSetArg) => {
                            try {
                                const last = (lastRangeRef.current || {})
                                if (last.start === info.startStr && last.end === info.endStr) return
                                lastRangeRef.current = { start: info.startStr, end: info.endStr }
                                try { rangeControllerRef.current?.abort() } catch {}
                                const c = new AbortController()
                                rangeControllerRef.current = c
                                fetchAppointments(info.startStr, info.endStr, c.signal)
                                fetchUnavailabilities(info.startStr, info.endStr)
                            } catch (e) { /* defensive */ fetchAppointments(info.startStr, info.endStr) }
                        }}

                        // --- 1. RENDU DES CASES ---
                        eventContent={(info: EventContentArg) => {
                            const isUnavail = info.event.extendedProps?.type === 'unavailability'
                            if (isUnavail) {
                                return (
                                    <div className="h-full w-full flex items-center px-1 gap-1 overflow-hidden"
                                        style={{
                                            background: 'repeating-linear-gradient(45deg,#cbd5e1 0px,#cbd5e1 2px,#e2e8f0 2px,#e2e8f0 8px)',
                                            borderLeft: '3px solid #64748b',
                                        }}>
                                        <BanIcon size={10} className="text-slate-500 shrink-0" />
                                        <span className="text-[10px] font-bold text-slate-600 truncate">{info.event.title}</span>
                                    </div>
                                )
                            }
                            const hasSold = !!info.event.extendedProps?.soldProducts
                            return (
                                <div className="p-1 leading-tight overflow-hidden flex items-center justify-between">
                                    <div className="min-w-0">
                                        <p className="font-bold text-[10px] uppercase truncate text-studio-text">{info.event.title}</p>
                                        <p className="text-[9px] text-studio-text/70">{info.timeText}</p>
                                    </div>
                                    {hasSold && <span title="Contient des ventes" className="text-[12px] ml-2">🛒</span>}
                                </div>
                            )
                        }}

                        // --- 2. BULLE D'INFOS (TIPPY) ---
                        eventDidMount={(info: EventMountArg) => {
                            const isUnavail = info.event.extendedProps?.type === 'unavailability'
                            if (isUnavail) {
                                const container = document.createElement('div')
                                const label = document.createElement('p')
                                label.style.fontWeight = '700'
                                label.style.fontSize = '13px'
                                label.textContent = `🚫 ${String(info.event.title ?? '')}`
                                container.appendChild(label)
                                const sub = document.createElement('p')
                                sub.style.fontSize = '11px'
                                sub.style.color = '#64748b'
                                sub.style.marginTop = '4px'
                                sub.textContent = 'Créneau indisponible — cliquez pour supprimer'
                                container.appendChild(sub)
                                tippy(info.el, { content: container, allowHTML: false, theme: 'studio-light', placement: 'top', animation: 'shift-away', interactive: true })
                                return
                            }
                            const props = info.event.extendedProps as Record<string, unknown> | undefined;
                            const container = document.createElement('div')
                            container.style.color = '#2D2424'
                            const title = document.createElement('p')
                            title.style.color = '#D4A3A1'
                            title.style.fontWeight = '800'
                            title.style.fontSize = '10px'
                            title.style.textTransform = 'uppercase'
                            title.style.margin = '0 0 4px 0'
                            title.textContent = 'Détails du RDV'
                            container.appendChild(title)
                            const main = document.createElement('p')
                            main.style.fontWeight = '700'
                            main.style.fontSize = '14px'
                            main.style.margin = '0'
                            main.textContent = String(info.event.title ?? '')
                            container.appendChild(main)
                            const block = document.createElement('div')
                            block.style.marginTop = '8px'
                            block.style.display = 'flex'
                            block.style.flexDirection = 'column'
                            block.style.gap = '2px'
                            const timeP = document.createElement('p')
                            timeP.style.fontSize = '11px'
                            timeP.style.margin = '0'
                            timeP.textContent = `⏰ ${info.timeText}`
                            block.appendChild(timeP)
                            if (props?.customerName) {
                                const c = document.createElement('p')
                                c.style.fontSize = '11px'
                                c.style.margin = '0'
                                c.textContent = `👤 ${String(props.customerName)}`
                                block.appendChild(c)
                            }
                            if (props?.serviceName) {
                                const s = document.createElement('p')
                                s.style.fontSize = '11px'
                                s.style.color = '#D4A3A1'
                                s.style.fontStyle = 'italic'
                                s.style.marginTop = '4px'
                                s.textContent = `✨ ${String(props.serviceName)}`
                                block.appendChild(s)
                            }
                            if (props?.price) {
                                const p = document.createElement('p')
                                p.style.fontSize = '11px'
                                p.style.fontWeight = 'bold'
                                p.style.marginTop = '2px'
                                p.textContent = `💰 ${String(props.price)}`
                                block.appendChild(p)
                            }
                            if (props?.soldProducts) {
                                const sp = document.createElement('p')
                                sp.style.fontSize = '11px'
                                sp.style.marginTop = '6px'
                                sp.style.fontWeight = '700'
                                sp.textContent = '🛒 Ventes enregistrées'
                                block.appendChild(sp)
                            }
                            container.appendChild(block)
                            tippy(info.el, { content: container, allowHTML: false, theme: 'studio-light', placement: 'top', animation: 'shift-away', interactive: true })
                        }}

                        // --- 3. ACTIONS (CLIC & SÉLECTION) ---
                        select={(info: DateSelectArg) => {
                            // Vérifier collision avec indisponibilité
                            const conflict = checkUnavailabilityConflict(info.start, info.end)
                            if (conflict) {
                                toast.warning(`⚠️ Ce créneau est bloqué : "${conflict.title ?? 'Indisponibilité'}"`)
                                return
                            }
                            setSelectedRange(info);
                            setEditingEvent(null);
                            setIsModalOpen(true);
                        }}

                        eventClick={(info: EventClickArg) => {
                            // Clic sur une indisponibilité → ouvrir modale suppression
                            if (info.event.extendedProps?.type === 'unavailability') {
                                setUnavailInitialStart(info.event.start ?? new Date())
                                setUnavailInitialEnd(info.event.end ?? new Date())
                                setUnavailEditingId(info.event.id)
                                setUnavailEditingTitle(info.event.title ?? '')
                                setUnavailEditingGroupId((info.event.extendedProps?.recurrenceGroupId as string | null) ?? null)
                                setIsUnavailModalOpen(true)
                                return
                            }
                            const eventData: InitialAppointmentData = {
                                id: info.event.id,
                                title: info.event.title ?? undefined,
                                start: info.event.start?.toISOString(),
                                end: info.event.end?.toISOString(),
                                extendedProps: info.event.extendedProps as Record<string, unknown>
                            };
                            Object.assign(eventData, info.event.extendedProps as Record<string, unknown>)
                            setEditingEvent(eventData);
                            setSelectedRange(null);
                            setIsModalOpen(true);
                        }}

                        // --- 4. DRAG & DROP ---
                        eventDrop={async (info: EventDropArg) => {
                            // Interdire le déplacement d'une indisponibilité
                            if (info.event.extendedProps?.type === 'unavailability') { info.revert(); return }
                            const { event, revert } = info
                            try {
                                const res = await fetch('/api/appointments', {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    credentials: 'include',
                                    body: JSON.stringify({
                                        id: event.id,
                                        start: event.start?.toISOString(),
                                        end: event.end?.toISOString(),
                                        duration: event.end && event.start
                                            ? Math.round((event.end.getTime() - event.start.getTime()) / 60000)
                                            : undefined,
                                        serviceId: event.extendedProps?.serviceId as string | undefined,
                                        customerId: event.extendedProps?.customerId as string | undefined,
                                        staffId: event.extendedProps?.staffId as string | undefined,
                                    }),
                                })
                                if (!res.ok) {
                                    revert()
                                    if (res.status === 409) toast.error('Conflit horaire : ce créneau est déjà occupé.')
                                    else toast.error('Erreur lors du déplacement du rendez-vous.')
                                }
                            } catch {
                                revert()
                                toast.error('Erreur réseau lors du déplacement.')
                            }
                        }}

                        // --- 5. REDIMENSIONNEMENT ---
                        eventResize={async (info: { event: EventDropArg['event']; revert: () => void }) => {
                            if (info.event.extendedProps?.type === 'unavailability') { info.revert(); return }
                            const { event, revert } = info
                            try {
                                const res = await fetch('/api/appointments', {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    credentials: 'include',
                                    body: JSON.stringify({
                                        id: event.id,
                                        start: event.start?.toISOString(),
                                        end: event.end?.toISOString(),
                                        duration: event.end && event.start
                                            ? Math.round((event.end.getTime() - event.start.getTime()) / 60000)
                                            : undefined,
                                        serviceId: event.extendedProps?.serviceId as string | undefined,
                                        customerId: event.extendedProps?.customerId as string | undefined,
                                        staffId: event.extendedProps?.staffId as string | undefined,
                                    }),
                                })
                                if (!res.ok) {
                                    revert()
                                    toast.error('Erreur lors du redimensionnement du rendez-vous.')
                                }
                            } catch {
                                revert()
                                toast.error('Erreur réseau lors du redimensionnement.')
                            }
                        }}
                    />
                ) : (
                    <div className="h-full w-full" aria-hidden="true" />
                )}
            </div>

            {/* MODALE RDV */}
            <AppointmentModal
                isOpen={isModalOpen}
                onCloseAction={() => { setIsModalOpen(false); setSelectedRange(null); }}
                onSuccess={async () => { await fetchAppointments(); }}
                selectedRange={selectedRange}
                initialData={editingEvent}
                customers={customers}
                services={services}
                staffs={staffs}
            />

            {/* MODALE INDISPONIBILITÉ */}
            <UnavailabilityModal
                isOpen={isUnavailModalOpen}
                onClose={() => setIsUnavailModalOpen(false)}
                onSuccess={() => {
                    const now = new Date()
                    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
                    const end = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString()
                    fetchUnavailabilities(start, end)
                }}
                initialStart={unavailInitialStart}
                initialEnd={unavailInitialEnd}
                editingId={unavailEditingId}
                editingTitle={unavailEditingTitle}
                editingRecurrenceGroupId={unavailEditingGroupId}
            />
        </div>
    );
}




