'use client'

import { useState, useEffect } from 'react'
import { Phone, Search, Filter, Download, ChevronDown, ChevronUp, Copy, Calendar, Clock, Building2, User } from 'lucide-react'

interface CallRecord {
  id: string
  company: string
  user: string
  summary: string | null
  fullTranscript: Array<{
    userMessage: string
    aiResponse: string
    timestamp: Date | string
  }>
  duration: string
  timestamp: string
  createdAt: string
}

export default function AdminCallHistory() {
  const [calls, setCalls] = useState<CallRecord[]>([])
  const [filteredCalls, setFilteredCalls] = useState<CallRecord[]>([])
  const [expandedCall, setExpandedCall] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCompany, setFilterCompany] = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')

  // Load call history
  useEffect(() => {
    loadCallHistory()
  }, [])

  // Apply filters when search/filters change
  useEffect(() => {
    applyFilters()
  }, [calls, searchQuery, filterCompany, filterUser, dateFilter])

  const loadCallHistory = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/voice/history?limit=100')
      if (response.ok) {
        const data = await response.json()
        setCalls(data.calls || [])
      } else {
        console.error('Failed to load call history')
      }
    } catch (error) {
      console.error('Error loading call history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...calls]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(call => 
        call.summary?.toLowerCase().includes(query) ||
        call.user.toLowerCase().includes(query) ||
        call.company.toLowerCase().includes(query) ||
        call.fullTranscript.some(item => 
          item.userMessage.toLowerCase().includes(query) ||
          item.aiResponse.toLowerCase().includes(query)
        )
      )
    }

    // Company filter
    if (filterCompany) {
      filtered = filtered.filter(call => 
        call.company.toLowerCase().includes(filterCompany.toLowerCase())
      )
    }

    // User filter
    if (filterUser) {
      filtered = filtered.filter(call => 
        call.user.toLowerCase().includes(filterUser.toLowerCase())
      )
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      filtered = filtered.filter(call => {
        const callDate = new Date(call.timestamp)
        
        switch (dateFilter) {
          case 'today':
            return callDate >= today
          case 'week':
            const weekAgo = new Date(today)
            weekAgo.setDate(weekAgo.getDate() - 7)
            return callDate >= weekAgo
          case 'month':
            const monthAgo = new Date(today)
            monthAgo.setMonth(monthAgo.getMonth() - 1)
            return callDate >= monthAgo
          default:
            return true
        }
      })
    }

    setFilteredCalls(filtered)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // You could add a toast notification here
  }

  const exportCall = (call: CallRecord) => {
    const content = `Voice Call Record
==================

Company: ${call.company}
User: ${call.user}
Date: ${formatDate(call.timestamp)}
Duration: ${call.duration}

Summary:
${call.summary || 'No summary available'}

Full Transcript:
${call.fullTranscript.map((item, index) => 
  `\nQ${index + 1}: ${item.userMessage}\nA${index + 1}: ${item.aiResponse}`
).join('\n\n')}
`

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `call-${call.id}-${call.timestamp.split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getUniqueCompanies = () => {
    return Array.from(new Set(calls.map(call => call.company))).sort()
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading call history...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Phone size={24} />
              Voice Call History
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {filteredCalls.length} {filteredCalls.length === 1 ? 'call' : 'calls'} found
            </p>
          </div>
          <button
            onClick={loadCallHistory}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Search and Filters */}
        <div className="space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search calls, users, companies, or transcripts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>

            <select
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Companies</option>
              {getUniqueCompanies().map(company => (
                <option key={company} value={company}>{company}</option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Filter by user..."
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Call List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredCalls.length === 0 ? (
          <div className="text-center py-12">
            <Phone size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">No calls found</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
              {calls.length === 0 
                ? 'No voice calls have been made yet.' 
                : 'Try adjusting your search or filters.'}
            </p>
          </div>
        ) : (
          filteredCalls.map((call) => (
            <div
              key={call.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Call Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-gray-500" />
                        <span className="font-semibold text-gray-900 dark:text-white">{call.company}</span>
                      </div>
                      <span className="text-gray-400">•</span>
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-500" />
                        <span className="text-gray-700 dark:text-gray-300">{call.user}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span>{formatDate(call.timestamp)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>{call.duration}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(call.summary || '')}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Copy Summary"
                    >
                      <Copy size={16} className="text-gray-500" />
                    </button>
                    <button
                      onClick={() => exportCall(call)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Export Call"
                    >
                      <Download size={16} className="text-gray-500" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Summary Section */}
              {call.summary && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Phone size={16} className="text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Summary</span>
                  </div>
                  <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{call.summary}</p>
                </div>
              )}

              {/* Full Transcript Toggle */}
              <div className="p-4">
                <button
                  onClick={() => setExpandedCall(expandedCall === call.id ? null : call.id)}
                  className="w-full flex items-center justify-between text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                >
                  <span>
                    {expandedCall === call.id ? 'Hide' : 'View'} Full Transcript 
                    {call.fullTranscript.length > 0 && (
                      <span className="text-gray-500 ml-2">
                        ({call.fullTranscript.length} {call.fullTranscript.length === 1 ? 'exchange' : 'exchanges'})
                      </span>
                    )}
                  </span>
                  {expandedCall === call.id ? (
                    <ChevronUp size={18} />
                  ) : (
                    <ChevronDown size={18} />
                  )}
                </button>
              </div>

              {/* Full Transcript (Expanded) */}
              {expandedCall === call.id && call.fullTranscript.length > 0 && (
                <div className="p-4 pt-0 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Full Transcript:</h4>
                  <div className="space-y-3">
                    {call.fullTranscript.map((item, index) => {
                      const itemTimestamp = typeof item.timestamp === 'string' 
                        ? new Date(item.timestamp) 
                        : item.timestamp
                      
                      return (
                        <div key={index} className="space-y-2">
                          {/* User Question */}
                          <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-3 border-l-4 border-primary-500">
                            <div className="flex items-start justify-between mb-1">
                              <span className="text-xs font-semibold text-primary-700 dark:text-primary-300">
                                Q{index + 1}: {item.userMessage}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {itemTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </p>
                          </div>

                          {/* AI Response */}
                          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 border-l-4 border-gray-400 dark:border-gray-600 ml-4">
                            <p className="text-sm text-gray-800 dark:text-gray-200">{item.aiResponse}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              AI Agent
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

