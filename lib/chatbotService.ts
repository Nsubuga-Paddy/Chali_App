// Chatbot Service - Generates intelligent responses using knowledge bases

import { 
  loadKnowledgeBase, 
  searchProducts, 
  type KnowledgeBase, 
  type Product 
} from './knowledgeBase'

export interface ChatResponse {
  content: string
  quickReplies?: string[]
  source?: 'knowledge_base' | 'fallback'
}

/**
 * Generate a response for a customer care query
 */
export async function generateCustomerCareResponse(
  company: string,
  userMessage: string
): Promise<ChatResponse> {
  // Load the company's knowledge base
  const knowledgeBase = await loadKnowledgeBase(company)
  
  // If no knowledge base, return fallback
  if (!knowledgeBase) {
    return generateFallbackResponse(company, userMessage)
  }
  
  // Search for relevant products
  const results = searchProducts(knowledgeBase, userMessage)
  
  // If we found results, generate response from knowledge base
  if (results.length > 0) {
    return generateKnowledgeBasedResponse(results, userMessage, company)
  }
  
  // If no results, return fallback
  return generateFallbackResponse(company, userMessage)
}

/**
 * Generate response based on knowledge base results
 */
function generateKnowledgeBasedResponse(
  products: Product[],
  userMessage: string,
  company: string
): ChatResponse {
  const lowerMessage = userMessage.toLowerCase()
  const topProduct = products[0]
  
  // Helper to format array data
  const formatArray = (arr: string[], prefix: string = '•') => {
    if (!arr || arr.length === 0) return 'Not available'
    return arr.map(item => `${prefix} ${item}`).join('\n')
  }
  
  // Helper to get product overview
  const getOverview = () => {
    if (topProduct.overview) return topProduct.overview
    if (topProduct.features.length > 0) return formatArray(topProduct.features.slice(0, 3))
    return 'Product information available'
  }
  
  // Determine what the user is asking about
  if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('how much')) {
    const pricingInfo = topProduct.pricing.length > 0 
      ? formatArray(topProduct.pricing, '💰')
      : (topProduct.cost.length > 0 ? formatArray(topProduct.cost, '💰') : 'Pricing information not available')
    
    return {
      content: `📊 **${topProduct.product_name} - Pricing**\n\n${pricingInfo}\n\n${getOverview()}`,
      quickReplies: ['How to activate?', 'Show USSD codes', 'Show features'],
      source: 'knowledge_base'
    }
  }
  
  if (lowerMessage.includes('activate') || lowerMessage.includes('subscribe') || lowerMessage.includes('how do i') || lowerMessage.includes('ussd') || lowerMessage.includes('code') || lowerMessage.includes('dial')) {
    const activationInfo = topProduct.activation.length > 0 
      ? formatArray(topProduct.activation, '📱')
      : 'Activation information not available'
    
    const ussdCodes = topProduct.ussd_codes.length > 0
      ? `\n\n**USSD Codes:**\n${formatArray(topProduct.ussd_codes, '📞')}`
      : ''
    
    return {
      content: `✅ **How to activate ${topProduct.product_name}**\n\n${activationInfo}${ussdCodes}`,
      quickReplies: ['Pricing', 'Show FAQs', 'Features'],
      source: 'knowledge_base'
    }
  }
  
  if (lowerMessage.includes('deactivate') || lowerMessage.includes('cancel') || lowerMessage.includes('stop') || lowerMessage.includes('unsubscribe')) {
    const deactivationInfo = topProduct.deactivation.length > 0
      ? formatArray(topProduct.deactivation, '🛑')
      : 'To deactivate, contact customer support or check the activation USSD code'
    
    return {
      content: `🛑 **Deactivation for ${topProduct.product_name}**\n\n${deactivationInfo}`,
      quickReplies: ['Show other products', 'Contact support', 'Pricing'],
      source: 'knowledge_base'
    }
  }
  
  if (lowerMessage.includes('faq') || lowerMessage.includes('question') || lowerMessage.includes('help')) {
    let faqInfo = 'No FAQs available for this product'
    
    if (topProduct.faqs.length > 0) {
      // Handle both object FAQs and string FAQs
      const faqItems = topProduct.faqs.slice(0, 5).map((faq, index) => {
        if (typeof faq === 'string') {
          return `${index + 1}. ${faq}`
        }
        return `**Q: ${faq.question}**\n   A: ${faq.answer}`
      }).join('\n\n')
      
      faqInfo = faqItems + (topProduct.faqs.length > 5 ? '\n\n...and more' : '')
    }
    
    return {
      content: `❓ **${topProduct.product_name} - FAQs**\n\n${faqInfo}`,
      quickReplies: ['Pricing', 'How to activate', 'Features'],
      source: 'knowledge_base'
    }
  }
  
  if (lowerMessage.includes('feature') || lowerMessage.includes('benefit') || lowerMessage.includes('what can')) {
    const featuresInfo = topProduct.features.length > 0
      ? formatArray(topProduct.features, '✨')
      : (topProduct.overview || 'Features information not available')
    
    return {
      content: `✨ **${topProduct.product_name} - Features**\n\n${featuresInfo}`,
      quickReplies: ['Pricing', 'How to activate', 'FAQs'],
      source: 'knowledge_base'
    }
  }
  
  if (lowerMessage.includes('terms') || lowerMessage.includes('conditions') || lowerMessage.includes('rules') || lowerMessage.includes('validity')) {
    const termsInfo = topProduct.terms || 'Terms and conditions not available'
    const validityInfo = topProduct.validity ? `\n\n**Validity:** ${topProduct.validity}` : ''
    
    return {
      content: `📜 **${topProduct.product_name} - Terms & Conditions**\n\n${termsInfo}${validityInfo}`,
      quickReplies: ['How to activate', 'Pricing', 'FAQs'],
      source: 'knowledge_base'
    }
  }
  
  if (lowerMessage.includes('use') || lowerMessage.includes('work') || lowerMessage.includes('guide')) {
    const howToUseInfo = topProduct.how_to_use.length > 0
      ? formatArray(topProduct.how_to_use, '📝')
      : getOverview()
    
    return {
      content: `📝 **How to use ${topProduct.product_name}**\n\n${howToUseInfo}`,
      quickReplies: ['Pricing', 'USSD codes', 'FAQs'],
      source: 'knowledge_base'
    }
  }
  
  // Default: provide comprehensive info about the top result
  const overview = getOverview()
  const pricingPreview = topProduct.pricing.length > 0 
    ? `\n\n💰 **Pricing:** ${topProduct.pricing[0]}${topProduct.pricing.length > 1 ? '...' : ''}`
    : ''
  const activationPreview = topProduct.ussd_codes.length > 0
    ? `\n\n📱 **Quick Access:** ${topProduct.ussd_codes[0]}`
    : ''
  
  return {
    content: `ℹ️ **${topProduct.product_name}**\n\n${overview}${pricingPreview}${activationPreview}`,
    quickReplies: ['Pricing', 'How to activate', 'Features', 'FAQs'],
    source: 'knowledge_base'
  }
}

