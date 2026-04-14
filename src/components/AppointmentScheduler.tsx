"use client"
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { isAbortError } from '@/lib/utils'
import type { Customer, Service, Staff, InitialAppointmentData } from '@/types/models'
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import frLocale from '@fullcalendar/core/locales/fr';
import type { DateSelectArg, EventClickArg, EventContentArg, EventMountArg, EventDropArg } from '@fullcalendar/core';
import AppointmentModal from './calendar/AppointmentModal';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/animations/shift-away.css';

interface CalEvent {
    id: string;
    title?: string;
    start?: string;
    end?: string;
    extendedProps?: Record<string, unknown>;
    color?: string
}

export default function AppointmentScheduler() {

    const [events, setEvents] = useState<CalEvent[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRange, setSelectedRange] = useState<DateSelectArg | null>(null);
    const [editingEvent, setEditingEvent] = useState<InitialAppointmentData | null>(null);
    const [mounted, setMounted] = useState(false);
    useEffect(() => { const id = setTimeout(() => setMounted(true), 0); return () => clearTimeout(id) }, []);

    const FullCalendarComponent = FullCalendar

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [staffs, setStaffs] = useState<Staff[]>([]);

    // --- CHARGEMENT DES DONNÉES ---
    const fetchAppointments = useCallback(async (signal?: AbortSignal) => {
        try {
            const res = await fetch('/api/appointments', { signal, credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                if (!signal || !signal.aborted) setEvents(data);
            }
        } catch (err) {
            if (isAbortError(err)) return
            import('../lib/clientLogger').then(({ clientError }) => clientError('Erreur RDV', err))
        }
    }, []);

    // Listen for external appointment updates (e.g. created from QuickAppointmentModal)
    useEffect(() => {
        function onUpdated() {
            fetchAppointments();
        }
        window.addEventListener('appointments:updated', onUpdated);
        return () => window.removeEventListener('appointments:updated', onUpdated);
    }, [fetchAppointments]);

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        const loadResources = async () => {
            await fetchAppointments(signal);
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
    }, [fetchAppointments]);

    return (
        <div className="flex-1 flex flex-col h-full w-full p-6 min-h-0">
            <div className="studio-card flex-1 p-6 min-h-0 overflow-hidden bg-white rounded-4xl border border-studio-border shadow-sm">
                {mounted ? (
                    <FullCalendarComponent
                        plugins={[timeGridPlugin, interactionPlugin, dayGridPlugin]}
                        initialView="timeGridWeek"
                        height="100%"
                        contentHeight="100%"
                        expandRows={true}
                        events={events}
                        locale="fr"
                        locales={[frLocale]}
                        selectable={true}
                        editable={true}
                        nowIndicator={true}
                        slotMinTime="08:00:00"
                        slotMaxTime="20:00:00"
                        allDaySlot={false}
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'timeGridDay,timeGridWeek'
                        }}

                        // --- 1. RENDU DES CASES (MINI) ---
                        eventContent={(info: EventContentArg) => (
                            <div className="p-1 leading-tight overflow-hidden">
                                <p className="font-bold text-[10px] uppercase truncate text-studio-text">
                                    {info.event.title}
                                </p>
                                <p className="text-[9px] text-studio-text/70">
                                    {info.timeText}
                                </p>
                            </div>
                        )}

                        // --- 2. BULLE D'INFOS (TIPPY) ---
                        eventDidMount={(info: EventMountArg) => {
                            const props = info.event.extendedProps;
                            tippy(info.el, {
                                content: `
                                    <div style="color: #2D2424;">
                                        <p style="color: #D4A3A1; font-weight: 800; font-size: 10px; text-transform: uppercase; margin: 0 0 4px 0;">Détails du RDV</p>
                                        <p style="font-weight: 700; font-size: 14px; margin: 0;">${info.event.title}</p>
                                        <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 2px;">
                                            <p style="font-size: 11px; margin: 0;">⏰ <b>${info.timeText}</b></p>
                                            ${props.customerName ? `<p style="font-size: 11px; margin: 0;">👤 ${props.customerName} </p>` : ''}
                                            ${props.serviceName ? `<p style="font-size: 11px; color: #D4A3A1; font-style: italic; margin-top: 4px;">✨ ${props.serviceName}</p>` : ''}
                                            ${props.price ? `<p style="font-size: 11px; font-weight: bold; margin-top: 2px;">💰 ${props.price}</p>` : ''}
                                        </div>
                                    </div>
                                `,
                                allowHTML: true,
                                theme: 'studio-light',
                                placement: 'top',
                                animation: 'shift-away',
                                interactive: true,
                            });
                        }}

                        // --- 3. ACTIONS (CLIC & SÉLECTION) ---
                        select={(info: DateSelectArg) => {
                            setSelectedRange(info);
                            setEditingEvent(null);
                            setIsModalOpen(true);
                        }}

                        eventClick={(info: EventClickArg) => {
                            // FIX CRITIQUE : On fusionne les infos de base et les extendedProps
                            const eventData: InitialAppointmentData = {
                                id: info.event.id,
                                title: info.event.title ?? undefined,
                                start: info.event.start?.toISOString(),
                                end: info.event.end?.toISOString(),
                                // RAISON: FullCalendar `extendedProps` est typiquement `Record<string, unknown>`
                                extendedProps: info.event.extendedProps as Record<string, unknown>
                            };
                            // RAISON: merge extendedProps dans top-level pour simplifier l'accès côté modal
                            Object.assign(eventData, info.event.extendedProps as Record<string, unknown>)
                            setEditingEvent(eventData);
                            setSelectedRange(null);
                            setIsModalOpen(true);
                        }}

                        // --- 4. DRAG & DROP ---
                        eventDrop={async (info: EventDropArg) => {
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

            {/* MODALE DE RENDEZ-VOUS */}
            <AppointmentModal
                isOpen={isModalOpen}
                onCloseAction={() => {
                    setIsModalOpen(false);
                    setSelectedRange(null);
                }}
                onSuccess={async () => { await fetchAppointments(); }}
                selectedRange={selectedRange}
                initialData={editingEvent}
                customers={customers}
                services={services}
                staffs={staffs}
            />
        </div>
    );
}