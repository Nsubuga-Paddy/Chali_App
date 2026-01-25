'use client'

import { useMemo, useState } from 'react'
import { Bot } from 'lucide-react'
import ChatbotModal from './ChatbotModal'
import { QuickPayAssistantProvider } from './QuickPayAssistantContext'

export default function QuickPayAssistant({ hidden }: { hidden?: boolean }) {
  const [isOpen, setIsOpen] = useState(false)

  const value = useMemo(
    () => ({
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }),
    [isOpen]
  )

  // Keep modal mounted only when open; hide button when requested (e.g. inside chats)
  return (
    <QuickPayAssistantProvider value={value}>
      {!hidden && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-6 md:bottom-24 md:right-8 w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-50 animate-fade-in group"
          aria-label="Quick Payments"
        >
          <Bot size={24} className="group-hover:scale-110 transition-transform" />
        </button>
      )}

      {isOpen && <ChatbotModal />}
    </QuickPayAssistantProvider>
  )
}

