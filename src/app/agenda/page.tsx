import React from 'react'
import ClientOnlyScheduler from '@/components/ClientOnlyScheduler'

export default function AgendaPage() {
  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div className="flex-1 h-full">
        <ClientOnlyScheduler />
      </div>
    </div>
  )
}

