declare module '@fullcalendar/react' {
  import * as React from 'react'
  const FullCalendar: React.ComponentType<Record<string, unknown>>
  export default FullCalendar
}

declare module '@fullcalendar/resource-timegrid' {
  const resourceTimeGridPlugin: unknown
  export default resourceTimeGridPlugin
}

declare module '@fullcalendar/interaction' {
  const interactionPlugin: unknown
  export default interactionPlugin
}

declare module '@shadcn/ui' {
  export const Button: unknown
}

// Note: do NOT declare '@prisma/client' here — use the real types from the package.
// This file keeps shims only for packages that lack types (fullcalendar, shadcn UI).


