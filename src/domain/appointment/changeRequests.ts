export function getAppointmentChangeEndTime(startTime: Date, durationMinutes: number): Date {
  if (Number.isNaN(startTime.getTime())) {
    throw new Error('Appointment change start time must be valid')
  }
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    throw new Error('Appointment service duration must be a positive integer')
  }
  return new Date(startTime.getTime() + durationMinutes * 60 * 1000)
}

export function isAppointmentChangeRequestable(input: {
  startTime: Date
  status: string
  staffId: string | null
  now: Date
}): boolean {
  return input.status !== 'CANCELLED'
    && input.startTime > input.now
    && input.staffId !== null
}

export function isAppointmentChangeStartValid(input: {
  appointmentStart: Date
  requestedStart: Date
  now: Date
}): boolean {
  return input.requestedStart > input.now
    && input.requestedStart.getTime() !== input.appointmentStart.getTime()
}

export function isAppointmentChangeApprovable(input: {
  requestStatus: string
  appointmentStatus: string
  staffId: string | null
  requestedStart: Date
  now: Date
}): boolean {
  return input.requestStatus === 'PENDING'
    && input.appointmentStatus !== 'CANCELLED'
    && input.staffId !== null
    && input.requestedStart > input.now
}
