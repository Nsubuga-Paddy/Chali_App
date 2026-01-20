import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// In-memory storage for call history (in production, use a database)
// This is a simple file-based storage for now
const CALL_HISTORY_FILE = path.join(process.cwd(), 'data', 'call_history.json')

// Ensure data directory exists
const ensureDataDirectory = () => {
  const dataDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

// Read call history from file
const readCallHistory = (): any[] => {
  try {
    ensureDataDirectory()
    if (fs.existsSync(CALL_HISTORY_FILE)) {
      const data = fs.readFileSync(CALL_HISTORY_FILE, 'utf-8')
      return JSON.parse(data)
    }
    return []
  } catch (error) {
    console.error('Error reading call history:', error)
    return []
  }
}

// Write call history to file
const writeCallHistory = (history: any[]) => {
  try {
    ensureDataDirectory()
    fs.writeFileSync(CALL_HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8')
  } catch (error) {
    console.error('Error writing call history:', error)
  }
}

// POST: Store a new call record
export async function POST(request: NextRequest) {
  try {
    const callData = await request.json()
    
    if (!callData.summary && !callData.fullTranscript) {
      return NextResponse.json(
        { error: 'Call data is required' },
        { status: 400 }
      )
    }
    
    // Read existing history
    const history = readCallHistory()
    
    // Create new call record
    const newCall = {
      id: `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      company: callData.company || 'Unknown',
      user: callData.user || 'Unknown User',
      summary: callData.summary || null,
      fullTranscript: callData.fullTranscript || [],
      duration: callData.duration || '0s',
      timestamp: callData.timestamp || new Date().toISOString(),
      createdAt: new Date().toISOString()
    }
    
    // Add to history (newest first)
    history.unshift(newCall)
    
    // Keep only last 1000 calls (optional limit)
    const limitedHistory = history.slice(0, 1000)
    
    // Write back to file
    writeCallHistory(limitedHistory)
    
    return NextResponse.json({ 
      success: true, 
      callId: newCall.id 
    })
  } catch (error: any) {
    console.error('Error storing call history:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to store call history' },
      { status: 500 }
    )
  }
}

// GET: Retrieve call history with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const company = searchParams.get('company')
    const user = searchParams.get('user')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    // Read call history
    let history = readCallHistory()
    
    // Apply filters
    if (company) {
      history = history.filter((call: any) => 
        call.company?.toLowerCase().includes(company.toLowerCase())
      )
    }
    
    if (user) {
      history = history.filter((call: any) => 
        call.user?.toLowerCase().includes(user.toLowerCase())
      )
    }
    
    if (startDate) {
      history = history.filter((call: any) => 
        new Date(call.timestamp) >= new Date(startDate)
      )
    }
    
    if (endDate) {
      history = history.filter((call: any) => 
        new Date(call.timestamp) <= new Date(endDate)
      )
    }
    
    // Apply pagination
    const total = history.length
    const paginatedHistory = history.slice(offset, offset + limit)
    
    return NextResponse.json({
      calls: paginatedHistory,
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    })
  } catch (error: any) {
    console.error('Error retrieving call history:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve call history' },
      { status: 500 }
    )
  }
}

