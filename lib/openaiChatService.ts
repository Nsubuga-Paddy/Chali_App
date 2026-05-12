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
    
    const msg = String(error?.message || '')
    // Server returns plain English in `error` — surface deploy/config issues clearly
    let fallbackMessage = `I apologize, I'm having trouble connecting right now. `
    if (
      msg.includes('No AI provider') ||
      msg.includes('OPENAI_API_KEY') ||
      msg.includes('Invalid OpenAI API key')
    ) {
      fallbackMessage =
        `The assistant can't reach the AI service yet. If you're the app owner, add OPENAI_API_KEY in your hosting environment (e.g. Railway Variables) and redeploy. `
    } else if (msg.includes('No knowledge base found')) {
      fallbackMessage =
        `No knowledge base is available for this company on the server. Check that public/knowledge-bases is deployed and the company name matches (e.g. MTN, NWSC). `
    } else if (msg.includes('API key') || msg.includes('API configuration')) {
      fallbackMessage += `There's an issue with the API configuration. Please contact support.`
    } else if (msg.includes('network') || msg.includes('fetch') || msg.includes('Failed to fetch')) {
      fallbackMessage += `Please check your internet connection and try again.`
    } else if (msg.length > 0 && msg.length < 200 && !msg.startsWith('Failed to get response')) {
      fallbackMessage += msg
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

