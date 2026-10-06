'use client'
import { useState, useEffect, useRef } from 'react'
import React from 'react'
import { toast } from 'sonner'
import { format, addMinutes, isValid, parse, differenceInMinutes } from 'date-fns'
import type { Customer as CustomerType, Service as ServiceType, CustomerPackageSummary } from '@/types/models'
import type { DateSelectArg } from '@fullcalendar/core'
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings'
import { useCustomerPackages } from '@/hooks/useCustomerPackages'
import { getUserFacingMutationError, getUserFacingNetworkError } from '@/lib/userFacingMutationError'

type Range = { start: Date; end: Date }
type InitialData = Partial<{
  id: string; title: string; start: string; end: string;
  serviceId: string; customerId: string; staffId: string;
  duration: number; note: string;
  extendedProps?: Record<string, unknown>
}>

export interface UseAppointmentFormReturn {
  // State
  selectedCustomer: CustomerType | null
  setSelectedCustomer: (c: CustomerType | null) => void
  serviceId: string
  setServiceId: (v: string) => void
  note: string
  setNote: (v: string) => void
  startTime: string
  setStartTime: (v: string) => void
  duration: number
  setDuration: (v: number) => void
  date: string
  setDate: (v: string) => void
  customerPackages: CustomerPackageSummary[]
  usePackage: boolean
  setUsePackage: (v: boolean) => void
  selectedCustomerPackageId: string | null
  setSelectedCustomerPackageId: (v: string | null) => void
  isSaving: boolean
  isNoteSaving: boolean
  noteSavedAt: number | null
  noteDirty: boolean
  collision: boolean
  setCollision: (v: boolean) => void
  confirmDeleteOpen: boolean
  setConfirmDeleteOpen: (v: boolean) => void
  // Computed
  HORAIRE_OUVERTURE: string
  HORAIRE_FERMETURE: string
  isTimeOutOfBounds: boolean
  isFormInvalid: boolean
  // Handlers
  getEndTimeLabel: () => string
  handleServiceChange: (id: string) => void
  handleSave: (e: React.FormEvent) => Promise<void>
  handleDelete: () => void
  handleConfirmDelete: () => Promise<void>
  handleSaveNote: () => Promise<boolean>
}

interface UseAppointmentFormProps {
  isOpen: boolean
  initialData: InitialData | null
  selectedRange: Range | null
  customers: CustomerType[]
  services: ServiceType[]
  onCloseAction: () => void
  onSuccess: () => Promise<void>
}

