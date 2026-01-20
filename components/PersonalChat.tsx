'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, ArrowLeft, Phone, Video, MoreVertical, Mic, MicOff, DollarSign, Zap, MessageCircle } from 'lucide-react'
import PaymentModal from './PaymentModal'
import { 
  sendMessage, 
  subscribeToMessages, 
  markMessagesAsRead, 
  subscribeToUserStatus,
  updateOnlineStatus,
  getChatId,
  type ChatMessage 
} from '@/lib/chatService'

interface Message {
  id: string
  type: 'sent' | 'received'
  content: string
  timestamp: Date
  status?: 'sent' | 'delivered' | 'read'
}

interface Contact {
  id: string
  name: string
  avatar?: string
  online?: boolean
  type: 'personal' | 'customercare'
}

interface PersonalChatProps {
  contact: Contact
  onBack: () => void
  user: any
}

export default function PersonalChat({ contact, onBack, user }: PersonalChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [isOnline, setIsOnline] = useState(contact.online || false)
  const [isLoading, setIsLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatId = getChatId(user.id || user.email, contact.id)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Subscribe to Firebase messages
  useEffect(() => {
    setIsLoading(true)
    
    // Subscribe to messages
    const unsubscribeMessages = subscribeToMessages(chatId, (firebaseMessages) => {
      const formattedMessages: Message[] = firebaseMessages.map(msg => ({
        id: msg.id || '',
        type: msg.senderId === (user.id || user.email) ? 'sent' : 'received',
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        status: msg.status
      }))
      setMessages(formattedMessages)
      setIsLoading(false)
      
      // Mark messages as read
      markMessagesAsRead(chatId, user.id || user.email)
    })

    // Subscribe to contact's online status
    const unsubscribeStatus = subscribeToUserStatus(contact.id, (online, lastSeen) => {
      setIsOnline(online)
    })

    // Update our own status
    updateOnlineStatus(user.id || user.email, true)

    // Cleanup
    return () => {
      unsubscribeMessages()
      unsubscribeStatus()
      updateOnlineStatus(user.id || user.email, false)
    }
  }, [chatId, contact.id, user.id, user.email])

  const handleSendMessage = async () => {
    const messageText = inputValue.trim()
    if (!messageText) return

    setInputValue('') // Clear input immediately for better UX

    try {
      // Send message to Firebase
      await sendMessage(
        user.id || user.email,
        contact.id,
        messageText,
        'text'
      )
    } catch (error) {
      console.error('Error sending message:', error)
      // Optionally show error to user
      alert('Failed to send message. Please try again.')
    }
  }

  const handleVoiceToggle = () => {
    if (!isRecording) {
      setIsRecording(true)
      setTimeout(() => {
        setIsRecording(false)
        setInputValue('Voice message recorded')
      }, 3000)
    } else {
      setIsRecording(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handlePaymentComplete = async (paymentData: any) => {
    // Create proper message for money transfer
    const paymentContent = `💸 Sent you UGX ${paymentData.amount.toLocaleString()}\nPayment Method: ${paymentData.paymentMethod === 'wallet' ? 'Chali Wallet' : 'Mobile Money'}\nRef: ${paymentData.reference}`
    
    try {
      // Send payment message to Firebase
      await sendMessage(
        user.id || user.email,
        contact.id,
        paymentContent,
        'payment'
      )
      setShowPaymentModal(false)
    } catch (error) {
      console.error('Error sending payment message:', error)
      alert('Failed to send payment notification. Please try again.')
    }
  }

  return (
    <div className="h-full w-full flex flex-col bg-gray-50 dark:bg-gray-900 relative">
      {/* Chat Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 relative z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                {getInitials(contact.name)}
              </div>
              {contact.online && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
              )}
            </div>

            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">{contact.name}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isOnline ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPaymentModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-full transition-all"
            >
              <DollarSign size={18} />
              <span className="text-sm font-medium">Send Money</span>
            </button>
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
              <Phone size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
              <Video size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
              <MoreVertical size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-500 dark:text-gray-400">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageCircle size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No messages yet</p>
              <p className="text-sm text-gray-400">Send a message to start chatting</p>
            </div>
          </div>
        ) : (
          messages.map((message, index) => {
          const showTimestamp = 
            index === 0 || 
            messages[index - 1].timestamp.getTime() - message.timestamp.getTime() > 300000
          
          return (
            <div key={message.id}>
              {showTimestamp && (
                <div className="flex justify-center my-4">
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded-full">
                    {message.timestamp.toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              )}
              
              <div className={`flex ${message.type === 'sent' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] md:max-w-[60%] rounded-2xl px-4 py-2 ${
                    message.type === 'sent'
                      ? 'bg-primary-600 text-white rounded-br-sm'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm shadow-sm'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span
                      className={`text-xs ${
                        message.type === 'sent' ? 'text-primary-100' : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {message.type === 'sent' && (
                      <span className="text-primary-100 text-xs">
                        {message.status === 'sent' && '✓'}
                        {message.status === 'delivered' && '✓✓'}
                        {message.status === 'read' && <span className="text-blue-300">✓✓</span>}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 relative z-20">
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
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-primary-600 hover:text-primary-700 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              <Send size={20} />
            </button>
          </div>

          <button
            onClick={handleVoiceToggle}
            className={`p-3 rounded-full transition-all ${
              isRecording
                ? 'bg-red-500 text-white pulse'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
          </button>
        </div>

        {isRecording && (
          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2 animate-pulse">
            Recording voice message...
          </p>
        )}
      </div>


      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          type="send_money"
          recipient={{
            name: contact.name,
            id: contact.id
          }}
          onClose={() => setShowPaymentModal(false)}
          onComplete={handlePaymentComplete}
        />
      )}
    </div>
  )
}

