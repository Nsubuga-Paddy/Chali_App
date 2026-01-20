'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, ArrowLeft, Building2, Zap, Droplet, Phone, Tv, Clock, CheckCircle, Sparkles, Bot, PhoneCall } from 'lucide-react'
import { generateAIResponse } from '@/lib/openaiChatService'
import { getQuickStartSuggestions } from '@/lib/chatbotService'
import VoiceCall from './VoiceCall'
import { stripMarkdown } from '@/lib/textFormatter'
import { 
  loadCustomerCareChatHistory, 
  saveCustomerCareMessage 
} from '@/lib/customerCareChatService'

interface Message {
  id: string
  type: 'user' | 'agent'
  content: string
  timestamp: Date
  quickReplies?: string[]
  provider?: string // Track which AI provider was used
  source?: string // Track if it was RAG or regular
  isCallSummary?: boolean // Indicates this is a voice call summary
  callData?: {
    summary: string
    duration: string
    timestamp: Date
    fullTranscript?: Array<{
      userMessage: string
      aiResponse: string
      timestamp: Date
    }>
  }
}

interface Contact {
  id: string
  name: string
  company?: string
  type: 'personal' | 'customercare'
}

interface CustomerCareChatProps {
  contact: Contact
  onBack: () => void
  user: any
}

const companyData: Record<string, { color: string; icon: any; services: string[] }> = {
  'UEDCL': { 
    color: 'from-yellow-500 to-orange-600', 
    icon: Zap,
    services: ['Yaka tokens', 'Postpaid bills', 'Meter issues', 'Power outages']
  },
  'NWSC': { 
    color: 'from-blue-500 to-cyan-600', 
    icon: Droplet,
    services: ['Water bills', 'Meter readings', 'Reconnections', 'New connections']
  },
  'MTN': { 
    color: 'from-yellow-400 to-yellow-600', 
    icon: Phone,
    services: ['Airtime', 'Data bundles', 'MoMo services', 'SIM issues']
  },
  'Airtel': { 
    color: 'from-red-500 to-red-700', 
    icon: Phone,
    services: ['Airtime', 'Data bundles', 'Airtel Money', 'Network issues']
  },
  'DStv': { 
    color: 'from-blue-600 to-blue-800', 
    icon: Tv,
    services: ['Subscription', 'Decoder issues', 'Package upgrade', 'Account help']
  },
  'URA': { 
    color: 'from-green-500 to-green-700', 
    icon: Building2,
    services: ['Tax filing', 'Tax inquiries', 'TIN registration', 'Tax payments']
  },
}

