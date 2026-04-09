"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronRight, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAppointments } from '@/hooks/useAppointments';
import { AppointmentItem } from '@/components/dashboard/AppointmentItem';
import CheckoutModal from '@/components/dashboard/CheckoutModal';
import type { CheckoutAppointment } from '@/types/models';

export default function HomePage() {
  const { status } = useSession();
  const router = useRouter();

  // Récupération des rendez-vous via ton hook personnalisé
  const { appointments, loading, refresh } = useAppointments();

  // État pour la modal (contient l'objet rendez-vous complet)
  const [selectedApt, setSelectedApt] = useState<CheckoutAppointment | null>(null);

  // Protection de la route
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
        <div className="flex h-screen items-center justify-center bg-studio-bg">
          <Loader2 className="animate-spin text-studio-primary" size={40} />
        </div>
    );
  }

  return (
      <div className="flex-1 p-8 space-y-8 bg-studio-bg overflow-y-auto h-screen">
        {/* Header avec date dynamique */}
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-serif font-bold text-studio-text">Accueil</h1>
            <p className="text-studio-muted italic">Suivi de votre activité aujourd&apos;hui.</p>
          </div>
          <div className="text-sm font-bold uppercase tracking-widest text-studio-primary bg-white px-4 py-2 rounded-full shadow-sm border border-studio-primary/10">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </header>

        {/* Carte principale : Flux du jour */}
        <div className="studio-card p-8 bg-white shadow-xl rounded-[2rem] border border-gray-100">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-studio-primary/10 rounded-lg text-studio-primary">
                <CalendarIcon size={20} />
              </div>
              <h2 className="font-serif text-xl text-studio-text font-bold">Prochain Rdv</h2>
            </div>
            <Link
                href="/agenda"
                className="text-xs font-bold text-studio-primary hover:text-studio-text transition-colors flex items-center gap-1 group"
            >
              Agenda complet
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="space-y-4">
            {loading ? (
                <div className="flex flex-col items-center py-12 space-y-4">
                  <Loader2 className="animate-spin text-studio-primary/40" size={32} />
                  <p className="text-studio-muted text-sm italic">Mise &agrave; jour de l&apos;agenda...</p>
                </div>
            ) : appointments && appointments.length > 0 ? (
                <div className="grid gap-3">
                  {/* On affiche les 8 premiers rendez-vous */}
                  {appointments.slice(0, 20).map((apt: CheckoutAppointment) => (
                      <AppointmentItem
                          key={apt.id}
                          event={apt}
                          // Au clic, on ouvre la modal avec toutes les données de 'apt'
                          onCheckout={() => setSelectedApt(apt)}
                      />
                  ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                  <p className="text-studio-muted italic text-sm">Aucun rendez-vous prévu pour cette période.</p>
                  <Link href="/agenda" className="text-xs font-bold text-studio-primary mt-2 inline-block hover:underline">
                    Créer un rendez-vous
                  </Link>
                </div>
            )}
          </div>
        </div>

        {/* Modal unique gérant Encaissement ET Reçu */}
        {selectedApt && (
            <CheckoutModal
                appointment={selectedApt}
                onClose={() => setSelectedApt(null)}
                onRefresh={refresh} // Permet de rafraîchir la liste après paiement
            />
        )}
      </div>
  );
}