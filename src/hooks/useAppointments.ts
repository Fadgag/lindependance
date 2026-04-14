import { useState, useEffect, useCallback } from 'react';
import { isAbortError } from '@/lib/utils';
import type { CheckoutAppointment } from '@/types/models';
import { clientError } from '@/lib/clientLogger';

export function useAppointments() {
    const [appointments, setAppointments] = useState<CheckoutAppointment[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async (signal?: AbortSignal) => {
        setLoading(true);
        try {
            const res = await fetch('/api/appointments', { signal, credentials: 'include' });
            if (res.ok) {
                const data: CheckoutAppointment[] = await res.json();
                const now = new Date();
                const filtered = data
                    .filter((apt) => new Date(apt.end ?? apt.start ?? String(apt.startTime ?? apt.id)).getTime() > now.getTime() || apt.status === "CONFIRMED")
                    .sort((a, b) => new Date(String(a.start ?? a.startTime ?? '')).getTime() - new Date(String(b.start ?? b.startTime ?? '')).getTime());
                setAppointments(filtered);
            }
        } catch (err) {
            if (!isAbortError(err)) clientError('Erreur chargement rendez-vous', err);
        } finally {
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        load(controller.signal);
        // Listen for external updates (e.g. when an appointment is created elsewhere)
        function onUpdated() {
            load();
        }
        window.addEventListener('appointments:updated', onUpdated);

        return () => {
            controller.abort();
            window.removeEventListener('appointments:updated', onUpdated);
        }
    }, [load]);

    return { appointments, loading, refresh: load };
}