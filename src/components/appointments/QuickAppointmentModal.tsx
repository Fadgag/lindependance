"use client"

import React, { useState } from 'react'
import useServices from '@/hooks/useServices'
import useCustomers from '@/hooks/useCustomers'
import FloatingActionButton from '@/components/ui/FloatingActionButton'
import AppointmentModal from '@/components/calendar/AppointmentModal'
import { useRouter } from 'next/navigation'

/**
 * QuickAppointmentModal
 * Bouton flottant (+) qui ouvre la modale de RDV unifiée (AppointmentModal).
 * Plus de logique de formulaire dupliquée ici.
 */
export default function QuickAppointmentModal() {
  const [isOpen, setIsOpen] = useState(false)
  const { customers } = useCustomers()
  const { services } = useServices()
  const router = useRouter()

  const handleSuccess = async () => {
    try {
      window.dispatchEvent(new CustomEvent('appointments:updated'))
    } catch { /* non-browser */ }
    router.refresh()
  }

  return (
    <>
      <FloatingActionButton onClickAction={() => setIsOpen(true)} ariaLabel="Nouveau rendez-vous" />

      <AppointmentModal
        isOpen={isOpen}
        onCloseAction={() => setIsOpen(false)}
        onSuccess={handleSuccess}
        selectedRange={null}
        initialData={null}
        customers={customers}
        services={services}
        staffs={[]}
      />
    </>
  )
}
