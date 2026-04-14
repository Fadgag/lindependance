"use client"

import { useEffect, useState, useCallback } from 'react'
import type { Service } from '@/types/models'
import { getServicesClient } from '@/services/services.service'

export default function useServices() {
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const s = await getServicesClient()
      setServices(s)
    } catch (err: unknown) {
      setServices([])
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { services, isLoading, error, reload: load }
}

