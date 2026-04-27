"use client"
import React from 'react'
import type { EventContentArg } from '@fullcalendar/core'
import { BanIcon } from 'lucide-react'

/** Rendu custom d'un événement dans FullCalendar (RDV ou indisponibilité) */
export function CalendarEventContent({ info }: { info: EventContentArg }) {
  const isUnavail = info.event.extendedProps?.type === 'unavailability'

  if (isUnavail) {
    return (
      <div
        className="h-full w-full flex items-center px-1 gap-1 overflow-hidden"
        style={{
          background: 'repeating-linear-gradient(45deg,#cbd5e1 0px,#cbd5e1 2px,#e2e8f0 2px,#e2e8f0 8px)',
          borderLeft: '3px solid #64748b',
        }}
      >
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
}

