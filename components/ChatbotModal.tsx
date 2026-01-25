'use client'

import { useMemo, useState } from 'react'
import { Search, X, Zap, Droplet, Phone, Tv, GraduationCap, FileText, CheckCircle2 } from 'lucide-react'
import PaymentModal from './PaymentModal'
import { useQuickPayAssistant } from './QuickPayAssistantContext'

type ServiceId = 'yaka' | 'water' | 'airtime' | 'tv' | 'school' | 'ura'

const SERVICES: Array<{
  id: ServiceId
  label: string
  description: string
  icon: any
  badgeColor: string
}> = [
  {
    id: 'yaka',
    label: 'Yaka Electricity',
    description: 'Buy tokens using meter number',
    icon: Zap,
    badgeColor: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  },
  {
    id: 'water',
    label: 'NWSC Water',
    description: 'Pay bill using account number',
    icon: Droplet,
    badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  },
  {
    id: 'airtime',
    label: 'Airtime',
    description: 'Buy airtime for MTN/Airtel/Africell',
    icon: Phone,
    badgeColor: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  },
  {
    id: 'tv',
    label: 'TV Subscription',
    description: 'Pay using decoder / smartcard number',
    icon: Tv,
    badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  },
  {
    id: 'school',
    label: 'School Fees',
    description: 'Pay using student ID / reference',
    icon: GraduationCap,
    badgeColor: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
  },
  {
    id: 'ura',
    label: 'URA Payment',
    description: 'Pay taxes using TIN number',
    icon: FileText,
    badgeColor: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  },
]

export default function ChatbotModal() {
  const { close } = useQuickPayAssistant()
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentType, setPaymentType] = useState<ServiceId>('yaka')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [lastPayment, setLastPayment] = useState<any | null>(null)

  const filteredServices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return SERVICES
    return SERVICES.filter((s) => {
      const hay = `${s.label} ${s.description} ${s.id}`.toLowerCase()
      return hay.includes(q)
    })
  }, [searchQuery])

  const handleSelectService = (serviceId: ServiceId) => {
    setPaymentType(serviceId)
    setShowPaymentModal(true)
  }

  const handlePaymentComplete = (paymentData: any) => {
    setLastPayment(paymentData)
    setShowPaymentModal(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center">
      <div className="bg-white dark:bg-gray-900 w-full md:w-[500px] md:h-[600px] h-[80vh] md:rounded-2xl flex flex-col shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 md:rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Chali Assistant</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Quick payments & services</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSearchOpen((v) => !v)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              aria-label="Search services"
              title="Search"
            >
              <Search size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={close}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              aria-label="Close"
            >
              <X size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Search */}
        {isSearchOpen && (
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search a service (e.g. yaka, water, airtime)"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 border-none outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Top helper + last payment */}
          <div className="mb-4">
            <div className="bg-gradient-to-br from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border border-primary-100 dark:border-primary-800 rounded-2xl p-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Select a service to pay for
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Tap the search icon to quickly find a service.
              </p>
            </div>
          </div>

          {lastPayment && (
            <div className="mb-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 size={22} className="text-green-700 dark:text-green-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-gray-900 dark:text-white">Payment successful</p>
                    <button
                      onClick={() => setLastPayment(null)}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      Dismiss
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">
                    {lastPayment.service}: UGX {Number(lastPayment.amount).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Account: {lastPayment.account} • Ref: {lastPayment.reference}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Services list */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                SERVICES
              </p>
            </div>

            {filteredServices.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  No services found
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Try a different search term.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredServices.map((service) => {
                  const Icon = service.icon
                  return (
                    <button
                      key={service.id}
                      onClick={() => handleSelectService(service.id)}
                      className="w-full px-4 py-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors text-left"
                    >
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${service.badgeColor}`}>
                        <Icon size={22} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">
                          {service.label}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {service.description}
                        </p>
                      </div>
                      <div className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                        Pay
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Payment Modal */}
        {showPaymentModal && (
          <PaymentModal
            type={paymentType}
            onClose={() => setShowPaymentModal(false)}
            onComplete={handlePaymentComplete}
          />
        )}
      </div>
    </div>
  )
}
