"use client"
import React from 'react'

interface TimeRangeSectionProps {
  startTime: string
  duration: number
  endTimeLabel: string
  isTimeOutOfBounds: boolean
  horaireOuverture: string
  horaireFermeture: string
  onStartTimeChange: (value: string) => void
  onDurationChange: (value: number) => void
}

/** Section heure de début + durée + fin prévue dans le formulaire de RDV */
export function TimeRangeSection({
  startTime,
  duration,
  endTimeLabel,
  isTimeOutOfBounds,
  horaireOuverture,
  horaireFermeture,
  onStartTimeChange,
  onDurationChange,
}: TimeRangeSectionProps) {
  return (
    <div className="grid grid-cols-2 gap-3 p-4 bg-[#F8FAFC] rounded-2xl border border-[#F1F5F9]">
      <div>
        <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase">Début</label>
        <input
          type="time"
          value={startTime}
          onChange={(e) => onStartTimeChange(e.target.value)}
          className="w-full border-none bg-transparent text-lg font-bold outline-none text-slate-800"
        />
        {isTimeOutOfBounds && (
          <div className="text-[12px] text-red-500 mt-1">
            L&apos;heure doit être comprise entre {horaireOuverture} et {horaireFermeture}.
          </div>
        )}
      </div>
      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase">Durée (min)</label>
        <input
          type="number"
          step="5"
          value={duration}
          onChange={(e) => onDurationChange(e.target.valueAsNumber || 0)}
          className="w-full border-none bg-transparent text-lg font-bold outline-none text-slate-800"
        />
      </div>
      <div className="col-span-2 text-[10px] text-slate-400 border-t border-slate-200 pt-2 mt-1">
        Fin prévue à : <strong className="text-slate-600">{endTimeLabel}</strong>
      </div>
    </div>
  )
}

