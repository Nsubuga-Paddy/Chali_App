// OpenAI-powered chat service

export interface ChatMessage {
  type: 'user' | 'agent'
  content: string
  timestamp: Date
}

export interface ChatResponse {
  response: string
  quickReplies: string[]
  source?: string // e.g., 'vector_rag', 'openai', 'keyword'
  provider?: string // e.g., 'openai', 'elevenlabs'
  productsFound?: number
  searchMethod?: string // e.g., 'vector_semantic', 'keyword'
}

/**
 * Generate AI response using OpenAI API
 */
export async function generateAIResponse(
  company: string,
  message: string,
  chatHistory: ChatMessage[]
): Promise<ChatResponse> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        company,
        message,
        chatHistory: chatHistory.map(msg => ({
          type: msg.type,
          content: msg.content
        }))
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('❌ API error:', error)
      console.error('Status:', response.status)
      console.error('Error details:', error.details)
      throw new Error(error.error || error.details || 'Failed to get response')
    }

    const data = await response.json()
    console.log('✅ API response received:', { productsFound: data.productsFound })
    
    return {
      response: data.response,
      quickReplies: data.quickReplies || [],
      source: data.source || 'openai',
      provider: data.provider || 'openai',
      productsFound: data.productsFound || 0,
      searchMethod: data.searchMethod
    }
  } catch (error: any) {
    console.error('❌ Error calling AI chat API:', error)
    console.error('Error message:', error.message)
    
    // More helpful fallback messages based on error type
    let fallbackMessage = `I apologize, I'm having trouble connecting right now. `
    
    if (error.message?.includes('API key')) {
      fallbackMessage += `There's an issue with the API configuration. Please contact support.`
    } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
      fallbackMessage += `Please check your internet connection and try again.`
    } else {
      fallbackMessage += `Please try again in a moment, or contact our support team directly for immediate assistance.`
    }
    
    return {
      response: fallbackMessage,
      quickReplies: ['Try again', 'Contact support'],
      source: 'fallback'
    }
  }
}

/**
 * Check if the API is available
 */
export async function checkAPIHealth(): Promise<boolean> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        company: 'test',
        message: 'health check',
        chatHistory: []
      }),
    })
    
    return response.status !== 404
  } catch {
    return false
  }
}

