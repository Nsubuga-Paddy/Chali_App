import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { searchProducts } from '@/lib/knowledgeBase'
import type { KnowledgeBase, FAQ } from '@/lib/knowledgeBase'
import { stripMarkdown } from '@/lib/textFormatter'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Check which AI providers are available
const hasOpenAI = !!process.env.OPENAI_API_KEY

if (hasOpenAI) {
  console.log('✅ OpenAI API key found')
}

// Initialize OpenAI client (Fallback)
let openai: OpenAI | null = null
if (hasOpenAI) {
  try {
    openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})
    console.log('✅ OpenAI client initialized')
  } catch (error) {
    console.warn('⚠️ OpenAI initialization failed:', error)
  }
}

// Company to knowledge base file mapping
const COMPANY_KB_MAP: Record<string, string> = {
  'MTN': 'knowledge-bases/mtn/knowledge.json',
  'Airtel': 'knowledge-bases/airtel/knowledge.json',
  'UEDCL': 'knowledge-bases/umeme/knowledge.json',
  'NWSC': 'knowledge-bases/nwsc/knowledge.json',
  'DStv': 'knowledge-bases/dstv/knowledge.json',
  'URA': 'knowledge-bases/ura/knowledge.json',
}

// In-memory cache for knowledge bases
const knowledgeBaseCache: Record<string, KnowledgeBase> = {}

/**
 * Perform vector search using Python module
 */
async function performVectorSearch(query: string, company: string, nResults: number = 5): Promise<any[]> {
  // Determine which vector search module and database to use
  let scriptPath: string
  let dbPath: string
  let moduleName: string
  let className: string
  
  if (company === 'MTN') {
    scriptPath = path.join(process.cwd(), 'mtn_vector_search.py')
    dbPath = path.join(process.cwd(), 'mtn_vector_db')
    moduleName = 'mtn_vector_search'
    className = 'MTNVectorSearch'
  } else if (company === 'UEDCL') {
    scriptPath = path.join(process.cwd(), 'uedcl_vector_search.py')
    dbPath = path.join(process.cwd(), 'uedcl_vector_db')
    moduleName = 'uedcl_vector_search'
    className = 'UEDCLVectorSearch'
  } else if (company === 'NWSC') {
    scriptPath = path.join(process.cwd(), 'nwsc_vector_search.py')
    dbPath = path.join(process.cwd(), 'nwsc_vector_db')
    moduleName = 'nwsc_vector_search'
    className = 'NWSCVectorSearch'
  } else if (company === 'URA') {
    scriptPath = path.join(process.cwd(), 'ura_vector_search.py')
    dbPath = path.join(process.cwd(), 'ura_vector_db')
    moduleName = 'ura_vector_search'
    className = 'URAVectorSearch'
  } else {
    throw new Error(`Vector search not supported for company: ${company}`)
  }
  
  // Check if required files exist
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Vector search module not found: ${scriptPath}`)
  }
  
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Vector database not found: ${dbPath}`)
  }

  // Create a Python script to run the search
  const pythonScript = `
import json
import sys
from ${moduleName} import ${className}

try:
    query = sys.argv[1]
    n_results = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    
    searcher = ${className}()
    results = searcher.search(query, n_results=n_results)
    
    # Convert results to JSON-serializable format
    output = []
    for r in results:
        output.append({
            'content': r['content'],
            'metadata': r.get('metadata', {}),
            'score': float(r.get('score', 0.0))
        })
    
    print(json.dumps(output))
except Exception as e:
    error_output = {'error': str(e), 'type': type(e).__name__}
    print(json.dumps(error_output))
    sys.exit(1)
`

  // Write temporary Python script
  const tempScriptPath = path.join(process.cwd(), 'temp_vector_search.py')
  fs.writeFileSync(tempScriptPath, pythonScript)

  try {
    // Execute Python script with shorter timeout to fail fast
    const { stdout, stderr } = await execAsync(
      `python "${tempScriptPath}" "${query.replace(/"/g, '\\"')}" ${nResults}`,
      {
        cwd: process.cwd(),
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        timeout: 5000, // 5 second timeout - fail fast if vector search is slow
      }
    )

    // Clean up temp script
    fs.unlinkSync(tempScriptPath)

    if (stderr && !stderr.includes('INFO')) {
      console.warn('Python stderr:', stderr)
    }

    // Parse JSON output
    const results = JSON.parse(stdout.trim())

    // Check if it's an error response
    if (results.error) {
      throw new Error(`Vector search error: ${results.error}`)
    }

    return Array.isArray(results) ? results : []

  } catch (execError: any) {
    // Clean up temp script on error
    if (fs.existsSync(tempScriptPath)) {
      fs.unlinkSync(tempScriptPath)
    }
    throw execError
  }
}

