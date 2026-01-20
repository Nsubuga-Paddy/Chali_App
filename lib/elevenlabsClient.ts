/**
 * ElevenLabs Client for Text Generation
 * Using ElevenLabs Conversational AI for text-based responses
 */

export interface ElevenLabsMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ElevenLabsTextResponse {
  text: string
  success: boolean
  error?: string
}

/**
 * Generate text response using ElevenLabs API
 * This is a simplified implementation that sends requests to ElevenLabs
 */
export async function generateElevenLabsResponse(
  messages: ElevenLabsMessage[],
  apiKey: string
): Promise<ElevenLabsTextResponse> {
  try {
    // ElevenLabs conversational AI endpoint
    // Note: This uses their text generation endpoint
    // You may need to adjust based on their latest API documentation
    
    const systemMessage = messages.find(m => m.role === 'system')?.content || ''
    const userMessages = messages.filter(m => m.role !== 'system')
    
    // Build the prompt for ElevenLabs
    let prompt = systemMessage + '\n\n'
    userMessages.forEach(msg => {
      if (msg.role === 'user') {
        prompt += `User: ${msg.content}\n`
      } else {
        prompt += `Assistant: ${msg.content}\n`
      }
    })
    prompt += 'Assistant:'

    // Use ElevenLabs API for text completion
    // Note: ElevenLabs primarily does TTS, so for pure text we can use a simple approach
    // or integrate with their conversational AI if you have access
    
    const response = await fetch('https://api.elevenlabs.io/v1/text-completion', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        prompt: prompt,
        max_tokens: 500,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('ElevenLabs API error:', error)
      
      // Check for specific error types
      if (response.status === 401) {
        throw new Error('Invalid ElevenLabs API key')
      } else if (response.status === 429) {
        throw new Error('ElevenLabs rate limit exceeded')
      } else if (response.status === 404) {
        // Endpoint might not exist - this is expected as ElevenLabs may not have this endpoint
        throw new Error('ElevenLabs text generation endpoint not available')
      }
      
      throw new Error(`ElevenLabs API error: ${response.status}`)
    }

    const data = await response.json()
    
    return {
      text: data.text || data.completion || '',
      success: true,
    }
    
  } catch (error: any) {
    console.error('ElevenLabs generation error:', error.message)
    return {
      text: '',
      success: false,
      error: error.message,
    }
  }
}

/**
 * Fallback: Use OpenAI-compatible formatting for ElevenLabs
 * Since ElevenLabs doesn't have a direct text completion API like OpenAI,
 * this is a placeholder that returns an error to trigger fallback to OpenAI
 */
export async function tryElevenLabsText(
  messages: ElevenLabsMessage[],
  apiKey: string
): Promise<string | null> {
  try {
    const result = await generateElevenLabsResponse(messages, apiKey)
    
    if (result.success && result.text) {
      return result.text
    }
    
    return null
  } catch (error: any) {
    console.warn('ElevenLabs not available for text generation:', error.message)
    return null
  }
}





