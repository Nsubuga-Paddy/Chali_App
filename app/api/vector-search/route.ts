import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'

const execAsync = promisify(exec)

/**
 * API route to search vector databases using Python
 * This bridges Next.js with the Python vector search modules
 * Supports: MTN, UEDCL, NWSC, URA
 */
export async function POST(request: NextRequest) {
  try {
    const { query, n_results = 5, company = 'MTN' } = await request.json()

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

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
      return NextResponse.json(
        { error: `Vector search is not available for ${company}. Supported companies: MTN, UEDCL, NWSC, URA` },
        { status: 400 }
      )
    }

    // Check if Python script exists
    if (!fs.existsSync(scriptPath)) {
      console.error(`❌ ${path.basename(scriptPath)} not found`)
      return NextResponse.json(
        { error: `Vector search module not found: ${path.basename(scriptPath)}` },
        { status: 500 }
      )
    }

    // Check if vector database exists
    if (!fs.existsSync(dbPath)) {
      console.error(`❌ ${path.basename(dbPath)} directory not found`)
      return NextResponse.json(
        { error: `Vector database not found. Please build the database first for ${company}.` },
        { status: 500 }
      )
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
      // Execute Python script
      const { stdout, stderr } = await execAsync(
        `python "${tempScriptPath}" "${query.replace(/"/g, '\\"')}" ${n_results}`,
        {
          cwd: process.cwd(),
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          timeout: 30000, // 30 second timeout
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
        console.error('❌ Python error:', results.error)
        return NextResponse.json(
          { error: `Vector search error: ${results.error}`, details: results },
          { status: 500 }
        )
      }

      console.log(`✅ Vector search completed: ${results.length} results`)

      return NextResponse.json({
        results,
        query,
        n_results: results.length,
        source: 'vector_db'
      })

    } catch (execError: any) {
      // Clean up temp script on error
      if (fs.existsSync(tempScriptPath)) {
        fs.unlinkSync(tempScriptPath)
      }

      console.error('❌ Error executing Python script:', execError)
      
      // Check if it's a Python not found error
      if (execError.message?.includes('python') || execError.message?.includes('Python')) {
        return NextResponse.json(
          { error: 'Python is not installed or not in PATH. Vector search requires Python.' },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { error: `Vector search failed: ${execError.message}` },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('❌ Error in vector search API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