/** Hook centralisé — toute la logique métier du formulaire de RDV */
export function useAppointmentForm({
  isOpen, initialData, selectedRange, customers, services, onCloseAction, onSuccess,
}: UseAppointmentFormProps): UseAppointmentFormReturn {
  const [isSaving, setIsSaving] = useState(false)
  const [isNoteSaving, setIsNoteSaving] = useState(false)
  const [noteSavedAt, setNoteSavedAt] = useState<number | null>(null)
  const [noteDirty, setNoteDirty] = useState(false)
  const [collision, setCollision] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerType | null>(null)
  const [serviceId, setServiceId] = useState('')
  const [note, setNote] = useState('')
  const setNoteWrapper = React.useCallback((v: string) => { setNote(v); setNoteDirty(true) }, [])
  const [startTime, setStartTime] = useState('')
  const [date, setDate] = useState('')
  const [duration, setDuration] = useState(30)
  const mountedRef = useRef(true)
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  // Forfaits — délégués au hook dédié
  const { customerPackages, usePackage, setUsePackage, selectedCustomerPackageId, setSelectedCustomerPackageId } =
    useCustomerPackages(isOpen, selectedCustomer?.id, serviceId)

  // Initialisation du formulaire
  useEffect(() => {
    if (!isOpen) return
    if (initialData) {
      const start = initialData.start ? new Date(initialData.start) : null
      const d = initialData.duration || initialData.extendedProps?.duration || 30
      setSelectedCustomer(customers.find((c) => c.id === String(initialData.customerId ?? initialData.extendedProps?.customerId ?? '')) || null)
      setServiceId(String(initialData.serviceId ?? initialData.extendedProps?.serviceId ?? ''))
      const initialNote = String(initialData.note ?? initialData.extendedProps?.note ?? '')
      setNote(initialNote)
      setNoteDirty(false)
      setStartTime(start && isValid(start) ? format(start, 'HH:mm') : '')
      setDate(start && isValid(start) ? format(start, 'yyyy-MM-dd') : '')
      setDuration(Number(d))
      const cpId = initialData.extendedProps?.customerPackageId || null
      if (cpId) { setUsePackage(true); setSelectedCustomerPackageId(String(cpId)) }
      return
    }
    if (selectedRange) {
      // RAISON: selectedRange est passé comme DateSelectArg depuis FullCalendar — prop typée Range (alias local)
      const sr = selectedRange as DateSelectArg
      const start = new Date(sr.start)
      const end = new Date(sr.end)
      setSelectedCustomer(null); setServiceId(''); setNote('')
      setStartTime(isValid(start) ? format(start, 'HH:mm') : '')
      setDate(isValid(start) ? format(start, 'yyyy-MM-dd') : '')
      setDuration(differenceInMinutes(end, start) > 0 ? differenceInMinutes(end, start) : 30)
      return
    }
    setSelectedCustomer(null); setServiceId(''); setNote(''); setStartTime('')
    setDate(format(new Date(), 'yyyy-MM-dd')); setDuration(30)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- setUsePackage/setSelectedCustomerPackageId sont des setters stables issus de useCustomerPackages (équivalents useState), les inclure provoquerait des re-renders infinis
  }, [isOpen, initialData, selectedRange, customers])

  // Reset collision au montage
  useEffect(() => {
    if (!isOpen) return
    setTimeout(() => { setCollision(false) }, 0)
  }, [isOpen])

  const { openingTime: HORAIRE_OUVERTURE, closingTime: HORAIRE_FERMETURE } = useOrganizationSettings()

  const isTimeOutOfBounds = (() => {
    if (!startTime) return true
    try {
      const s = parse(startTime, 'HH:mm', new Date())
      const e = addMinutes(s, duration)
      return !(s >= parse(HORAIRE_OUVERTURE, 'HH:mm', new Date()) && e <= parse(HORAIRE_FERMETURE, 'HH:mm', new Date()))
    } catch { return true }
  })()

  const isFormInvalid = !selectedCustomer || !serviceId || !date || isTimeOutOfBounds || Number(duration) <= 0

  const getEndTimeLabel = () => {
    if (!startTime) return '--:--'
    try { return format(addMinutes(parse(startTime, 'HH:mm', new Date()), duration), 'HH:mm') }
    catch { return '--:--' }
  }

  const handleServiceChange = (id: string) => {
    setServiceId(id); setCollision(false)
    const found = services.find((s) => s.id === id)
    if (found) setDuration(Number(found.durationMinutes || 30))
  }

  // Save note only (used for autosave / explicit note save)
  const handleSaveNote = async (): Promise<boolean> => {
    // Only applicable for existing appointments
    if (!initialData?.id) return false
    if (!noteDirty) return true
    setIsNoteSaving(true)
    try {
      // Build a minimal payload satisfying UpdateAppointmentSchema (server requires start/end/duration)
      let startIso = initialData.start ?? ''
      let endIso = initialData.end ?? ''
      const dur = initialData.duration ?? Number(duration || 30)
      if (!startIso) {
        // Try to build start from current form date & startTime
        if (date && startTime) {
          const base = new Date(date)
          const [h, m] = startTime.split(':').map(Number)
          base.setHours(h, m, 0, 0)
          startIso = base.toISOString()
          endIso = new Date(base.getTime() + dur * 60000).toISOString()
        } else {
          // fallback -> Do NOT invent a date. Log and abort the note save to avoid data corruption.
          import('@/lib/clientLogger').then(({ clientError }) => clientError('Save note aborted: missing start/date in form and initial data', { initialData, date, startTime }))
          setIsNoteSaving(false)
          return false
        }
      }
      const res = await fetch('/api/appointments', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ id: initialData.id, note, start: startIso, end: endIso, duration: Number(dur) })
      })
      if (res.ok) {
        setNoteSavedAt(Date.now())
        setNoteDirty(false)
        setIsNoteSaving(false)
        return true
      }
      // Non ok -> log payload for debugging
      try {
        const payload = await res.json()
        import('@/lib/clientLogger').then(({ clientError }) => clientError('Save note failed', { status: res.status, payload }))
      } catch (e: unknown) {
        import('@/lib/clientLogger').then(({ clientError }) => clientError('Save note failed: unable to parse json response', e))
      }
      setIsNoteSaving(false)
      return false
    } catch (err: unknown) {
      import('@/lib/clientLogger').then(({ clientError }) => clientError('Save note error', err))
      setIsNoteSaving(false)
      return false
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isFormInvalid || !selectedCustomer) return
    setIsSaving(true)
    let baseDate: Date
    if (initialData?.start) baseDate = new Date(initialData.start)
    else if (selectedRange?.start) baseDate = new Date(selectedRange.start)
    else if (date) baseDate = new Date(date)
    else baseDate = new Date()
    const [h, m] = startTime.split(':').map(Number)
    baseDate.setHours(h, m, 0, 0)
    try {
      const res = await fetch('/api/appointments', {
        method: initialData?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({
          id: initialData?.id, start: baseDate.toISOString(), end: addMinutes(baseDate, duration).toISOString(),
          duration: Number(duration), customerId: selectedCustomer.id, serviceId, note,
          ...(usePackage && selectedCustomerPackageId ? { customerPackageId: selectedCustomerPackageId } : {}),
        }),
      })
        if (res.ok) {
          // after a full save, consider note persisted
          setNoteDirty(false)
          setNoteSavedAt(Date.now())
        try { onCloseAction(); await onSuccess() }
        catch (err: unknown) {
          import('@/lib/clientLogger').then(({ clientError }) => clientError('onSuccess failed', err))
          if (mountedRef.current) toast.error("Le rendez-vous a été enregistré, mais l'agenda n'a pas pu être actualisé. Actualisez la page.")
        } finally { if (mountedRef.current) setIsSaving(false) }
      } else {
        let payload: unknown = null
        try { payload = await res.json() } catch { /* ignore */ }
        import('@/lib/clientLogger').then(({ clientError }) => clientError('Save failed', { status: res.status, payload }))
        if (res.status === 409) setCollision(true)
        toast.error(getUserFacingMutationError('appointment-save', res.status))
        if (mountedRef.current) setIsSaving(false)
      }
    } catch (err: unknown) {
      import('@/lib/clientLogger').then(({ clientError }) => clientError('Save error', err))
      if (mountedRef.current) {
        toast.error(getUserFacingNetworkError('appointment-save'))
        setIsSaving(false)
      }
    }
  }

  const handleDelete = () => { if (initialData?.id) setConfirmDeleteOpen(true) }

  const handleConfirmDelete = async () => {
    setConfirmDeleteOpen(false)
    if (!initialData?.id) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/appointments?id=${initialData.id}`, { method: 'DELETE', credentials: 'include' })
      if (res.ok) {
        try { onCloseAction(); await onSuccess() }
        catch (err: unknown) {
          import('@/lib/clientLogger').then(({ clientError }) => clientError('onSuccess failed (delete)', err))
          if (mountedRef.current) toast.error("Le rendez-vous a été supprimé, mais l'agenda n'a pas pu être actualisé. Actualisez la page.")
        } finally { if (mountedRef.current) setIsSaving(false) }
      } else {
        let payload: unknown = null
        try { payload = await res.json() } catch { /* ignore */ }
        import('@/lib/clientLogger').then(({ clientError }) => clientError('Delete failed', { status: res.status, payload }))
        toast.error(getUserFacingMutationError('appointment-delete', res.status))
        if (mountedRef.current) setIsSaving(false)
      }
    } catch (err: unknown) {
      import('@/lib/clientLogger').then(({ clientError }) => clientError('Delete error', err))
      if (mountedRef.current) {
        toast.error(getUserFacingNetworkError('appointment-delete'))
        setIsSaving(false)
      }
    }
  }

  return {
    selectedCustomer, setSelectedCustomer, serviceId, setServiceId, note, setNote: setNoteWrapper,
    noteSavedAt, noteDirty,
    startTime, setStartTime, duration, setDuration, date, setDate,
    customerPackages, usePackage, setUsePackage, selectedCustomerPackageId, setSelectedCustomerPackageId,
    isSaving, isNoteSaving, collision, setCollision, confirmDeleteOpen, setConfirmDeleteOpen,
    HORAIRE_OUVERTURE, HORAIRE_FERMETURE, isTimeOutOfBounds, isFormInvalid,
    getEndTimeLabel, handleServiceChange, handleSave, handleDelete, handleConfirmDelete, handleSaveNote,
  }
}







