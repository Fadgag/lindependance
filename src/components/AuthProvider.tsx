"use client"

import React from 'react'
import { SessionProvider } from 'next-auth/react'

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  // Disable aggressive session revalidation to avoid session drops caused by
  // frequent background refetches. This ensures the client does not race with
  // middleware or server-side session refresh.
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      {children}
    </SessionProvider>
  )
}

