/**
 * Vector Search Utility
 * 
 * Helper functions for vector search integration
 * This bridges TypeScript/Next.js with the Python vector search module
 */

export interface VectorSearchResult {
  content: string
  metadata: {
    category?: string
    topic?: string
    type?: string
    source_url?: string
    [key: string]: any
  }
  score: number
}

export interface VectorSearchResponse {
  results: VectorSearchResult[]
  query: string
  n_results: number
  source: 'vector_db'
}

/**
 * Search the vector database via API
 * This calls the /api/vector-search endpoint
 */
export async function searchVectorDB(
  query: string,
  nResults: number = 5,
  company: string = 'MTN'
): Promise<VectorSearchResult[]> {
  try {
    const response = await fetch('/api/vector-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        n_results: nResults,
        company,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Vector search failed')
    }

    const data: VectorSearchResponse = await response.json()
    return data.results || []
  } catch (error: any) {
    console.error('Vector search error:', error)
    throw error
  }
}

/**
 * Check if vector search is available
 */
export async function isVectorSearchAvailable(company: string = 'MTN'): Promise<boolean> {
  try {
    const response = await fetch('/api/vector-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'test',
        n_results: 1,
        company,
      }),
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Format vector search results for display
 */
export function formatVectorResults(results: VectorSearchResult[]): string {
  if (results.length === 0) {
    return 'No results found.'
  }

  return results
    .map((result, index) => {
      const metadata = result.metadata || {}
      let formatted = `[Result ${index + 1}]`
      
      if (metadata.topic) {
        formatted += ` ${metadata.topic}`
      }
      if (metadata.category) {
        formatted += ` (${metadata.category})`
      }
      if (result.score !== undefined) {
        formatted += ` [Similarity: ${(1 - result.score).toFixed(2)}]`
      }
      
      formatted += `\n${result.content}\n`
      return formatted
    })
    .join('\n---\n\n')
}