/**
 * Generate fallback response when knowledge base doesn't have answer
 */
function generateFallbackResponse(company: string, userMessage: string): ChatResponse {
  const lowerMessage = userMessage.toLowerCase()
  
  // Check for common queries and provide helpful responses
  if (lowerMessage.includes('airtime') || lowerMessage.includes('credit')) {
    return {
      content: `📱 For airtime purchases, you can use our payment assistant!\n\nJust click the floating button on the home screen or type your airtime request here.`,
      quickReplies: ['Buy airtime', 'Data bundles', 'Contact support'],
      source: 'fallback'
    }
  }
  
  if (lowerMessage.includes('data') || lowerMessage.includes('bundle')) {
    return {
      content: `📶 I can help you with data bundles! What would you like to know?\n\n• Pricing\n• Activation codes\n• Data balance check\n• Data sharing`,
      quickReplies: ['Show prices', 'How to activate', 'Check balance'],
      source: 'fallback'
    }
  }
  
  if (lowerMessage.includes('payment') || lowerMessage.includes('pay') || lowerMessage.includes('bill')) {
    return {
      content: `💳 For payments, please use our main payment assistant by clicking the floating button on the home screen.\n\nI'm here specifically to help with ${company} products, services, and technical support!`,
      quickReplies: ['Show products', 'Technical help', 'FAQs'],
      source: 'fallback'
    }
  }
  
  // Generic helpful response
  return {
    content: `I'm here to help with ${company} services! 😊\n\nI can assist you with:\n• Product information\n• Activation & deactivation\n• Pricing details\n• FAQs and troubleshooting\n• Terms & conditions\n\nWhat would you like to know?`,
    quickReplies: ['Show all products', 'Popular services', 'Contact support'],
    source: 'fallback'
  }
}

/**
 * Get quick start suggestions for a company
 */
export async function getQuickStartSuggestions(company: string): Promise<string[]> {
  const knowledgeBase = await loadKnowledgeBase(company)
  
  if (!knowledgeBase || knowledgeBase.products.length === 0) {
    return ['View products', 'Pricing', 'How to activate', 'FAQs']
  }
  
  // Generate suggestions from top products
  const topProducts = knowledgeBase.products.slice(0, 4)
  return topProducts.map(p => p.product_name)
}

/**
 * Check if message is a payment-related query
 */
export function isPaymentQuery(message: string): boolean {
  const lowerMessage = message.toLowerCase()
  const paymentKeywords = ['pay', 'payment', 'send money', 'transfer', 'buy', 'purchase']
  return paymentKeywords.some(keyword => lowerMessage.includes(keyword))
}

/**
 * Extract amount from message (e.g., "buy 5000 airtime" -> 5000)
 */
export function extractAmount(message: string): number | null {
  const match = message.match(/\d{3,}/g)
  if (match) {
    return parseInt(match[0])
  }
  return null
}

