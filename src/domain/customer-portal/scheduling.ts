import { findFirstSchedulingConflict, type TimeRange } from '@/domain/appointment/policies'

export interface PortalAppointmentSlot extends TimeRange {
  staffId: string | null
  status: string
}

export interface PortalUnavailability extends TimeRange {}

export interface AvailableSlotsInput {
  date: string
  timezone: string
  openingTime: string
  closingTime: string
  durationMinutes: number
  slotIntervalMinutes: number
  staffId: string
  staffIds: string[]
  appointments: PortalAppointmentSlot[]
  unavailabilities: PortalUnavailability[]
  now: Date
}

export interface AvailableSlot {
  start: string
  end: string
}

export type PortalStaffSelection =
  | { status: 'selected'; staffId: string }
  | { status: 'required' }
  | { status: 'invalid' }
  | { status: 'unavailable' }

function parseDate(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null
  }

  return { year, month, day }
}

function parseTime(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

function localDateTimeToUtc(
  date: { year: number; month: number; day: number },
  minutesOfDay: number,
  timezone: string,
): Date | null {
  const hour = Math.floor(minutesOfDay / 60)
  const minute = minutesOfDay % 60
  const targetAsUtc = Date.UTC(date.year, date.month - 1, date.day, hour, minute)
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })

  let candidate = targetAsUtc
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = formatter.formatToParts(new Date(candidate))
    const values = new Map(parts.map((part) => [part.type, part.value]))
    const representedAsUtc = Date.UTC(
      Number(values.get('year')),
      Number(values.get('month')) - 1,
      Number(values.get('day')),
      Number(values.get('hour')),
      Number(values.get('minute')),
      Number(values.get('second')),
    )
    const difference = targetAsUtc - representedAsUtc
    if (difference === 0) return new Date(candidate)
    candidate += difference
  }

  const finalParts = new Map(formatter.formatToParts(new Date(candidate)).map((part) => [part.type, part.value]))
  const matchesTarget =
    Number(finalParts.get('year')) === date.year
    && Number(finalParts.get('month')) === date.month
    && Number(finalParts.get('day')) === date.day
    && Number(finalParts.get('hour')) === hour
    && Number(finalParts.get('minute')) === minute
  return matchesTarget ? new Date(candidate) : null
}

function addCalendarDays(
  date: { year: number; month: number; day: number },
  days: number,
): { year: number; month: number; day: number } {
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + days))
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  }
}

export function getUtcRangeForLocalDay(
  localDate: string,
  timezone: string,
): { start: Date; end: Date } | null {
  const date = parseDate(localDate)
  if (!date) return null
  const nextDate = addCalendarDays(date, 1)
  const start = localDateTimeToUtc(date, 0, timezone)
  const end = localDateTimeToUtc(nextDate, 0, timezone)
  if (!start || !end || start >= end) return null
  return { start, end }
}

export function getLocalDateForInstant(instant: Date, timezone: string): string {
  const parts = new Map(new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant).map((part) => [part.type, part.value]))
  return `${parts.get('year')}-${parts.get('month')}-${parts.get('day')}`
}

export function shouldShowStaffPicker(staffCount: number): boolean {
  return staffCount > 1
}

export function resolvePortalStaffSelection(
  staffIds: string[],
  requestedStaffId?: string,
): PortalStaffSelection {
  if (staffIds.length === 0) return { status: 'unavailable' }
  if (staffIds.length === 1) {
    if (requestedStaffId && requestedStaffId !== staffIds[0]) return { status: 'invalid' }
    return { status: 'selected', staffId: staffIds[0] }
  }
  if (!requestedStaffId) return { status: 'required' }
  return staffIds.includes(requestedStaffId)
    ? { status: 'selected', staffId: requestedStaffId }
    : { status: 'invalid' }
}

export function buildAvailableSlots(input: AvailableSlotsInput): AvailableSlot[] {
  const date = parseDate(input.date)
  const openingMinute = parseTime(input.openingTime)
  const closingMinute = parseTime(input.closingTime)
  if (
    !date
    || openingMinute === null
    || closingMinute === null
    || openingMinute >= closingMinute
    || !Number.isInteger(input.durationMinutes)
    || input.durationMinutes <= 0
    || !Number.isInteger(input.slotIntervalMinutes)
    || input.slotIntervalMinutes <= 0
    || !input.staffIds.includes(input.staffId)
  ) {
    return []
  }

  const activeAppointments = input.appointments.filter((appointment) => appointment.status !== 'CANCELLED')
  const slots: AvailableSlot[] = []
  for (
    let startMinute = openingMinute;
    startMinute + input.durationMinutes <= closingMinute;
    startMinute += input.slotIntervalMinutes
  ) {
    const start = localDateTimeToUtc(date, startMinute, input.timezone)
    const end = localDateTimeToUtc(date, startMinute + input.durationMinutes, input.timezone)
    if (!start || !end || start.getTime() < input.now.getTime()) continue

    const candidate = { startTime: start, endTime: end }
    const appointmentConflict = activeAppointments.some((appointment) => {
      if (appointment.staffId !== null && appointment.staffId !== input.staffId) return false
      return findFirstSchedulingConflict(candidate, [appointment]) !== undefined
    })
    const unavailabilityConflict = findFirstSchedulingConflict(candidate, input.unavailabilities) !== undefined
    if (!appointmentConflict && !unavailabilityConflict) {
      slots.push({ start: start.toISOString(), end: end.toISOString() })
    }
  }

  return slots
}