export default function CustomerCareChat({ contact, onBack, user }: CustomerCareChatProps) {
  const company = contact.company || 'Support'
  const companyInfo = companyData[company] || { color: 'from-gray-500 to-gray-700', icon: Building2, services: [] }
  const Icon = companyInfo.icon

  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isLoadingKB, setIsLoadingKB] = useState(true)
  const [currentProvider, setCurrentProvider] = useState<string>('loading')
  const [isVoiceCallActive, setIsVoiceCallActive] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Get user ID for chat history
  const userId = user?.id || user?.email || 'anonymous'

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load chat history and initial data on mount
  useEffect(() => {
    const loadHistoryAndInitialData = async () => {
      setIsLoadingHistory(true)
      setIsLoadingKB(true)
      
      try {
        // Load history and suggestions in parallel for faster loading
        const [history, suggestions] = await Promise.all([
          loadCustomerCareChatHistory(userId, company, 100, 5000), // 5 second timeout
          getQuickStartSuggestions(company)
        ])
        
        if (history.length > 0) {
          // Convert history messages to Message format
          const formattedHistory: Message[] = history.map(msg => ({
            id: msg.id || `msg_${Date.now()}_${Math.random()}`,
            type: msg.type === 'user' ? 'user' : 'agent',
            content: msg.content,
            timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
            quickReplies: msg.quickReplies,
            provider: msg.provider,
            source: msg.source,
            isCallSummary: msg.isCallSummary,
            callData: msg.callData
          }))
          setMessages(formattedHistory)
          setIsLoadingHistory(false) // Hide loading once messages are shown
        } else {
          // No history - show welcome message immediately
          const welcomeMessage: Message = {
            id: 'welcome',
            type: 'agent',
            content: `Hello ${user.name}! 👋 Welcome to ${company} AI-powered customer support. I'm here to help you with any questions about our products and services. What would you like to know?`,
            timestamp: new Date(),
            quickReplies: suggestions.length > 0 ? suggestions : companyInfo.services.slice(0, 4)
          }
          setMessages([welcomeMessage])
          setIsLoadingHistory(false) // Hide loading immediately
          
          // Save welcome message to history in background (don't wait)
          saveCustomerCareMessage(userId, company, {
            type: 'agent',
            content: welcomeMessage.content,
            timestamp: welcomeMessage.timestamp,
            quickReplies: welcomeMessage.quickReplies
          }).catch(error => {
            console.error('Error saving welcome message:', error)
          })
        }
      } catch (error) {
        console.error('Error loading chat history:', error)
        // Fallback to welcome message on error - load suggestions quickly
        const suggestions = await getQuickStartSuggestions(company)
        setMessages([{
          id: 'welcome',
          type: 'agent',
          content: `Hello ${user.name}! 👋 Welcome to ${company} AI-powered customer support. I'm here to help you with any questions about our products and services. What would you like to know?`,
          timestamp: new Date(),
          quickReplies: suggestions.length > 0 ? suggestions : companyInfo.services.slice(0, 4)
        }])
      } finally {
        setIsLoadingHistory(false)
        setIsLoadingKB(false)
      }
    }

    loadHistoryAndInitialData()
  }, [userId, company, user.name, companyInfo.services])

  // Format call summary for display
  const formatCallSummary = (callData: {
    summary: string
    duration: string
    timestamp: Date
    fullTranscript?: Array<{
      userMessage: string
      aiResponse: string
      timestamp: Date
    }>
  }) => {
    const dateStr = callData.timestamp.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    
    let summaryText = `📞 Voice Call Summary\n\n` +
      `⏱️ Duration: ${callData.duration}\n` +
      `📅 Date: ${dateStr}\n\n` +
      `📋 Summary:\n${callData.summary}`
    
    // Add full transcript if available
    if (callData.fullTranscript && callData.fullTranscript.length > 0) {
      summaryText += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
      summaryText += `📝 Complete Conversation Transcript:\n\n`
      summaryText += `This is the full conversation for your reference. You can refer back to any solution or information provided during the call.\n\n`
      
      callData.fullTranscript.forEach((exchange, index) => {
        const timeStr = exchange.timestamp.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
        
        summaryText += `💬 [${timeStr}] Your Question:\n${exchange.userMessage}\n\n`
        summaryText += `🤖 [${timeStr}] Agent Response:\n${exchange.aiResponse}\n\n`
        
        if (index < callData.fullTranscript!.length - 1) {
          summaryText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
        }
      })
    }
    
    return summaryText
  }

  const handleSendMessage = async (text?: string) => {
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
    
    // Save user message to history
    try {
      await saveCustomerCareMessage(userId, company, {
        type: 'user',
        content: messageText,
        timestamp: userMessage.timestamp
      })
    } catch (error) {
      console.error('Error saving user message:', error)
    }

    try {
      // Get AI-powered response (ElevenLabs primary, OpenAI fallback)
      const response = await generateAIResponse(company, messageText, messages)
      
      // Update current provider
      if (response.provider) {
        setCurrentProvider(response.provider)
      }
      
      // Strip markdown formatting from response
      const cleanedResponse = stripMarkdown(response.response)
      
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'agent',
        content: cleanedResponse,
        timestamp: new Date(),
        quickReplies: response.quickReplies,
        provider: response.provider,
        source: response.source
      }

      // Simulate typing delay for better UX (shorter for AI since it's faster)
      setTimeout(async () => {
        setMessages((prev) => [...prev, agentMessage])
        setIsTyping(false)
        
        // Save agent message to history
        try {
          await saveCustomerCareMessage(userId, company, {
            type: 'agent',
            content: cleanedResponse,
            timestamp: agentMessage.timestamp,
            quickReplies: response.quickReplies,
            provider: response.provider,
            source: response.source
          })
        } catch (error) {
          console.error('Error saving agent message:', error)
        }
      }, 800)
    } catch (error) {
      console.error('Error generating response:', error)
      
      // Fallback response on error
      const fallbackMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'agent',
        content: `I'm here to help with ${company} services! Please try rephrasing your question, or contact our support team for immediate assistance.`,
        timestamp: new Date(),
        quickReplies: companyInfo.services.slice(0, 4)
      }
      
      setTimeout(async () => {
        setMessages((prev) => [...prev, fallbackMessage])
        setIsTyping(false)
        
        // Save fallback message to history
        try {
          await saveCustomerCareMessage(userId, company, {
            type: 'agent',
            content: fallbackMessage.content,
            timestamp: fallbackMessage.timestamp,
            quickReplies: fallbackMessage.quickReplies,
            source: 'fallback'
          })
        } catch (error) {
          console.error('Error saving fallback message:', error)
        }
      }, 1000)
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
            
            <div className={`w-10 h-10 bg-gradient-to-br ${companyInfo.color} rounded-full flex items-center justify-center text-white`}>
              <Icon size={20} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-gray-900 dark:text-white">{contact.name}</h2>
                <span className="px-2 py-0.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-[10px] font-bold rounded-full flex items-center gap-1">
                  <Sparkles size={10} />
                  AI
                </span>
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <CheckCircle size={12} />
                <span>
                  Available 24/7 • {
                    currentProvider === 'loading' ? 'Initializing...' :
                    currentProvider === 'elevenlabs' ? 'Powered by ElevenLabs + RAG' :
                    currentProvider === 'openai' ? 'Powered by GPT-4 + RAG' :
                    currentProvider === 'fallback' ? 'Fallback Mode' :
                    'AI Powered'
                  }
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsVoiceCallActive(true)}
              className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors flex items-center gap-2"
              title="Start voice call"
            >
              <PhoneCall size={18} />
              <span className="text-xs font-medium hidden sm:inline">Call</span>
            </button>
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Clock size={14} />
            <span>Instant reply</span>
          </div>
        </div>
      </div>
      </div>

      {/* Voice Call Modal */}
      {isVoiceCallActive && (
        <VoiceCall
          company={company}
          onEndCall={async (callData) => {
            setIsVoiceCallActive(false)
            
            // Add summary to chat if available
            if (callData?.summary) {
              const summaryMessage: Message = {
                id: `call-summary-${Date.now()}`,
                type: 'agent',
                content: formatCallSummary({
                  summary: callData.summary,
                  duration: callData.duration,
                  timestamp: callData.timestamp,
                  fullTranscript: callData.fullTranscript
                }),
                timestamp: callData.timestamp,
                isCallSummary: true,
                callData: {
                  summary: callData.summary,
                  duration: callData.duration,
                  timestamp: callData.timestamp,
                  fullTranscript: callData.fullTranscript
                }
              }
              
              setMessages(prev => [...prev, summaryMessage])
              
              // Save call summary to history
              try {
                await saveCustomerCareMessage(userId, company, {
                  type: 'agent',
                  content: summaryMessage.content,
                  timestamp: summaryMessage.timestamp,
                  isCallSummary: true,
                  callData: {
                    summary: callData.summary,
                    duration: callData.duration,
                    timestamp: callData.timestamp,
                    fullTranscript: callData.fullTranscript
                  }
                })
              } catch (error) {
                console.error('Error saving call summary:', error)
              }
            }
          }}
          user={user}
        />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Loading indicator */}
        {(isLoadingKB || isLoadingHistory) && messages.length === 0 && (
          <div className="flex justify-center items-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">
                {isLoadingHistory ? 'Loading chat history...' : `Loading ${company} support...`}
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id}>
            <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-4 py-3 ${
                  message.isCallSummary
                    ? 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-bl-sm shadow-md'
                    : message.type === 'user'
                    ? 'bg-primary-600 text-white rounded-br-sm'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm shadow-sm border border-gray-200 dark:border-gray-700'
                }`}
              >
                {message.isCallSummary && (
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-blue-200 dark:border-blue-700">
                    <Phone size={16} className="text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Voice Call Summary</span>
                  </div>
                )}
                <p className={`text-sm whitespace-pre-wrap ${message.isCallSummary ? 'text-gray-800 dark:text-gray-200' : ''}`}>{message.content}</p>
                <div className="flex items-center justify-between gap-2 mt-1">
                <p
                    className={`text-xs ${
                    message.type === 'user' ? 'text-primary-100' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                  {message.type === 'agent' && message.provider && (
                    <div className="flex items-center gap-1">
                      <Bot size={10} className="text-gray-400" />
                      <span className={`text-[9px] font-medium ${
                        message.provider === 'elevenlabs' ? 'text-purple-600 dark:text-purple-400' :
                        message.provider === 'openai' ? 'text-green-600 dark:text-green-400' :
                        'text-gray-500'
                      }`}>
                        {message.provider === 'elevenlabs' ? 'ElevenLabs' :
                         message.provider === 'openai' ? 'GPT-4' :
                         message.provider}
                      </span>
                      {message.source === 'vector_rag' && (
                        <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold">+RAG</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Replies */}
            {message.quickReplies && message.quickReplies.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 ml-0">
                {message.quickReplies.map((reply, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(reply)}
                    className="px-4 py-2 bg-white dark:bg-gray-800 border-2 border-primary-500 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium hover:bg-primary-50 dark:hover:bg-primary-900 transition-colors"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-gray-200 dark:border-gray-700">
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

      {/* Input Area */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 relative z-20">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your message..."
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


    </div>
  )
}

