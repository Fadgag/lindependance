"use client"

import React, { useState, useEffect } from 'react'
import useServices from '@/hooks/useServices'
import useCustomers from '@/hooks/useCustomers'
import FloatingActionButton from '@/components/ui/FloatingActionButton'
import AppointmentModal from '@/components/calendar/AppointmentModal'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

/**
 * QuickAppointmentModal
 * Bouton flottant (+) qui ouvre la modale de RDV unifiée (AppointmentModal).
 * Recharge services et clients à chaque ouverture pour rester à jour.
 */
export default function QuickAppointmentModal() {
  const { data: session } = useSession()
  const isOrganizationStaff = session?.user?.accountType === 'STAFF'
    && (session.user.role === 'ADMIN' || session.user.role === 'USER')

  if (!isOrganizationStaff) return null
  return <StaffQuickAppointmentModal />
}

function StaffQuickAppointmentModal() {
  const [isOpen, setIsOpen] = useState(false)
  const { customers, reload: reloadCustomers } = useCustomers()
  const { services, reload: reloadServices } = useServices()
  const router = useRouter()

  // Recharge les données fraîches à chaque ouverture de la modale
  useEffect(() => {
    if (isOpen) {
      reloadServices()
      reloadCustomers()
    }
  }, [isOpen, reloadServices, reloadCustomers])

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
