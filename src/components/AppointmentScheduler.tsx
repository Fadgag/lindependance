"use client"
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings'
import { useCalendarData } from '@/hooks/useCalendarData'
import { CalendarEventContent } from './calendar/CalendarEventContent'
import { buildCalendarTooltip } from '@/lib/buildCalendarTooltip'
import type { InitialAppointmentData } from '@/types/models'
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import frLocale from '@fullcalendar/core/locales/fr';
import type { DateSelectArg, EventClickArg, EventContentArg, EventMountArg, EventDropArg, DatesSetArg } from '@fullcalendar/core';
import AppointmentModal from './calendar/AppointmentModal';
import UnavailabilityModal from './calendar/UnavailabilityModal';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/animations/shift-away.css';
import { BanIcon } from 'lucide-react';

export default function AppointmentScheduler() {
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

    const { openingTime, closingTime } = useOrganizationSettings()
    const { events, unavailabilities, customers, services, staffs, fetchAppointments, fetchUnavailabilities, checkUnavailabilityConflict } = useCalendarData()

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
                        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'timeGridDay,timeGridWeek' }}

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
                            } catch { /* defensive */ fetchAppointments(info.startStr, info.endStr) }
                        }}

                        eventContent={(info: EventContentArg) => <CalendarEventContent info={info} />}
                        eventDidMount={(info: EventMountArg) => buildCalendarTooltip(info)}

                        select={(info: DateSelectArg) => {
                            const conflict = checkUnavailabilityConflict(info.start, info.end)
                            if (conflict) { toast.warning(`⚠️ Ce créneau est bloqué : "${conflict.title ?? 'Indisponibilité'}"`); return }
                            setSelectedRange(info); setEditingEvent(null); setIsModalOpen(true);
                        }}

                        eventClick={(info: EventClickArg) => {
                            if (info.event.extendedProps?.type === 'unavailability') {
                                setUnavailInitialStart(info.event.start ?? new Date())
                                setUnavailInitialEnd(info.event.end ?? new Date())
                                setUnavailEditingId(info.event.id)
                                setUnavailEditingTitle(info.event.title ?? '')
                                setUnavailEditingGroupId((info.event.extendedProps?.recurrenceGroupId as string | null) ?? null)
                                setIsUnavailModalOpen(true); return
                            }
                            const eventData: InitialAppointmentData = {
                                id: info.event.id, title: info.event.title ?? undefined,
                                start: info.event.start?.toISOString(), end: info.event.end?.toISOString(),
                                extendedProps: info.event.extendedProps as Record<string, unknown>
                            };
                            Object.assign(eventData, info.event.extendedProps as Record<string, unknown>)
                            setEditingEvent(eventData); setSelectedRange(null); setIsModalOpen(true);
                        }}

                        eventDrop={async (info: EventDropArg) => {
                            if (info.event.extendedProps?.type === 'unavailability') { info.revert(); return }
                            const { event, revert } = info
                            try {
                                const res = await fetch('/api/appointments', {
                                    method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
                                    body: JSON.stringify({ id: event.id, start: event.start?.toISOString(), end: event.end?.toISOString(),
                                        duration: event.end && event.start ? Math.round((event.end.getTime() - event.start.getTime()) / 60000) : undefined,
                                        serviceId: event.extendedProps?.serviceId as string | undefined,
                                        customerId: event.extendedProps?.customerId as string | undefined,
                                        staffId: event.extendedProps?.staffId as string | undefined }),
                                })
                                if (!res.ok) { revert(); if (res.status === 409) toast.error('Conflit horaire : ce créneau est déjà occupé.'); else toast.error('Erreur lors du déplacement du rendez-vous.') }
                            } catch { revert(); toast.error('Erreur réseau lors du déplacement.') }
                        }}

                        eventResize={async (info: { event: EventDropArg['event']; revert: () => void }) => {
                            if (info.event.extendedProps?.type === 'unavailability') { info.revert(); return }
                            const { event, revert } = info
                            try {
                                const res = await fetch('/api/appointments', {
                                    method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
                                    body: JSON.stringify({ id: event.id, start: event.start?.toISOString(), end: event.end?.toISOString(),
                                        duration: event.end && event.start ? Math.round((event.end.getTime() - event.start.getTime()) / 60000) : undefined,
                                        serviceId: event.extendedProps?.serviceId as string | undefined,
                                        customerId: event.extendedProps?.customerId as string | undefined,
                                        staffId: event.extendedProps?.staffId as string | undefined }),
                                })
                                if (!res.ok) { revert(); toast.error('Erreur lors du redimensionnement du rendez-vous.') }
                            } catch { revert(); toast.error('Erreur réseau lors du redimensionnement.') }
                        }}
                    />
                ) : (
                    <div className="h-full w-full" aria-hidden="true" />
                )}
            </div>

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
