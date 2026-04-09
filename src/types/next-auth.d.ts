import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: DefaultSession['user'] & {
      id: string
      organizationId?: string | null
      role?: string | null
    }
  }

  // Ensure User contains id and organizationId when returned from adapter
  interface User {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    organizationId?: string | null
    role?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string | number
    role?: string | null
    organizationId?: string | null
    [key: string]: unknown
  }
}


