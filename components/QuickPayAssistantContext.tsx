'use client'

import { createContext, useContext } from 'react'

export type QuickPayAssistantContextValue = {
  isOpen: boolean
  open: () => void
  close: () => void
}

const QuickPayAssistantContext = createContext<QuickPayAssistantContextValue | null>(null)

export function QuickPayAssistantProvider({
  value,
  children,
}: {
  value: QuickPayAssistantContextValue
  children: React.ReactNode
}) {
  return (
    <QuickPayAssistantContext.Provider value={value}>
      {children}
    </QuickPayAssistantContext.Provider>
  )
}

export function useQuickPayAssistant() {
  const ctx = useContext(QuickPayAssistantContext)
  if (!ctx) {
    throw new Error('useQuickPayAssistant must be used within QuickPayAssistantProvider')
  }
  return ctx
}