/**
 * Load knowledge base from file system (SERVER-SIDE ONLY)
 */
function loadKnowledgeBaseServer(company: string): KnowledgeBase | null {
  try {
    // Return from cache if already loaded
    if (knowledgeBaseCache[company]) {
      console.log(`✅ Using cached knowledge base for ${company}`)
      return knowledgeBaseCache[company]
    }

    // Get the file path
    const relativePath = COMPANY_KB_MAP[company]
    if (!relativePath) {
      console.warn(`No knowledge base configured for ${company}`)
      return null
    }

    // Read from file system
    const fullPath = path.join(process.cwd(), 'public', relativePath)
    console.log(`📂 Loading from file system: ${fullPath}`)
    
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ File not found: ${fullPath}`)
      return null
    }
    
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const knowledgeBase: KnowledgeBase = JSON.parse(fileContents)
    
    // Cache it
    knowledgeBaseCache[company] = knowledgeBase
    console.log(`✅ Knowledge base cached for ${company}`)
    
    return knowledgeBase
  } catch (error) {
    console.error(`❌ Error loading knowledge base for ${company}:`, error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI is configured
    if (!hasOpenAI) {
      console.error('❌ No AI provider API key found in environment variables')
      return NextResponse.json(
        { error: 'No AI provider configured. Please set OPENAI_API_KEY' },
        { status: 500 }
      )
    }

    console.log('✅ Available providers: OpenAI')

    const { company, message, chatHistory, preferredProvider } = await request.json()

    console.log('📨 Received request:', { company, message: message.substring(0, 50), preferredProvider })

    if (!company || !message) {
      return NextResponse.json(
        { error: 'Company and message are required' },
        { status: 400 }
      )
    }

    // Load company knowledge base
    console.log('📚 Loading knowledge base for:', company)
    const knowledgeBase = loadKnowledgeBaseServer(company)
    
    if (!knowledgeBase) {
      console.error('❌ No knowledge base found for:', company)
      return NextResponse.json(
        { error: `No knowledge base found for ${company}` },
        { status: 404 }
      )
    }

    // Flexible: support products, services, or any array
    const itemsCount = (knowledgeBase as any).products?.length || (knowledgeBase as any).services?.length || (knowledgeBase as any).items?.length || 0
    console.log('✅ Knowledge base loaded, items:', itemsCount)

    // Try vector search first for MTN, UEDCL, NWSC, and URA (RAG with embeddings)
    // Disabled by default - enable if vector search is working properly
    const ENABLE_VECTOR_SEARCH = true // Set to true to enable vector search
    const COMPANIES_WITH_VECTOR_SEARCH = ['MTN', 'UEDCL', 'NWSC', 'URA']
    
    let vectorSearchResults: any[] = []
    let useVectorSearch = false
    
    if (COMPANIES_WITH_VECTOR_SEARCH.includes(company) && ENABLE_VECTOR_SEARCH) {
      try {
        console.log(`🔍 Attempting vector search (RAG) for ${company}...`)
        // Add timeout wrapper for vector search
        const vectorSearchPromise = performVectorSearch(message, company, 5)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Vector search timeout')), 5000)
        )
        
        vectorSearchResults = await Promise.race([vectorSearchPromise, timeoutPromise]) as any[]
        
        if (vectorSearchResults.length > 0) {
          useVectorSearch = true
          console.log(`✅ Vector search found ${vectorSearchResults.length} relevant chunks`)
        } else {
          console.warn('⚠️ Vector search returned no results, falling back to keyword search')
        }
      } catch (vectorError: any) {
        console.warn('⚠️ Vector search error, using keyword search:', vectorError.message)
        // Vector search disabled or failed, continue with keyword search
      }
    }

    // Fallback to keyword search if vector search didn't work or for other companies
    let relevantProducts: any[] = []
    if (!useVectorSearch) {
      relevantProducts = searchProducts(knowledgeBase, message)
      console.log('🔍 Keyword search found products:', relevantProducts.length)
    }
    
    // Build context from knowledge base (RAG-enhanced for MTN)
    let context = `You are a friendly and helpful customer support agent for ${company}.\n\n`
    
    if (useVectorSearch && vectorSearchResults.length > 0) {
      // Use vector search results for better semantic matching (RAG)
      context += `Here is the most relevant information from ${company}'s knowledge base based on semantic similarity:\n\n`
      
      vectorSearchResults.slice(0, 5).forEach((result, index) => {
        const metadata = result.metadata || {}
        const score = result.score || 0
        const content = result.content || ''
        
        context += `[Source ${index + 1}]`
        if (metadata.topic) context += ` ${metadata.topic}`
        if (metadata.category) context += ` (${metadata.category})`
        context += `\n${content}\n\n`
      })
      
      context += `Note: These results are ranked by semantic similarity to the user's query. Use this information to provide accurate, contextually relevant answers.\n\n`
      
    } else if (relevantProducts.length > 0) {
      // Fallback to keyword-based search (flexible schema)
      context += `Here is relevant information about ${company} products/services:\n\n`
      
      relevantProducts.slice(0, 3).forEach((item, index) => {
        // Get name from any possible field
        const itemName = item.product_name || item.service_name || item.name || item.title || `Item ${index + 1}`
        context += `${index + 1}. ${itemName}\n`
        
        // Add overview/description if available
        const overview = item.overview || item.description
        if (overview) {
          context += `   Overview: ${overview}\n`
        }
        
        // Handle pricing (can be string or array)
        if (item.pricing) {
          if (Array.isArray(item.pricing)) {
            context += `   Pricing: ${item.pricing.join(', ')}\n`
          } else if (typeof item.pricing === 'string') {
            context += `   Pricing: ${item.pricing}\n`
          }
        }
        
        // Handle cost (can be string or array)
        if (item.cost) {
          if (Array.isArray(item.cost)) {
            context += `   Cost: ${item.cost.join(', ')}\n`
          } else if (typeof item.cost === 'string') {
            context += `   Cost: ${item.cost}\n`
          }
        }
        
        // Handle activation (array or string)
        if (item.activation) {
          if (Array.isArray(item.activation) && item.activation.length > 0) {
            context += `   Activation: ${item.activation.join(', ')}\n`
          } else if (typeof item.activation === 'string') {
            context += `   Activation: ${item.activation}\n`
          }
        }
        
        // Handle USSD codes (array)
        if (Array.isArray(item.ussd_codes) && item.ussd_codes.length > 0) {
          context += `   USSD Codes: ${item.ussd_codes.join(', ')}\n`
        }
        
        // Handle features (can be string or array)
        if (item.features) {
          if (Array.isArray(item.features) && item.features.length > 0) {
            context += `   Features: ${item.features.slice(0, 3).join(', ')}\n`
          } else if (typeof item.features === 'string') {
            context += `   Features: ${item.features}\n`
          }
        }
        
        // Handle FAQs (can be array of objects, array of strings, or single object)
        if (item.faqs) {
          if (Array.isArray(item.faqs) && item.faqs.length > 0) {
            const faqText = item.faqs.slice(0, 2).map((faq: FAQ | string | any) => {
              if (typeof faq === 'string') return faq
              if (faq.question && faq.answer) {
                return `Q: ${faq.question} A: ${faq.answer}`
              }
              return JSON.stringify(faq)
            }).join('; ')
            context += `   FAQs: ${faqText}\n`
          }
        }
        
        // Handle contact info (string or object)
        if (item.contact_info) {
          if (typeof item.contact_info === 'string') {
            context += `   Contact: ${item.contact_info}\n`
          } else if (typeof item.contact_info === 'object') {
            const contactParts = []
            if (item.contact_info.phone) contactParts.push(item.contact_info.phone)
            if (item.contact_info.email) contactParts.push(item.contact_info.email)
            if (contactParts.length > 0) {
              context += `   Contact: ${contactParts.join(', ')}\n`
            }
          }
        }
        
        // Add source URL if available
        if (item.source_url) {
          context += `   Source: ${item.source_url}\n`
        }
        
        context += '\n'
      })
    } else {
      context += `No specific information found for the query, but you can still provide general ${company} customer support.\n\n`
    }

    context += `\nInstructions:
- Be conversational, friendly, and helpful
- Use emojis naturally but don't overdo it
- Provide clear, concise answers
- If asked about pricing, quote the exact prices from the knowledge base
- If asked how to activate, provide the exact steps or USSD codes
- For payment queries, direct them to use the payment assistant on the home screen
- Always maintain a professional yet friendly tone
- If you don't know something, suggest contacting customer support directly
- End with a helpful question or suggestion for next steps`

    // Build messages array
    const messages: any[] = [
      {
        role: 'system',
        content: context
      }
    ]

    // Add chat history (last 5 messages for context)
    if (chatHistory && chatHistory.length > 0) {
      const recentHistory = chatHistory.slice(-5)
      recentHistory.forEach((msg: any) => {
        messages.push({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        })
      })
    }

    // Add current message
    messages.push({
      role: 'user',
      content: message
    })

    // Use OpenAI for text generation
    let response: string | null = null
    let usedProvider = 'openai'
    
    if (openai) {
      try {
        console.log('🤖 Using OpenAI API...')
        
        // Add timeout to OpenAI API call to prevent long waits
        const openaiPromise = openai.chat.completions.create({
          model: 'gpt-4o-mini', // Fast and cost-effective
          messages: messages,
          temperature: 0.7, // Balanced creativity
          max_tokens: 500, // Reasonable response length
        })
        
        // 30 second timeout for OpenAI API calls
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('OpenAI API timeout after 30 seconds')), 30000)
        )
        
        const completion = await Promise.race([openaiPromise, timeoutPromise]) as any

        console.log('✅ OpenAI response received')
        response = completion.choices[0].message.content || null
        
      } catch (openaiError: any) {
        console.error('❌ OpenAI failed:', openaiError.message)
        throw openaiError
      }
    } else {
      throw new Error('OpenAI client not initialized')
    }

    // Final fallback
    if (!response) {
      response = 'I apologize, I encountered an issue connecting to our AI service. Please try again in a moment.'
      usedProvider = 'fallback'
    }

    // Strip markdown formatting from response for cleaner display
    const cleanedResponse = stripMarkdown(response)

    // Generate quick replies based on response content
    const quickReplies = generateQuickReplies(cleanedResponse, relevantProducts, vectorSearchResults)

    return NextResponse.json({
      response: cleanedResponse,
      quickReplies,
      source: useVectorSearch ? 'vector_rag' : usedProvider,
      provider: usedProvider,
      productsFound: useVectorSearch ? vectorSearchResults.length : relevantProducts.length,
      searchMethod: useVectorSearch ? 'vector_semantic' : 'keyword'
    })

  } catch (error: any) {
    console.error('❌ Error in chat API:', error)
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack?.substring(0, 200)
    })
    
    // More specific error messages with provider context
    let errorMessage = 'Failed to generate response'
    let statusCode = 500
    let fallbackAvailable = false
    
    if (error.message?.includes('API key')) {
      errorMessage = 'Invalid OpenAI API key'
      statusCode = 401
    } else if (error.message?.includes('rate limit')) {
      errorMessage = 'Rate limit exceeded. Please try again in a moment.'
      statusCode = 429
    } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
      errorMessage = 'Network error. Please check your internet connection.'
      statusCode = 503
    } else if (error.message?.includes('timeout')) {
      errorMessage = 'Request timeout. The AI service is taking too long to respond.'
      statusCode = 504
    } else if (error.message?.includes('context length') || error.message?.includes('token')) {
      errorMessage = 'Your message is too long. Please try a shorter message.'
      statusCode = 400
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error.message,
        type: error.name,
        availableProviders: {
          openai: hasOpenAI
        }
      },
      { status: statusCode }
    )
  }
}

