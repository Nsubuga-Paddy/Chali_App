'use client'

import { useState } from 'react'
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, Eye, EyeOff, Receipt, TrendingUp, Send, Phone, User, X, CreditCard, Zap } from 'lucide-react'
import TransactionHistory from './TransactionHistory'

interface WalletViewProps {
  user: any
}

type RecipientType = 'chali_id' | 'mobile_money'

export default function WalletView({ user }: WalletViewProps) {
  const [balance] = useState(150000)
  const [showBalance, setShowBalance] = useState(true)
  const [showTopUpModal, setShowTopUpModal] = useState(false)
  const [topUpAmount, setTopUpAmount] = useState('')
  const [showSendMoneyModal, setShowSendMoneyModal] = useState(false)
  const [sendMoneyStep, setSendMoneyStep] = useState(1)
  const [recipientType, setRecipientType] = useState<RecipientType>('chali_id')
  const [recipientIdentifier, setRecipientIdentifier] = useState('')
  const [sendAmount, setSendAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'momo'>('wallet')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleTopUp = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle top-up logic here
    alert(`Top-up of UGX ${parseInt(topUpAmount).toLocaleString()} initiated!`)
    setShowTopUpModal(false)
    setTopUpAmount('')
  }

  const handleOpenSendMoney = () => {
    setShowSendMoneyModal(true)
    setSendMoneyStep(1)
    setRecipientType('chali_id')
    setRecipientIdentifier('')
    setSendAmount('')
    setPaymentMethod('wallet')
  }

  const handleSendMoneyContinue = (e: React.FormEvent) => {
    e.preventDefault()
    if (sendMoneyStep === 1) {
      setSendMoneyStep(2)
    } else {
      // Process transaction
      setIsProcessing(true)
      setTimeout(() => {
        alert(`Successfully sent UGX ${parseInt(sendAmount).toLocaleString()} to ${recipientType === 'chali_id' ? 'Chali ID' : 'Mobile Money'}: ${recipientIdentifier}`)
        setShowSendMoneyModal(false)
        setIsProcessing(false)
        // Reset form
        setSendMoneyStep(1)
        setRecipientIdentifier('')
        setSendAmount('')
      }, 2000)
    }
  }

  const handleCloseSendMoney = () => {
    setShowSendMoneyModal(false)
    setSendMoneyStep(1)
    setRecipientIdentifier('')
    setSendAmount('')
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 rounded-3xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Wallet size={24} />
              <span className="text-sm font-medium opacity-90">Chali Wallet</span>
            </div>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              {showBalance ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
          </div>

          <div className="mb-6">
            <p className="text-sm opacity-80 mb-1">Available Balance</p>
            <h2 className="text-4xl font-bold">
              {showBalance ? `UGX ${balance.toLocaleString()}` : '••••••'}
            </h2>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowTopUpModal(true)}
              className="flex-1 bg-white text-primary-700 py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-100 transition-all"
            >
              <Plus size={20} />
              Top Up
            </button>
            <button 
              onClick={handleOpenSendMoney}
              className="flex-1 bg-white/10 backdrop-blur text-white py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-white/20 transition-all"
            >
              <ArrowUpRight size={20} />
              Send
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <ArrowDownLeft className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">This Month</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">UGX 450k</p>
              </div>
            </div>
            <p className="text-xs text-green-600 font-medium">↑ 12% from last month</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Receipt className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Transactions</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">28</p>
              </div>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">In the last 30 days</p>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h3>
          </div>
          <TransactionHistory />
        </div>
      </div>

      {/* Top-Up Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-slide-up">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Top Up Wallet</h2>
            
            <form onSubmit={handleTopUp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount (UGX)
                </label>
                <input
                  type="number"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  placeholder="Enter amount"
                  min="1000"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[10000, 20000, 50000, 100000].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setTopUpAmount(amount.toString())}
                    className="py-2 px-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-primary-100 dark:hover:bg-primary-900 hover:text-primary-700 dark:hover:text-primary-300 transition-all"
                  >
                    {amount / 1000}k
                  </button>
                ))}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTopUpModal(false)}
                  className="flex-1 py-3 px-6 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-6 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold transition-all"
                >
                  Top Up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Money Modal */}
      {showSendMoneyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up">
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary-100 dark:bg-primary-900 text-primary-600">
                  <Send size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Send Money</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Step {sendMoneyStep} of 2</p>
                </div>
              </div>
              <button
                onClick={handleCloseSendMoney}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSendMoneyContinue} className="p-6 space-y-6">
              {sendMoneyStep === 1 && (
                <>
                  {/* Recipient Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Send to
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRecipientType('chali_id')}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          recipientType === 'chali_id'
                            ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div className={`p-3 rounded-full ${
                            recipientType === 'chali_id'
                              ? 'bg-primary-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          }`}>
                            <User size={24} />
                          </div>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">Chali ID</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 text-center">Registered users</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRecipientType('mobile_money')}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          recipientType === 'mobile_money'
                            ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div className={`p-3 rounded-full ${
                            recipientType === 'mobile_money'
                              ? 'bg-primary-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          }`}>
                            <Phone size={24} />
                          </div>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">Mobile Money</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 text-center">Any number</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Recipient Identifier */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {recipientType === 'chali_id' ? 'Chali ID or Phone Number' : 'Mobile Money Number'}
                    </label>
                    <input
                      type="text"
                      value={recipientIdentifier}
                      onChange={(e) => setRecipientIdentifier(e.target.value)}
                      placeholder={recipientType === 'chali_id' ? 'e.g., @username or 0700123456' : 'e.g., 0700123456'}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      required
                    />
                    {recipientType === 'chali_id' && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        💡 Enter a Chali ID (starts with @) or registered phone number
                      </p>
                    )}
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Amount (UGX)
                    </label>
                    <input
                      type="number"
                      value={sendAmount}
                      onChange={(e) => setSendAmount(e.target.value)}
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
                        onClick={() => setSendAmount(amount.toString())}
                        className="py-2 px-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-primary-100 dark:hover:bg-primary-900 hover:text-primary-700 dark:hover:text-primary-300 transition-all"
                      >
                        {amount / 1000}k
                      </button>
                    ))}
                  </div>
                </>
              )}

              {sendMoneyStep === 2 && (
                <>
                  {/* Confirmation */}
                  <div className="bg-gradient-to-br from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 rounded-2xl p-6 text-center border-2 border-primary-200 dark:border-primary-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">You're sending</p>
                    <p className="text-4xl font-bold text-primary-600 mb-4">
                      UGX {parseInt(sendAmount).toLocaleString()}
                    </p>
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">To:</span>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-full">
                        {recipientType === 'chali_id' ? (
                          <User size={16} className="text-primary-600" />
                        ) : (
                          <Phone size={16} className="text-green-600" />
                        )}
                        <span className="font-semibold text-gray-900 dark:text-white">{recipientIdentifier}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Payment Method
                    </label>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('wallet')}
                        className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                          paymentMethod === 'wallet'
                            ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <Zap className="text-primary-600" size={24} />
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-gray-900 dark:text-white">Chali Wallet</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Balance: UGX {balance.toLocaleString()}</p>
                        </div>
                        {paymentMethod === 'wallet' && (
                          <div className="w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('momo')}
                        className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                          paymentMethod === 'momo'
                            ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <Phone className="text-green-600" size={24} />
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-gray-900 dark:text-white">Mobile Money</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">MTN or Airtel Money</p>
                        </div>
                        {paymentMethod === 'momo' && (
                          <div className="w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                {sendMoneyStep === 2 && (
                  <button
                    type="button"
                    onClick={() => setSendMoneyStep(1)}
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
                  ) : sendMoneyStep === 1 ? (
                    'Continue'
                  ) : (
                    'Send Money'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

