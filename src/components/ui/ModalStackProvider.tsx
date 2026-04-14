"use client"

import React from "react"

type ModalStackContextValue = {
  stack: string[]
  push: (id: string) => void
  pop: (id: string) => void
}

const ModalStackContext = React.createContext<ModalStackContextValue | null>(null)

export function ModalStackProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = React.useState<string[]>([])

  const push = React.useCallback((id: string) => {
    setStack((s) => (s.includes(id) ? s : [...s, id]))
  }, [])

  const pop = React.useCallback((id: string) => {
    setStack((s) => s.filter((x) => x !== id))
  }, [])

  const value = React.useMemo(() => ({ stack, push, pop }), [stack, push, pop])

  return <ModalStackContext.Provider value={value}>{children}</ModalStackContext.Provider>
}

// Hook used by modals
export function useModalStack(modalId: string) {
  const ctx = React.useContext(ModalStackContext)
  if (!ctx) {
    throw new Error("useModalStack must be used within a ModalStackProvider")
  }

  const { stack, push, pop } = ctx

  const index = stack.indexOf(modalId)
  const isTop = index === stack.length - 1 && index !== -1

  const BASE = 9998
  const zIndex = index === -1 ? BASE : BASE + index * 2 + 1 // content zIndex

  return {
    registerOpen: () => push(modalId),
    registerClose: () => pop(modalId),
    isTop,
    index,
    zIndex,
  }
}

