"use client"

import { useEffect, useState, useCallback } from 'react'
import type { Customer } from '@/types/models'
import { getCustomersClient } from '@/services/customers.service'

export default function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const c = await getCustomersClient()
      setCustomers(c)
    } catch (err: unknown) {
      setCustomers([])
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { customers, isLoading, error, reload: load }
}

