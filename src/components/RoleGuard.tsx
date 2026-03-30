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
  return (session.user.role === role) ? <>{children}</> : null
}

export function useIsAdmin() {
  const { data: session } = useSession()
  return (session?.user?.role === 'ADMIN')
}

