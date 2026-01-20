'use client'

import { useState, useRef, useEffect } from 'react'
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'

interface CallData {
  summary: string | null
  fullTranscript: Array<{
    userMessage: string
    aiResponse: string
    timestamp: Date
  }>
  duration: string
  timestamp: Date
}

interface VoiceCallProps {
  company: string
  onEndCall: (callData?: CallData) => void
  user: any
}

export default function VoiceCall({ company, onEndCall, user }: VoiceCallProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  
  // Keep refs in sync with state
  useEffect(() => {
    isConnectedRef.current = isConnected
  }, [isConnected])
  
  useEffect(() => {
    isMutedRef.current = isMuted
  }, [isMuted])
  const [isSpeakerOn, setIsSpeakerOn] = useState(true)
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('Connecting...')
  // Track conversation history for summary generation
  const [conversationHistory, setConversationHistory] = useState<Array<{
    userMessage: string
    aiResponse: string
    timestamp: Date
  }>>([])
  const callStartTimeRef = useRef<Date | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recognitionRef = useRef<any>(null)
  const isRecognitionActiveRef = useRef<boolean>(false)
  const audioUrlRef = useRef<string | null>(null)
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastTranscriptRef = useRef<string>('')
  const isProcessingRef = useRef<boolean>(false)
  // Refs for state variables to avoid closure issues in callbacks
  const isConnectedRef = useRef<boolean>(false)
  const isMutedRef = useRef<boolean>(false)
  // Flag to track if recognition was intentionally aborted (during cleanup)
  const wasAbortedRef = useRef<boolean>(false)

  // Initialize voice call
  useEffect(() => {
    initializeVoiceCall()
    return () => {
      cleanup()
    }
  }, [])

  const initializeVoiceCall = async () => {
    try {
      setStatus('Initializing voice connection...')
      // Record call start time
      callStartTimeRef.current = new Date()
      // Reset conversation history for new call
      setConversationHistory([])

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
        // Helper function to process transcript (defined before recognition setup)
        const processTranscript = async (transcript: string) => {
          if (!transcript.trim() || isProcessingRef.current) {
            console.log('⏭️ Skipping transcript processing:', {
              isEmpty: !transcript.trim(),
              isProcessing: isProcessingRef.current
            })
            return
          }
          
          console.log('🚀 Processing transcript:', transcript)
          isProcessingRef.current = true
          
          // Stop recognition while processing to prevent multiple triggers
          if (recognitionRef.current && isRecognitionActiveRef.current) {
            try {
              console.log('⏸️ Stopping recognition for processing...')
              recognitionRef.current.stop()
              isRecognitionActiveRef.current = false
            } catch (e) {
              // Ignore if already stopped
              console.log('ℹ️ Recognition already stopped')
            }
          }
          
          // Clear timeout
          if (speechTimeoutRef.current) {
            clearTimeout(speechTimeoutRef.current)
            speechTimeoutRef.current = null
          }
          
          try {
            await sendVoiceMessage(transcript)
          } finally {
            isProcessingRef.current = false
            lastTranscriptRef.current = ''
            console.log('✅ Transcript processing complete')
          }
        }

      // Initialize speech recognition (Web Speech API)
      // Always create a fresh instance to avoid conflicts from previous calls
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
        
        // Clear any existing recognition instance first
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop()
          } catch (e) {
            // Ignore
          }
          recognitionRef.current = null
        }
        
        // Create fresh recognition instance
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'en-US'

        recognition.onstart = () => {
          console.log('🎤 Speech recognition started')
          setIsListening(true)
          isRecognitionActiveRef.current = true
          setStatus('Listening...')
          setError(null) // Clear any previous errors
        }

        recognition.onresult = async (event: any) => {
          // Get the latest result
          const resultIndex = event.resultIndex
          const result = event.results[resultIndex]
          const transcript = result[0].transcript.trim()
          
          console.log(`📝 Speech detected: "${transcript}" (isFinal: ${result.isFinal})`)
          
          // Store the latest transcript
          if (transcript) {
            lastTranscriptRef.current = transcript
          }
          
          // Clear any existing timeout
          if (speechTimeoutRef.current) {
            clearTimeout(speechTimeoutRef.current)
            speechTimeoutRef.current = null
          }
          
          // If this is a final result, process it immediately
          if (result.isFinal && transcript) {
            console.log('✅ Final result received, processing immediately...')
            await processTranscript(transcript)
            return
          }
          
          // If interim result, wait for pause (2 seconds of no new results)
          // This handles cases where recognition doesn't mark results as final
          if (transcript && !isProcessingRef.current) {
            console.log('⏳ Interim result, starting 2-second timeout...')
            speechTimeoutRef.current = setTimeout(async () => {
              // Process the interim result if no new results came in
              if (lastTranscriptRef.current && !isProcessingRef.current) {
                console.log('⏰ Timeout reached, processing interim result...')
                await processTranscript(lastTranscriptRef.current)
              }
            }, 2000) // Wait 2 seconds after last speech
          }
        }

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error)
          isRecognitionActiveRef.current = false
          
          // If aborted intentionally (during cleanup), don't restart
          if (event.error === 'aborted' && wasAbortedRef.current) {
            console.log('ℹ️ Recognition was intentionally aborted, not restarting')
            wasAbortedRef.current = false // Reset flag
            return
          }
          
          // Don't show error for "no-speech" as it's normal
          if (event.error !== 'no-speech' && event.error !== 'aborted') {
            setError(`Speech recognition error: ${event.error}`)
          }
          
          // Restart if still connected and not a fatal/aborted error
          // Use refs to avoid closure issues
          if (isConnectedRef.current && event.error !== 'aborted' && event.error !== 'not-allowed') {
            setTimeout(() => {
              if (isConnectedRef.current && !isRecognitionActiveRef.current && !wasAbortedRef.current) {
                try {
                  console.log('🔄 Restarting recognition after error...')
                  recognitionRef.current.start()
                } catch (e) {
                  console.error('❌ Failed to restart recognition:', e)
                }
              }
            }, 1000) // Increased delay to prevent rapid restarts
          } else if (event.error === 'aborted') {
            console.log('⏸️ Recognition aborted, not restarting (may be intentional cleanup)')
          }
        }

        recognition.onend = () => {
          console.log('🛑 Speech recognition ended')
          isRecognitionActiveRef.current = false
          setIsListening(false)
          
          // If intentionally aborted, don't restart
          if (wasAbortedRef.current) {
            console.log('ℹ️ Recognition ended due to intentional abort, not restarting')
            wasAbortedRef.current = false // Reset flag
            return
          }
          
          // Clear speech timeout on end
          if (speechTimeoutRef.current) {
            clearTimeout(speechTimeoutRef.current)
            speechTimeoutRef.current = null
          }
          
          // Process any pending transcript if we have one and not already processing
          // Use refs to avoid closure issues
          if (lastTranscriptRef.current && !isProcessingRef.current && isConnectedRef.current && !isMutedRef.current) {
            console.log('📋 Processing pending transcript on recognition end...')
            setTimeout(async () => {
              if (lastTranscriptRef.current && !isProcessingRef.current) {
                await processTranscript(lastTranscriptRef.current)
                return
              }
            }, 500)
            return // Don't restart yet, wait for processing
          }
          
          // Only restart if still connected, not muted, and not processing
          // Don't restart if we're processing - audio.onended will handle that
          // This restart is only for cases where recognition ended unexpectedly (not due to processing)
          if (isConnectedRef.current && !isMutedRef.current && !isProcessingRef.current && !wasAbortedRef.current) {
            setTimeout(() => {
              // Double-check conditions before restarting
              if (isConnectedRef.current && !isRecognitionActiveRef.current && !isMutedRef.current && !isProcessingRef.current && !wasAbortedRef.current) {
                try {
                  console.log('🔄 Restarting recognition after onend (unexpected end)...')
                  recognitionRef.current.start()
                } catch (e: any) {
                  // Ignore if already started or other error
                  if (!e.message?.includes('already started')) {
                    console.log('⏭️ Recognition restart skipped:', e.message)
                  }
                }
              }
            }, 1000) // Increased delay to prevent rapid restarts
          } else {
            console.log('⏸️ Not restarting recognition in onend - conditions not met:', {
              isConnected: isConnectedRef.current,
              isMuted: isMutedRef.current,
              isProcessing: isProcessingRef.current,
              wasAborted: wasAbortedRef.current
            })
          }
        }

        recognitionRef.current = recognition
      } else {
        setError('Speech recognition not supported in this browser')
        return
      }

      // Connect to voice API
      await connectToVoiceAPI(stream)
      
      setIsConnected(true)
      setStatus('Connected')
      
      // Wait a bit before starting recognition to ensure everything is ready
      // This fixes the issue where first speech sometimes requires repetition
      // Increased delay to give browser time to fully initialize
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Start listening (only if not already active and not aborted)
      if (recognitionRef.current && !isRecognitionActiveRef.current && !wasAbortedRef.current) {
        try {
          console.log('🎤 Starting recognition after initialization delay...')
          recognitionRef.current.start()
        } catch (e: any) {
          // If already started, that's okay
          if (!e.message?.includes('already started')) {
            console.error('❌ Failed to start recognition:', e)
            setError('Failed to start speech recognition')
          }
        }
      }

    } catch (err: any) {
      console.error('Voice initialization error:', err)
      setError(err.message || 'Failed to initialize voice call')
      setStatus('Connection failed')
    }
  }

  const connectToVoiceAPI = async (stream: MediaStream) => {
    try {
      // Create audio context for processing
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      
      // Initialize audio element for playback
      if (!audioRef.current) {
        audioRef.current = new Audio()
        audioRef.current.volume = isSpeakerOn ? 1 : 0
      }

      // Connect to ElevenLabs Conversational AI via WebSocket
      await connectToElevenLabs()

    } catch (err: any) {
      throw new Error(`Voice API connection failed: ${err.message}`)
    }
  }

  const connectToElevenLabs = async () => {
    try {
      // Call our API endpoint to get ElevenLabs voice connection
      const response = await fetch('/api/voice/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company,
          user: user.name || 'User'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to connect to voice service')
      }

      const data = await response.json()
      
      // Use the connection details to set up audio streaming
      // This will be handled by the WebSocket connection
      console.log('Voice connection established:', data)

    } catch (err: any) {
      throw new Error(`ElevenLabs connection failed: ${err.message}`)
    }
  }

  const sendVoiceMessage = async (transcript: string) => {
    try {
      setStatus('Processing...')
      setError(null) // Clear previous errors
      
      console.log('Processing transcript:', transcript) // Debug log
      
      // Send transcript to chat API with voice flag
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company,
          message: transcript,
          chatHistory: [],
          voiceMode: true
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to get response')
      }

      const data = await response.json()
      
      // Track conversation for summary generation
      setConversationHistory(prev => [...prev, {
        userMessage: transcript,
        aiResponse: data.response,
        timestamp: new Date()
      }])
      
      // Convert text response to speech using ElevenLabs
      await playVoiceResponse(data.response)

    } catch (err: any) {
      console.error('Error sending voice message:', err)
      setError(err.message || 'Failed to process your message')
      setStatus('Listening...')
      
      // Restart recognition on error (audio won't play, so restart immediately)
      // Use refs to avoid closure issues
      if (isConnectedRef.current && recognitionRef.current && !isRecognitionActiveRef.current && !isMutedRef.current) {
        setTimeout(() => {
          if (isConnectedRef.current && !isRecognitionActiveRef.current && !isMutedRef.current) {
            try {
              console.log('🔄 Restarting recognition after error...')
              recognitionRef.current.start()
            } catch (e: any) {
              if (!e.message?.includes('already started')) {
                console.error('❌ Failed to restart recognition after error:', e)
              }
            }
          }
        }, 1000)
      }
    }
    // NOTE: We don't restart recognition in finally block anymore
    // Recognition will be restarted in audio.onended callback after playback finishes
    // This ensures we wait for audio to complete before listening again
  }

  const playVoiceResponse = async (text: string) => {
    try {
      setStatus('Generating speech...')
      
      // Call ElevenLabs TTS API
      const response = await fetch('/api/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice_id: '21m00Tcm4TlvDq8ikWAM' // Default voice (Rachel)
        })
      })

      if (!response.ok) {
        // Try to get error message from JSON response
        let errorMessage = `Failed to generate speech (${response.status})`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          const errorText = await response.text()
          if (errorText) {
            errorMessage = errorText.substring(0, 100)
          }
        }
        console.error('TTS API error:', response.status, errorMessage)
        throw new Error(errorMessage)
      }

      // Check if response is actually audio
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('audio')) {
        const errorText = await response.text()
        console.error('Unexpected response type:', contentType, errorText)
        throw new Error('Server returned non-audio response')
      }

      // Get audio blob
      const audioBlob = await response.blob()
      
      // Verify blob is not empty
      if (audioBlob.size === 0) {
        throw new Error('Received empty audio file')
      }
      
      // Clean up previous audio URL if exists
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current)
      }
      
      // Create new audio URL
      const audioUrl = URL.createObjectURL(audioBlob)
      audioUrlRef.current = audioUrl

      // Ensure audio element exists
      if (!audioRef.current) {
        audioRef.current = new Audio()
      }

      // Set up audio element
      audioRef.current.src = audioUrl
      audioRef.current.volume = isSpeakerOn ? 1 : 0
      
      // Handle audio errors
      audioRef.current.onerror = (e: Event | string) => {
        console.error('❌ Audio playback error:', e)
        let errorMsg = 'Unknown audio error'
        
        if (e instanceof Event && e.target) {
          const audioElement = e.target as HTMLAudioElement
          errorMsg = audioElement.error?.message || 'Unknown audio error'
          console.error('Audio error details:', {
            code: audioElement.error?.code,
            message: errorMsg
          })
        } else if (typeof e === 'string') {
          errorMsg = e
        }
        
        setError(`Failed to play audio: ${errorMsg}. Please check your speaker settings.`)
        setStatus('Listening...')
        
        // Restart recognition after audio error
        if (isConnectedRef.current && recognitionRef.current && !isRecognitionActiveRef.current && !isMutedRef.current) {
          setTimeout(() => {
            if (isConnectedRef.current && !isRecognitionActiveRef.current && !isMutedRef.current) {
              try {
                console.log('🔄 Restarting recognition after audio error...')
                recognitionRef.current.start()
              } catch (err: any) {
                if (!err.message?.includes('already started')) {
                  console.error('❌ Failed to restart recognition after audio error:', err)
                }
              }
            }
          }, 1000)
        }
      }

      audioRef.current.onended = () => {
        console.log('🎵 Audio playback finished, restarting recognition...')
        
        // Clean up URL after playback
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current)
          audioUrlRef.current = null
        }
        
        setStatus('Listening...')
        
        // CRITICAL: Restart recognition after audio finishes
        // This ensures we can capture the next user message
        // Use refs to avoid closure issues
        if (isConnectedRef.current && recognitionRef.current && !isMutedRef.current && !isProcessingRef.current) {
          setTimeout(() => {
            if (isConnectedRef.current && !isRecognitionActiveRef.current && !isMutedRef.current && !isProcessingRef.current) {
              try {
                console.log('🔄 Restarting speech recognition after audio...')
                recognitionRef.current.start()
              } catch (e: any) {
                if (!e.message?.includes('already started')) {
                  console.error('❌ Failed to restart recognition after audio:', e)
                  setError('Failed to restart listening. Please try again.')
                } else {
                  console.log('✅ Recognition already active')
                }
              }
            } else {
              console.log('⏸️ Skipping recognition restart - conditions not met:', {
                isConnected: isConnectedRef.current,
                hasRecognition: !!recognitionRef.current,
                isMuted: isMutedRef.current,
                isProcessing: isProcessingRef.current,
                isActive: isRecognitionActiveRef.current
              })
            }
          }, 500) // Small delay to ensure audio cleanup is complete
        } else {
          console.log('⏸️ Cannot restart recognition - conditions not met:', {
            isConnected: isConnectedRef.current,
            hasRecognition: !!recognitionRef.current,
            isMuted: isMutedRef.current,
            isProcessing: isProcessingRef.current
          })
        }
      }

      // Play audio with error handling
      try {
        await audioRef.current.play()
        setStatus('Speaking...')
      } catch (playError: any) {
        // Handle autoplay policy restrictions
        if (playError.name === 'NotAllowedError') {
          setError('Please interact with the page to enable audio playback')
        } else {
          throw playError
        }
      }

    } catch (err: any) {
      console.error('Error playing voice response:', err)
      setError(err.message || 'Failed to play response. Please check your connection and try again.')
      setStatus('Listening...')
      
      // Restart recognition on TTS error (audio didn't play, so restart immediately)
      // Use refs to avoid closure issues
      if (isConnectedRef.current && recognitionRef.current && !isRecognitionActiveRef.current && !isMutedRef.current) {
        setTimeout(() => {
          if (isConnectedRef.current && !isRecognitionActiveRef.current && !isMutedRef.current) {
            try {
              console.log('🔄 Restarting recognition after TTS error...')
              recognitionRef.current.start()
            } catch (e: any) {
              if (!e.message?.includes('already started')) {
                console.error('❌ Failed to restart recognition after TTS error:', e)
              }
            }
          }
        }, 1000)
      }
    }
  }

  const handleMuteToggle = () => {
    const newMutedState = !isMuted
    setIsMuted(newMutedState)
    
    // Mute/unmute microphone
    if (recognitionRef.current) {
      if (newMutedState) {
        // Mute: Stop recognition
        if (isRecognitionActiveRef.current) {
          try {
            recognitionRef.current.stop()
            isRecognitionActiveRef.current = false
          } catch (e) {
            // Ignore if already stopped
          }
        }
      } else {
        // Unmute: Start recognition if connected
        if (isConnected && !isRecognitionActiveRef.current) {
          try {
            recognitionRef.current.start()
          } catch (e: any) {
            if (!e.message?.includes('already started')) {
              console.error('Failed to start recognition:', e)
            }
          }
        }
      }
    }
  }

  const handleSpeakerToggle = () => {
    setIsSpeakerOn(!isSpeakerOn)
    if (audioRef.current) {
      audioRef.current.volume = !isSpeakerOn ? 1 : 0
    }
  }

  const cleanup = () => {
    console.log('🧹 Cleaning up voice call...')
    
    // Mark as aborted to prevent restart loops
    wasAbortedRef.current = true
    
    // Clear speech timeout
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current)
      speechTimeoutRef.current = null
    }
    
    // Stop recognition properly
    if (recognitionRef.current) {
      try {
        // Stop recognition if active
        if (isRecognitionActiveRef.current) {
          recognitionRef.current.stop()
        }
        // Reset recognition state
        isRecognitionActiveRef.current = false
        // Clear recognition ref to prevent reuse
        recognitionRef.current = null
        console.log('✅ Recognition stopped and cleared')
      } catch (e) {
        // Ignore errors - recognition might already be stopped
        console.log('ℹ️ Recognition cleanup:', e)
        recognitionRef.current = null
        isRecognitionActiveRef.current = false
      }
    }
    
    // Stop media recorder if active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop()
      } catch (e) {
        // Ignore errors
      }
    }
    
    // Clean up audio
    if (audioRef.current) {
      try {
        audioRef.current.pause()
        audioRef.current.src = ''
        audioRef.current.onended = null
        audioRef.current.onerror = null
      } catch (e) {
        // Ignore errors
      }
    }
    
    // Clean up audio URL
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current)
      audioUrlRef.current = null
    }
    
    // Reset processing state
    isProcessingRef.current = false
    lastTranscriptRef.current = ''
    
    // Reset connection state
    setIsConnected(false)
    setIsListening(false)
    
    // Small delay before resetting abort flag to ensure all handlers have processed
    setTimeout(() => {
      wasAbortedRef.current = false
    }, 1000)
  }

  // Helper function to format call duration
  const formatDuration = (startTime: Date | null, endTime: Date): string => {
    if (!startTime) return '0s'
    const diff = endTime.getTime() - startTime.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  const handleEndCall = async () => {
    const endTime = new Date()
    const callDuration = formatDuration(callStartTimeRef.current, endTime)
    
    let summary: string | null = null
    
    // Generate summary if conversation exists
    if (conversationHistory.length > 0) {
      try {
        setStatus('Generating summary...')
        
        const response = await fetch('/api/voice/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation: conversationHistory,
            company,
            callDuration
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          summary = data.summary
        } else {
          console.error('Failed to generate summary:', await response.text())
        }
      } catch (error) {
        console.error('Error generating summary:', error)
      }
    }
    
    // Prepare call data
    const callData = {
      summary,
      fullTranscript: conversationHistory,
      duration: callDuration,
      timestamp: endTime,
      company,
      user: user.name || user.email || 'Unknown User'
    }
    
    // Save call to backend for admin view (don't wait for it)
    if (conversationHistory.length > 0) {
      fetch('/api/voice/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(callData)
      }).catch(error => {
        console.error('Failed to save call history:', error)
        // Don't block call ending if save fails
      })
    }
    
    // Pass call data to parent component
    cleanup()
    setIsConnected(false)
    onEndCall(callData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Voice Call - {company}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {status}
          </p>
        </div>

        {/* Status Indicator */}
        <div className="flex justify-center mb-6">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center ${
            isConnected 
              ? 'bg-green-500 animate-pulse' 
              : 'bg-gray-400'
          }`}>
            {isConnected ? (
              <Phone size={40} className="text-white" />
            ) : (
              <PhoneOff size={40} className="text-white" />
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-center gap-4 mb-6">
          {/* Mute Button */}
          <button
            onClick={handleMuteToggle}
            className={`p-4 rounded-full transition-colors ${
              isMuted
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
            disabled={!isConnected}
          >
            {isMuted ? (
              <MicOff size={24} className="text-white" />
            ) : (
              <Mic size={24} className="text-gray-700 dark:text-gray-300" />
            )}
          </button>

          {/* Speaker Button */}
          <button
            onClick={handleSpeakerToggle}
            className={`p-4 rounded-full transition-colors ${
              isSpeakerOn
                ? 'bg-blue-500 hover:bg-blue-600'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
            disabled={!isConnected}
          >
            {isSpeakerOn ? (
              <Volume2 size={24} className="text-white" />
            ) : (
              <VolumeX size={24} className="text-gray-700 dark:text-gray-300" />
            )}
          </button>

          {/* End Call Button */}
          <button
            onClick={handleEndCall}
            className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
          >
            <PhoneOff size={24} className="text-white" />
          </button>
        </div>

        {/* Listening Indicator */}
        {isListening && isConnected && (
          <div className="text-center">
            <div className="flex justify-center gap-1 mb-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Listening...</p>
          </div>
        )}

        {/* Instructions */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
          <p>Speak naturally. The AI will respond with voice.</p>
        </div>
      </div>
    </div>
  )
}

