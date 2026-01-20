'use client'

import { useState } from 'react'
import { X, Zap, Droplet, Phone, Tv, GraduationCap, FileText, Users, CreditCard, Send, ArrowRight } from 'lucide-react'

interface PaymentModalProps {
  type: string
  onClose: () => void
  onComplete: (data: any) => void
  recipient?: {
    name: string
    id: string
  }
}

const serviceConfig: Record<string, any> = {
  yaka: { name: 'Yaka Electricity', icon: Zap, color: 'text-yellow-600', placeholder: 'Enter meter number' },
  water: { name: 'NWSC Water', icon: Droplet, color: 'text-blue-600', placeholder: 'Enter account number' },
  airtime: { name: 'Airtime', icon: Phone, color: 'text-green-600', placeholder: 'Enter phone number' },
  tv: { name: 'TV Subscription', icon: Tv, color: 'text-purple-600', placeholder: 'Enter decoder number' },
  school: { name: 'School Fees', icon: GraduationCap, color: 'text-pink-600', placeholder: 'Enter student ID' },
  ura: { name: 'URA Payment', icon: FileText, color: 'text-orange-600', placeholder: 'Enter TIN number' },
  send_money: { name: 'Send Money', icon: Send, color: 'text-primary-600', placeholder: '' },
}

export default function PaymentModal({ type, onClose, onComplete, recipient }: PaymentModalProps) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    account: recipient?.id || '',
    amount: '',
    network: 'MTN',
    paymentMethod: 'wallet',
  })
  const [isProcessing, setIsProcessing] = useState(false)

  const service = serviceConfig[type] || serviceConfig.yaka
  const Icon = service.icon
  const isSendMoney = type === 'send_money'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (step === 1) {
      setStep(2)
    } else {
      // Process payment
      setIsProcessing(true)
      setTimeout(() => {
        onComplete({
          service: service.name,
          account: formData.account,
          amount: parseInt(formData.amount),
          reference: `CHI${Date.now().toString().slice(-8)}`,
          timestamp: new Date(),
          recipient: recipient,
          paymentMethod: formData.paymentMethod,
        })
        setIsProcessing(false)
      }, 2000)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-gray-100 dark:bg-gray-700 ${service.color}`}>
              <Icon size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{service.name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Step {step} of 2</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {step === 1 && (
            <>
              {/* Show recipient info for Send Money */}
              {isSendMoney && recipient && (
                <div className="bg-gradient-to-br from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 rounded-2xl p-5 border-2 border-primary-200 dark:border-primary-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Sending money to</p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {recipient.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-lg">{recipient.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{recipient.id}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Account field (only for utility payments) */}
              {!isSendMoney && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Account / Number
                  </label>
                  <input
                    type="text"
                    value={formData.account}
                    onChange={(e) => setFormData({ ...formData, account: e.target.value })}
                    placeholder={service.placeholder}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
              )}

              {type === 'airtime' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Network
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['MTN', 'Airtel', 'Africell'].map((network) => (
                      <button
                        key={network}
                        type="button"
                        onClick={() => setFormData({ ...formData, network })}
                        className={`py-3 px-4 rounded-xl font-medium transition-all ${
                          formData.network === network
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {network}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount (UGX)
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="Enter amount"
                  min="1000"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              {/* Quick amounts */}
              <div className="grid grid-cols-4 gap-2">
                {[5000, 10000, 20000, 50000].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setFormData({ ...formData, amount: amount.toString() })}
                    className="py-2 px-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-primary-100 dark:hover:bg-primary-900 hover:text-primary-700 dark:hover:text-primary-300 transition-all"
                  >
                    {amount / 1000}k
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              {/* Confirmation */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 space-y-3">
                {isSendMoney && recipient ? (
                  <>
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">You're sending</p>
                      <p className="text-4xl font-bold text-primary-600 mb-3">
                        UGX {parseInt(formData.amount).toLocaleString()}
                      </p>
                      <div className="flex items-center justify-center gap-3 mt-4">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">To</p>
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {recipient.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                            <div className="text-left">
                              <p className="font-semibold text-gray-900 dark:text-white">{recipient.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{recipient.id}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Service</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{service.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Account</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{formData.account}</span>
                    </div>
                    {type === 'airtime' && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Network</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{formData.network}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg">
                      <span className="text-gray-600 dark:text-gray-400">Amount</span>
                      <span className="font-bold text-primary-600">UGX {parseInt(formData.amount).toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Payment Method
                </label>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentMethod: 'wallet' })}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                      formData.paymentMethod === 'wallet'
                        ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Zap className="text-primary-600" size={24} />
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-gray-900 dark:text-white">Chali Wallet</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Balance: UGX 150,000</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentMethod: 'momo' })}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                      formData.paymentMethod === 'momo'
                        ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Phone className="text-green-600" size={24} />
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-gray-900 dark:text-white">Mobile Money</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">MTN or Airtel Money</p>
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-3 px-6 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                disabled={isProcessing}
              >
                Back
              </button>
            )}
            <button
              type="submit"
              className="flex-1 py-3 px-6 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Processing...
                </>
              ) : step === 1 ? (
                'Continue'
              ) : (
                'Confirm Payment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

