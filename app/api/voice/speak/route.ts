import { NextRequest, NextResponse } from 'next/server'

/**
 * API endpoint to convert text to speech using ElevenLabs
 */
export async function POST(request: NextRequest) {
  try {
    const { text, voice_id } = await request.json()

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      )
    }

    // Use default voice if not provided
    const voiceId = voice_id || process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'
    
    // Use model from env or default to newer model available on free tier
    // Available models: eleven_turbo_v2, eleven_turbo_v2_5, eleven_multilingual_v2
    const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_turbo_v2'

    // Call ElevenLabs Text-to-Speech API
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: text,
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    })

    if (!response.ok) {
      let errorMessage = 'Failed to generate speech'
      try {
        const errorData = await response.json()
        errorMessage = errorData.detail?.message || errorData.message || errorMessage
        console.error('ElevenLabs TTS error:', response.status, errorData)
      } catch {
        const errorText = await response.text()
        console.error('ElevenLabs TTS error:', response.status, errorText)
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { 
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Get audio data
    const audioBuffer = await response.arrayBuffer()

    // Return audio as blob
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    })

  } catch (error: any) {
    console.error('Voice speak error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate speech' },
      { status: 500 }
    )
  }
}

