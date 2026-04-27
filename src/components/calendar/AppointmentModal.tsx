"use client"

import React from 'react'
import { format } from "date-fns"
import { fr as frLocale } from 'date-fns/locale'
import { Trash2, AlertTriangle, Zap } from "lucide-react"
import BaseModal from "@/components/ui/BaseModal"
import ConfirmDialog from "@/components/ui/ConfirmDialog"
import { PackageSelector } from "./PackageSelector"
import { TimeRangeSection } from "./TimeRangeSection"
import { CustomerPicker } from "./CustomerPicker"
import type { Customer as CustomerType, Service as ServiceType, Staff as StaffType } from '@/types/models'
import type { DateSelectArg } from '@fullcalendar/core'
import { useAppointmentForm } from '@/hooks/useAppointmentForm'

type Range = { start: Date; end: Date }
type InitialData = Partial<{
  id: string; title: string; start: string; end: string;
  serviceId: string; customerId: string; staffId: string;
  duration: number; note: string;
  extendedProps?: Record<string, unknown>
}>

interface AppointmentModalProps {
  isOpen: boolean
  onCloseAction: () => void
  onSuccess: () => Promise<void>
  selectedRange?: Range | null
  initialData?: InitialData | null
  services?: ServiceType[]
  customers?: CustomerType[]
  staffs?: StaffType[]
}

export default function AppointmentModal({
  isOpen, onCloseAction, onSuccess,
  selectedRange, initialData = null, services = [], customers = [],
}: AppointmentModalProps) {
  const form = useAppointmentForm({ isOpen, initialData: initialData ?? null, selectedRange: selectedRange ?? null, customers, services, onCloseAction, onSuccess })
  const {
    selectedCustomer, setSelectedCustomer, serviceId, note, setNote,
    startTime, duration, date, setDate, customerPackages, usePackage, setUsePackage,
    selectedCustomerPackageId, setSelectedCustomerPackageId,
    isSaving, collision, setCollision, confirmDeleteOpen, setConfirmDeleteOpen,
    HORAIRE_OUVERTURE, HORAIRE_FERMETURE, isTimeOutOfBounds, isFormInvalid,
    getEndTimeLabel, handleServiceChange, handleSave, handleDelete, handleConfirmDelete,
    setStartTime, setDuration,
  } = form

  const found = services.find(s => s.id === serviceId)
  const currentServiceColor = (found && found.color) ? found.color : "#CBD5E1"

  if (!isOpen) return null

  return (
    <>
      <BaseModal isOpen={isOpen} onClose={onCloseAction} title={initialData?.id ? "Modifier le RDV" : "Nouveau RDV"}>
        <form onSubmit={handleSave} className="flex flex-col gap-5">

          {/* CLIENT */}
          <div>
            <label className="text-[11px] font-bold text-studio-muted mb-2 block uppercase">Client</label>
            <CustomerPicker
              customers={customers}
              onSelectAction={(id: string) => setSelectedCustomer(customers.find(c => c.id === id) || null)}
              selectedId={selectedCustomer?.id}
              onCreatedAction={(cust) => {
                // RAISON: `cust` est l'objet JSON renvoyé par `/api/customers` — correspond au type CustomerType
                setSelectedCustomer(cust as CustomerType)
              }}
            />
          </div>

          {/* DATE */}
          <div className="mb-3 p-4 bg-white rounded-xl border border-slate-200">
            <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => { setDate(e.target.value); setCollision(false) }}
              className="w-full mt-2 p-2 rounded-xl border border-slate-100 bg-white text-sm text-slate-800"
            />
            {date && (
              <div className="text-[12px] text-slate-600 mt-2">
                {(() => {
                  try {
                    const d = new Date(date)
                    const human = format(d, 'EEEE d MMMM yyyy', { locale: frLocale })
                    return human.charAt(0).toUpperCase() + human.slice(1)
                  } catch { return '' }
                })()}
              </div>
            )}
          </div>

          {/* HEURE & DURÉE */}
          <TimeRangeSection
            startTime={startTime}
            duration={duration}
            endTimeLabel={getEndTimeLabel()}
            isTimeOutOfBounds={isTimeOutOfBounds}
            horaireOuverture={HORAIRE_OUVERTURE}
            horaireFermeture={HORAIRE_FERMETURE}
            onStartTimeChange={(v) => { setStartTime(v); setCollision(false) }}
            onDurationChange={(v) => { setDuration(v); setCollision(false) }}
          />

          {/* SERVICE & NOTE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-studio-muted flex items-center gap-1.5 uppercase">
                Service
                {serviceId && <span className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ backgroundColor: currentServiceColor }} />}
              </label>
              <select value={serviceId} onChange={(e) => handleServiceChange(e.target.value)} className="p-2.5 rounded-xl border border-slate-200 outline-none bg-white text-sm">
                <option value="">Choisir un service...</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.durationMinutes} min)</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-studio-muted uppercase">Note</label>
              <input type="text" placeholder="Ex: Cheveux épais, café noir..." value={note} onChange={(e) => setNote(e.target.value)} className="p-2.5 rounded-xl border border-slate-200 outline-none bg-white text-sm text-slate-800" />
            </div>
          </div>

          {/* FORFAIT */}
          <PackageSelector
            packages={customerPackages} usePackage={usePackage} setUsePackage={setUsePackage}
            selectedPackageId={selectedCustomerPackageId} setSelectedPackageId={setSelectedCustomerPackageId}
          />

          {/* ACTIONS */}
          <div className="flex justify-between items-center mt-2">
            {(!selectedCustomer || !serviceId) && (
              <div className="text-[12px] text-yellow-600 flex items-center gap-2"><AlertTriangle size={14} /> Veuillez sélectionner un client et un service</div>
            )}
            {collision && (
              <div className="text-[12px] text-red-600 flex items-center gap-2"><AlertTriangle size={14} /> Conflit détecté — vérifiez les horaires ou forcez l&apos;enregistrement</div>
            )}
            {initialData?.id && (
              <button type="button" onClick={handleDelete} className="text-red-500 text-[11px] font-bold flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                <Trash2 size={14} /> SUPPRIMER
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <button type="button" onClick={onCloseAction} className="px-5 py-2 text-slate-400 font-bold text-sm">ANNULER</button>
              <button type="submit" disabled={isFormInvalid || isSaving} className="px-7 py-3 bg-studio-primary text-white rounded-full font-bold text-sm flex items-center gap-2 shadow-lg shadow-studio-primary/20 disabled:opacity-50 disabled:cursor-not-allowed">
                {isSaving ? "..." : <><Zap size={14} /> CONFIRMER</>}
              </button>
            </div>
          </div>
        </form>
      </BaseModal>
      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title="Supprimer ce rendez-vous ?"
        message="Cette action est irréversible."
        confirmLabel="Supprimer"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </>
  )
}
