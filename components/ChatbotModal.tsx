'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, X, Zap, Droplet, Phone, Tv, GraduationCap, FileText } from 'lucide-react'
import PaymentModal from './PaymentModal'

interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  paymentData?: any
}

interface ChatbotModalProps {
  onClose: () => void
}

const quickActions = [
  { id: 'yaka', label: 'Yaka', icon: Zap, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
  { id: 'water', label: 'Water', icon: Droplet, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  { id: 'airtime', label: 'Airtime', icon: Phone, color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  { id: 'tv', label: 'TV', icon: Tv, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
  { id: 'school', label: 'School', icon: GraduationCap, color: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300' },
  { id: 'ura', label: 'URA', icon: FileText, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
]

export default function ChatbotModal({ onClose }: ChatbotModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: '👋 Hi! I\'m your Chali assistant. I can help you pay for utilities, buy airtime, and much more. What would you like to do today?',
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentType, setPaymentType] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = (text?: string) => {
    const messageText = text || inputValue.trim()
    if (!messageText) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: messageText,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setIsTyping(true)

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = generateAIResponse(messageText)
      setMessages((prev) => [...prev, aiResponse])
      setIsTyping(false)
    }, 1000 + Math.random() * 1000)
  }

  const generateAIResponse = (userMessage: string): Message => {
    const lower = userMessage.toLowerCase()
    
    // Payment detection
    if (lower.includes('yaka') || lower.includes('electricity')) {
      return {
        id: Date.now().toString(),
        type: 'ai',
        content: 'I can help you pay for Yaka electricity. How much would you like to purchase?',
        timestamp: new Date(),
      }
    }
    
    if (lower.includes('water') || lower.includes('nwsc')) {
      return {
        id: Date.now().toString(),
        type: 'ai',
        content: 'I can help you pay your NWSC water bill. What\'s your account number?',
        timestamp: new Date(),
      }
    }
    
    if (lower.includes('airtime')) {
      return {
        id: Date.now().toString(),
        type: 'ai',
        content: 'Sure! Which network would you like to buy airtime for? (MTN, Airtel, or Africell)',
        timestamp: new Date(),
      }
    }
    
    if (lower.includes('history') || lower.includes('transactions')) {
      return {
        id: Date.now().toString(),
        type: 'ai',
        content: 'Here are your recent transactions:\n\n📱 MTN Airtime - UGX 5,000 (Today)\n⚡ Yaka - UGX 20,000 (Yesterday)\n💧 NWSC Water - UGX 15,000 (3 days ago)',
        timestamp: new Date(),
      }
    }

    // Check if message contains amount
    if (lower.match(/\d+[,\d]*/) && (lower.includes('ugx') || lower.includes('shilling') || lower.includes('000'))) {
      setTimeout(() => {
        setShowPaymentModal(true)
        // Detect payment type from conversation
        const type = lower.includes('yaka') ? 'yaka' 
          : lower.includes('water') ? 'water'
          : lower.includes('airtime') ? 'airtime'
          : lower.includes('tv') ? 'tv'
          : 'custom'
        setPaymentType(type)
      }, 1000)
      return {
        id: Date.now().toString(),
        type: 'ai',
        content: 'I\'ll help you process that payment right away! Please confirm the details in the payment window.',
        timestamp: new Date(),
      }
    }

    // Default response
    return {
      id: Date.now().toString(),
      type: 'ai',
      content: 'I understand you\'re asking about: "' + userMessage + '". I can help with payments for Yaka, Water, Airtime, TV subscriptions, School fees, and more. What would you like to do?',
      timestamp: new Date(),
    }
  }

  const handleQuickAction = (actionId: string) => {
    setPaymentType(actionId)
    setShowPaymentModal(true)
  }

  const handlePaymentComplete = (paymentData: any) => {
    const confirmationMessage: Message = {
      id: Date.now().toString(),
      type: 'ai',
      content: `✅ Payment successful!\n\n${paymentData.service}: UGX ${paymentData.amount.toLocaleString()}\nAccount: ${paymentData.account}\nReference: ${paymentData.reference}\n\nYou'll receive a confirmation SMS shortly.`,
      timestamp: new Date(),
      paymentData,
    }
    setMessages((prev) => [...prev, confirmationMessage])
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
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all hover:shadow-md ${action.color}`}
                >
                  <Icon size={18} />
                  <span className="text-sm">{action.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} chat-bubble-${message.type}`}
            >
              <div
                className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-4 py-3 ${
                  message.type === 'user'
                    ? 'bg-primary-600 text-white rounded-br-sm'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm shadow-sm'
                }`}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                <p
                  className={`text-xs mt-1 ${
                    message.type === 'user' ? 'text-primary-100' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 md:rounded-b-2xl">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a message..."
                className="w-full px-4 py-3 pr-12 rounded-full bg-gray-100 dark:bg-gray-700 border-none outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-primary-600 hover:text-primary-700 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                <Send size={20} />
              </button>
            </div>
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