/**
 * Generate contextual quick replies based on response
 */
function generateQuickReplies(response: string, products: any[], vectorResults: any[] = []): string[] {
  const lowerResponse = response.toLowerCase()
  const replies: string[] = []

  // Use vector results metadata if available
  if (vectorResults.length > 0) {
    const firstResult = vectorResults[0]
    const metadata = firstResult.metadata || {}
    
    // Extract topics/categories from vector results
    if (metadata.topic && !lowerResponse.includes(metadata.topic.toLowerCase())) {
      replies.push(`More about ${metadata.topic}`)
    }
    
    if (metadata.category && !lowerResponse.includes(metadata.category.toLowerCase())) {
      replies.push(`Other ${metadata.category} info`)
    }
  }

  // Add product-specific quick replies (flexible schema support)
  if (products.length > 0) {
    const product = products[0]
    
    // Handle pricing (can be string or array)
    const hasPricing = product.pricing && (
      (Array.isArray(product.pricing) && product.pricing.length > 0) ||
      (typeof product.pricing === 'string' && product.pricing.length > 0)
    )
    if (hasPricing && !lowerResponse.includes('pricing')) {
      replies.push('Show pricing')
    }
    
    // Handle activation (can be string or array)
    const hasActivation = product.activation && (
      (Array.isArray(product.activation) && product.activation.length > 0) ||
      (typeof product.activation === 'string' && product.activation.length > 0)
    )
    
    // Handle USSD codes (array)
    const hasUssdCodes = Array.isArray(product.ussd_codes) && product.ussd_codes && product.ussd_codes.length > 0
    
    if ((hasActivation || hasUssdCodes) && !lowerResponse.includes('activate')) {
      replies.push('How to activate?')
    }
    
    // Handle FAQs (can be array of objects or strings)
    const hasFaqs = product.faqs && Array.isArray(product.faqs) && product.faqs.length > 0
    if (hasFaqs && !lowerResponse.includes('faq')) {
      replies.push('FAQs')
    }
    
    // Handle features (can be string or array)
    const hasFeatures = product.features && (
      (Array.isArray(product.features) && product.features.length > 0) ||
      (typeof product.features === 'string' && product.features.length > 0)
    )
    if (hasFeatures && !lowerResponse.includes('feature')) {
      replies.push('Features')
    }
    
    // Handle contact info (if available)
    if (product.contact_info && !lowerResponse.includes('contact')) {
      replies.push('Contact information')
    }
  }

  // Add general helpful replies
  if (replies.length < 4) {
    const generalReplies = ['Other products', 'Contact support', 'Help me choose']
    generalReplies.forEach(reply => {
      if (replies.length < 4) {
        replies.push(reply)
      }
    })
  }

  return replies.slice(0, 4) // Max 4 quick replies
}

