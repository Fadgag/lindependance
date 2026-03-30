// Types generated/derived from prisma/schema.prisma (manually maintained)
export interface Organization {
  id: string
  name: string
}

export interface Service {
  id: string
  name: string
  durationMinutes: number
  price: number
  color?: string | null
  organizationId: string
}

export interface Customer {
  id: string
  firstName: string
  lastName: string
  phone: string
  organizationId: string
}

export interface Staff {
  id: string
  firstName: string
  lastName: string
  organizationId: string
}

export interface Appointment {
  id: string
  title?: string | null
  startTime: Date
  endTime: Date
  duration: number
  serviceId: string
  customerId: string
  staffId: string
  organizationId: string
  createdAt: Date
  updatedAt: Date
}

export type InitialAppointmentData = Partial<{
  id: string
  title: string
  start: string
  end: string
  serviceId: string
  customerId: string
  staffId: string
  duration: number
  extendedProps: Record<string, unknown>
  resourceId: string
}>

