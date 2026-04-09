// Types maintained for app usage (derived from prisma schema where relevant)
// Note: certaines interfaces peuvent ne pas être référencées directement par l'analyse statique
// mais sont exposées pour usage futur / correspondance Prisma. Suppression eslint locale.

/** Shape retournée par Prisma groupBy sur Appointment */
export interface AppointmentGroupRow {
  startDate: string
  _sum: { price: string | number | null }
  _count: { _all: number } | number
}

/** Shape utilisée pour l'accès à groupBy avec un runtime guard (types Prisma variables selon version) */
export type AppointmentGroupByDelegate = {
  groupBy: (opts: unknown) => Promise<AppointmentGroupRow[]>
}

export interface DashboardTimeseries {
  date: string
  realized: number
  planned: number
  revenue: number
  count: number
  target: number
}

export interface DashboardSummary {
  totalRevenue: number
  realizedRevenue: number
  projectedRevenue: number
  appointmentCount: number
  newCustomerCount: number
  staffCount: number
}

export interface DashboardData {
  summary: DashboardSummary
  timeseries: DashboardTimeseries[]
}

/** Shape d'un rendez-vous reçue par CheckoutModal (API appointments) */
export interface CheckoutAppointment {
  id: string
  startTime?: string | Date
  start?: string
  end?: string
  title?: string
  status?: string
  extras?: string | Extra[]
  note?: string
  Note?: string
  paymentMethod?: string
  finalPrice?: number
  service?: { name?: string; price?: number } | null
  customer?: { name?: string } | null
  extendedProps?: {
    status?: string
    extras?: string | Extra[]
    note?: string
    paymentMethod?: string
    finalPrice?: number
    service?: { name?: string; price?: number } | null
    customer?: { name?: string } | null
  }
}

export interface Extra {
  label: string
  price: number
}

// Summary shape used for lists and lightweight UI components
export interface AppointmentSummary {
  id: string
  start: string
  end?: string
  status?: string
  finalPrice?: number | null
  service?: { id?: string; name?: string; price?: number } | null
  customer?: { id?: string; name?: string } | null
  extendedProps?: {
    status?: string
    finalPrice?: number | null
    service?: { id?: string; name?: string; price?: number } | null
    customer?: { id?: string; name?: string } | null
    note?: string
    paymentMethod?: string
    extras?: string | Extra[]
    [key: string]: unknown
  }
}

export interface Client {
  id: string
  firstName: string
  lastName: string
  phone?: string
  Note?: string
  appointments?: CheckoutAppointment[]
}
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
  organizationId?: string | null
}

export interface Customer {
  id: string
  firstName: string
  lastName: string
  phone: string
  email?: string | null
  organizationId?: string | null
}

export interface Staff {
  id: string
  firstName: string
  lastName: string
  organizationId?: string | null
}

export interface Session {
  userId: string
  email?: string | null
  name?: string | null
  role?: string | null
  organizationId?: string | null
  [key: string]: unknown
}

// Minimal token shape returned by Auth.js / JWT used in the proxy.
// Replace earlier usages of Record<string, unknown> when narrowing token values.
export interface AuthToken {
  sub: string
  email?: string
  organizationId?: string
  // allow additional claims without widening commonly used fields
  [key: string]: unknown
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

// Minimal session / auth types used across the app
// Note: Session type is declared above and reused by imports; avoid duplicating it here.
 

