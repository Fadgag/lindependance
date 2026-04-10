import { useState, useEffect } from 'react';
import { isAbortError } from '@/lib/utils';
import type { CheckoutAppointment } from '@/types/models';
import { clientLogger } from '@/lib/clientLogger';

export function useAppointments() {
    const [appointments, setAppointments] = useState<CheckoutAppointment[]>([]);
    const [loading, setLoading] = useState(true);

    const load = async (signal?: AbortSignal) => {
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
            if (!isAbortError(err)) clientLogger.error('Erreur chargement rendez-vous', err instanceof Error ? err : new Error(String(err)));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        load(controller.signal);
        return () => controller.abort();
    }, []);

    return { appointments, loading, refresh: load };
}