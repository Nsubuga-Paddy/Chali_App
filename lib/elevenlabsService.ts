// ElevenLabs Chat Service - Primary LLM provider with OpenAI fallback

export interface ChatMessage {
  type: 'user' | 'agent'
  content: string
  timestamp: Date
}

export interface ChatResponse {
  response: string
  quickReplies: string[]
  source: 'elevenlabs' | 'openai' | 'fallback'
  provider: string
  productsFound?: number
}

/**
 * Generate AI response using ElevenLabs (Primary) with OpenAI fallback
 */
export async function generateAIResponse(
  company: string,
  message: string,
  chatHistory: ChatMessage[]
): Promise<ChatResponse> {
  try {
    // Try ElevenLabs first
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
        })),
        preferredProvider: 'elevenlabs' // Hint to API to try ElevenLabs first
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('❌ API error:', error)
      throw new Error(error.error || error.details || 'Failed to get response')
    }

    const data = await response.json()
    console.log(`✅ Response received from: ${data.provider || 'unknown'}`)
    
    return {
      response: data.response,
      quickReplies: data.quickReplies || [],
      source: data.source || 'fallback',
      provider: data.provider || 'unknown',
      productsFound: data.productsFound || 0
    }
  } catch (error: any) {
    console.error('❌ Error calling AI chat API:', error)
    
    // Fallback message
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
      source: 'fallback',
      provider: 'none'
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





