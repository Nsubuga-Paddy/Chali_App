import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const { conversation, company, callDuration } = await request.json()
    
    if (!conversation || conversation.length === 0) {
      return NextResponse.json(
        { error: 'No conversation data provided' },
        { status: 400 }
      )
    }
    
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }
    
    // Format conversation for summary
    const conversationText = conversation.map((item: any, index: number) => 
      `Q${index + 1}: ${item.userMessage}\nA${index + 1}: ${item.aiResponse}`
    ).join('\n\n')
    
    // Generate summary using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a customer service summary generator. Create a concise, professional summary of a voice call conversation. Focus on:
- Key topics discussed
- Main questions asked
- Important answers provided
- Any action items or next steps

Keep it brief (3-5 bullet points) and customer-friendly. Use clear, simple language. Format as bullet points.`
        },
        {
          role: 'user',
          content: `Company: ${company}\nCall Duration: ${callDuration}\n\nConversation:\n${conversationText}\n\nGenerate a concise summary with key points:`
        }
      ],
      temperature: 0.3,
      max_tokens: 300
    })
    
    const summary = completion.choices[0].message.content
    
    if (!summary) {
      throw new Error('Failed to generate summary')
    }
    
    return NextResponse.json({ summary })
  } catch (error: any) {
    console.error('Summary generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate summary' },
      { status: 500 }
    )
  }
}

