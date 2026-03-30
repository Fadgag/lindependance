"use client"

import dynamic from 'next/dynamic'
import React from 'react'

const AppointmentScheduler = dynamic(() => import('./AppointmentScheduler'), { ssr: false })
const RegisterServiceWorker = dynamic(() => import('./RegisterServiceWorker'), { ssr: false })

export default function ClientOnlyScheduler() {
  return (
    <div>
      <RegisterServiceWorker />
      <AppointmentScheduler />
    </div>
  )
}

