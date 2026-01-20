'use client'

import { useState } from 'react'
import { MessageCircle, Wallet, User, Menu, X, Bot, Phone } from 'lucide-react'
import Chat from './Chat'
import WalletView from './WalletView'
import Profile from './Profile'
import ChatbotModal from './ChatbotModal'
import AdminCallHistory from './AdminCallHistory'

interface MainAppProps {
  user: any
  onLogout: () => void
}

type View = 'chat' | 'wallet' | 'profile' | 'admin'

export default function MainApp({ user, onLogout }: MainAppProps) {
  const [currentView, setCurrentView] = useState<View>('chat')
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showChatbot, setShowChatbot] = useState(false)
  const [isInChatView, setIsInChatView] = useState(false)

  const navigation = [
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'admin', label: 'Admin', icon: Phone },
    { id: 'profile', label: 'Profile', icon: User },
  ]

  const handleViewChange = (view: View) => {
    setCurrentView(view)
    // Reset chat state when switching away from chat view
    if (view !== 'chat') {
      setIsInChatView(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Chali</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Your payment assistant</p>
          </div>
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center gap-2">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => handleViewChange(item.id as View)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                  currentView === item.id
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </header>

      {/* Mobile navigation */}
      {showMobileMenu && (
        <div className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 animate-slide-up">
          <nav className="flex flex-col p-2">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    handleViewChange(item.id as View)
                    setShowMobileMenu(false)
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                    currentView === item.id
                      ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-hidden relative">
        {currentView === 'chat' && <Chat user={user} onChatStateChange={setIsInChatView} />}
        {currentView === 'wallet' && <WalletView user={user} />}
        {currentView === 'admin' && <AdminCallHistory />}
        {currentView === 'profile' && <Profile user={user} onLogout={onLogout} />}

        {/* Floating Chatbot Button - Only show when NOT in a chat conversation */}
        {!isInChatView && (
          <>
            <button
              onClick={() => setShowChatbot(true)}
              className="fixed bottom-20 right-6 md:bottom-24 md:right-8 w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-50 animate-fade-in group"
              aria-label="Quick Payments Chatbot"
            >
              <Bot size={24} className="group-hover:scale-110 transition-transform" />
            </button>

            {/* Chatbot Modal */}
            {showChatbot && <ChatbotModal onClose={() => setShowChatbot(false)} />}
          </>
        )}
      </main>

      {/* Bottom navigation for mobile */}
      <nav className="md:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-around py-2 px-2">
        {navigation.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => handleViewChange(item.id as View)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                currentView === item.id
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <Icon size={24} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

