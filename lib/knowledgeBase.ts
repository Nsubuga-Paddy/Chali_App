// Knowledge Base Service - Loads and searches company knowledge bases

export interface FAQ {
  question: string
  answer: string
}

export interface Product {
  product_name: string
  overview: string | null
  features: string[]
  pricing: string[]
  cost: string[]
  activation: string[]
  deactivation: string[]
  ussd_codes: string[]
  how_to_use: string[]
  validity: string | null
  faqs: FAQ[] | string[]
  terms: string | null
  limitations: string | null
  contact_info: string | null
  source_url: string
  troubleshooting_guidance: string[]
}

export interface KnowledgeBase {
  crawl_date?: string
  base_url?: string
  total_products?: number
  company?: string
  lastUpdated?: string
  version?: string
  products: Product[]
}

// Company to knowledge base mapping
const COMPANY_KB_MAP: Record<string, string> = {
  'MTN': '/knowledge-bases/mtn/knowledge.json',
  'Airtel': '/knowledge-bases/airtel/knowledge.json',
  'UEDCL': '/knowledge-bases/umeme/knowledge.json',
  'NWSC': '/knowledge-bases/nwsc/knowledge.json',
  'DStv': '/knowledge-bases/dstv/knowledge.json',
  'URA': '/knowledge-bases/ura/knowledge.json',
}

// In-memory cache for loaded knowledge bases
const knowledgeBaseCache: Record<string, KnowledgeBase> = {}

/**
 * Load a company's knowledge base (CLIENT-SIDE ONLY)
 * For server-side loading, use loadKnowledgeBaseServer in API routes
 */
export async function loadKnowledgeBase(company: string): Promise<KnowledgeBase | null> {
  try {
    // Return from cache if already loaded
    if (knowledgeBaseCache[company]) {
      console.log(`✅ Using cached knowledge base for ${company}`)
      return knowledgeBaseCache[company]
    }

    // Get the file path
    const filePath = COMPANY_KB_MAP[company]
    if (!filePath) {
      console.warn(`No knowledge base configured for ${company}`)
      return null
    }

    // CLIENT-SIDE: Fetch from public folder
    console.log(`🌐 Loading from URL (client): ${filePath}`)
    const response = await fetch(filePath)
    if (!response.ok) {
      console.warn(`Failed to load knowledge base for ${company}`)
      return null
    }
    
    const knowledgeBase: KnowledgeBase = await response.json()
    
    // Cache it
    knowledgeBaseCache[company] = knowledgeBase
    console.log(`✅ Knowledge base cached for ${company}`)
    
    return knowledgeBase
  } catch (error) {
    console.error(`❌ Error loading knowledge base for ${company}:`, error)
    return null
  }
}

/**
 * Extract searchable text from any field value (flexible schema support)
 */
function extractSearchableText(value: any): string {
  if (value === null || value === undefined) return ''
  
  if (typeof value === 'string') return value
  
  if (Array.isArray(value)) {
    return value.map(item => extractSearchableText(item)).join(' ')
  }
  
  if (typeof value === 'object') {
    return Object.values(value).map(v => extractSearchableText(v)).join(' ')
  }
  
  return String(value)
}

/**
 * Get the name field from any item (supports multiple naming conventions)
 */
function getItemName(item: any): string {
  return item.product_name || item.service_name || item.name || item.title || 'Service'
}

/**
 * Search for items in a knowledge base using keywords (flexible schema)
 * Works with products, services, or any other item array
 */
export function searchProducts(
  knowledgeBase: KnowledgeBase | any,
  query: string
): Product[] | any[] {
  const lowerQuery = query.toLowerCase()
  const keywords = lowerQuery.split(' ').filter(k => k.length > 2) // Filter out short words
  
  // Flexible: support products, services, items, or any array
  const items = knowledgeBase.products || knowledgeBase.services || knowledgeBase.items || []
  
  if (items.length === 0) {
    return []
  }
  
  const results: Array<{ item: any; score: number }> = []
  
  for (const item of items) {
    let score = 0
    
    // Extract searchable text from all fields
    const searchText = extractSearchableText(item).toLowerCase()
    
    // Get name from any possible field
    const itemName = getItemName(item)
    
    // Check for exact name match (highest priority)
    if (itemName.toLowerCase().includes(lowerQuery)) {
      score += 100
    }
    
    // Check for overview/description match
    const overview = item.overview || item.description || ''
    if (overview && String(overview).toLowerCase().includes(lowerQuery)) {
      score += 50
    }
    
    // Check for features match (flexible field)
    const features = item.features || []
    if (Array.isArray(features)) {
      for (const feature of features) {
        if (String(feature).toLowerCase().includes(lowerQuery)) {
          score += 30
        }
      }
    } else if (typeof features === 'string') {
      if (features.toLowerCase().includes(lowerQuery)) {
        score += 30
      }
    }
    
    // Check keywords in all text
    for (const keyword of keywords) {
      if (searchText.includes(keyword)) {
        score += 10
      }
    }
    
    // Boost score if item has actual content (not empty)
    if (overview || searchText.length > 100) {
      score += 5
    }
    
    if (score > 0) {
      results.push({ item, score })
    }
  }
  
  // Sort by score (highest first) and return items
  return results
    .sort((a, b) => b.score - a.score)
    .map(r => r.item)
    .slice(0, 5) // Return top 5 results
}

/**
 * Find a specific product by name
 */
export function findProductByName(
  knowledgeBase: KnowledgeBase,
  productName: string
): Product | null {
  const lowerName = productName.toLowerCase()
  return knowledgeBase.products.find(
    p => p.product_name.toLowerCase() === lowerName
  ) || null
}

/**
 * Get all products from a knowledge base
 */
export function getAllProducts(knowledgeBase: KnowledgeBase): Product[] {
  return knowledgeBase.products
}

/**
 * Clear the cache (useful for testing or force reload)
 */
export function clearCache() {
  Object.keys(knowledgeBaseCache).forEach(key => {
    delete knowledgeBaseCache[key]
  })
}

/**
 * Check if a company has a knowledge base configured
 */
export function hasKnowledgeBase(company: string): boolean {
  return company in COMPANY_KB_MAP
}

/**
 * Get list of supported companies
 */
export function getSupportedCompanies(): string[] {
  return Object.keys(COMPANY_KB_MAP)
}

