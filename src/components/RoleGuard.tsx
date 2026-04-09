"use client"

import React from 'react'
import { useSession } from 'next-auth/react'

type RoleGuardProps = {
  role: string
  children: React.ReactNode
}

export default function RoleGuard({ role, children }: RoleGuardProps) {
  const { data: session, status } = useSession()
  if (status === 'loading') return null
  if (!session?.user) return null
  const user = session.user as unknown as Record<string, unknown>
  const userRole = typeof (user.role as unknown) === 'string' ? (user.role as string) : undefined
  return (userRole === role ? <>{children}</> : null)
}

export function useIsAdmin() {
  const { data: session } = useSession()
  const user = session?.user as unknown as Record<string, unknown> | undefined
  return (user && typeof (user.role as unknown) === 'string' && (user.role as string) === 'ADMIN')
}


