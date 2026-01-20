'use client'

import { useState, useEffect } from 'react'
import { Search, MessageCircle, Headphones, Users, Building2, Clock, Loader2, UserPlus } from 'lucide-react'
import { subscribeToUsers, type User } from '@/lib/userService'
import { subscribeToUserStatus } from '@/lib/chatService'
import { getUserChats } from '@/lib/chatService'
import { getUserContacts } from '@/lib/contactManagement'
import AddContactModal from './AddContactModal'

interface Contact {
  id: string
  name: string
  avatar?: string
  lastMessage?: string
  timestamp?: string
  unread?: number
  online?: boolean
  type: 'personal' | 'customercare'
  company?: string
}

interface ContactsListProps {
  onSelectContact: (contact: Contact) => void
  currentUser: any
}

const customerCareServices: Contact[] = [
  { 
    id: 'cc-umeme', 
    name: 'UEDCL Support', 
    company: 'UEDCL',
    lastMessage: 'How can we help you today?', 
    timestamp: 'Available 24/7',
    type: 'customercare'
  },
  { 
    id: 'cc-nwsc', 
    name: 'NWSC Customer Care', 
    company: 'NWSC',
    lastMessage: 'Water bill inquiries & support', 
    timestamp: 'Available 24/7',
    type: 'customercare'
  },
  { 
    id: 'cc-mtn', 
    name: 'MTN Support', 
    company: 'MTN',
    lastMessage: 'Airtime, data & more', 
    timestamp: 'Available 24/7',
    type: 'customercare'
  },
  { 
    id: 'cc-airtel', 
    name: 'Airtel Customer Care', 
    company: 'Airtel',
    lastMessage: 'We\'re here to help', 
    timestamp: 'Available 24/7',
    type: 'customercare'
  },
  { 
    id: 'cc-dstv', 
    name: 'DStv Support', 
    company: 'DStv',
    lastMessage: 'Subscription & decoder help', 
    timestamp: 'Available 24/7',
    type: 'customercare'
  },
  { 
    id: 'cc-ura', 
    name: 'URA Support', 
    company: 'URA',
    lastMessage: 'Tax services & inquiries', 
    timestamp: 'Available 24/7',
    type: 'customercare'
  },
]

export default function ContactsList({ onSelectContact, currentUser }: ContactsListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'personal' | 'customercare'>('all')
  const [realUsers, setRealUsers] = useState<Contact[]>([])
  const [userStatuses, setUserStatuses] = useState<{ [userId: string]: boolean }>({})
  const [isLoading, setIsLoading] = useState(true)
  const [showAddContact, setShowAddContact] = useState(false)
  const [viewMode, setViewMode] = useState<'all' | 'contacts'>('all') // Show all users or just added contacts

  // Subscribe to real users from Firebase
  useEffect(() => {
    if (!currentUser?.id && !currentUser?.email && !currentUser?.phone) {
      console.log('⚠️ No current user, skipping Firebase subscription')
      setIsLoading(false)
      return
    }

    const currentUserId = currentUser.id || currentUser.email || currentUser.phone
    console.log('📡 Starting user subscription for:', currentUserId)
    
    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.warn('⏱️ Loading timeout - setting isLoading to false')
      setIsLoading(false)
    }, 3000) // 3 seconds max loading time
    
    const loadUsers = async () => {
      try {
        if (viewMode === 'contacts') {
          // Load only added contacts
          const contacts = await getUserContacts(currentUserId)
          console.log('✅ Loaded contacts:', contacts.length)
          const formattedContacts: Contact[] = contacts.map(user => ({
            id: user.id,
            name: user.name || user.phone || user.email || 'Unknown User',
            lastMessage: 'Start a conversation',
            timestamp: 'Available',
            online: false,
            type: 'personal' as const
          }))
          setRealUsers(formattedContacts)
          setIsLoading(false)
          clearTimeout(loadingTimeout)
          
          // Subscribe to statuses
          contacts.forEach(user => {
            subscribeToUserStatus(user.id, (online) => {
              setUserStatuses(prev => ({
                ...prev,
                [user.id]: online
              }))
            })
          })
        } else {
          // Load all users
          const unsubscribeUsers = subscribeToUsers(currentUserId, (users: User[]) => {
            console.log('✅ Received users from Firebase:', users.length)
            const formattedContacts: Contact[] = users.map(user => ({
              id: user.id,
              name: user.name || user.phone || user.email || 'Unknown User',
              lastMessage: 'Start a conversation',
              timestamp: 'Available',
              online: false,
              type: 'personal' as const
            }))
            
            setRealUsers(formattedContacts)
            setIsLoading(false)
            clearTimeout(loadingTimeout)

            // Subscribe to each user's status
            users.forEach(user => {
              subscribeToUserStatus(user.id, (online) => {
                setUserStatuses(prev => ({
                  ...prev,
                  [user.id]: online
                }))
              })
            })
          })

          return () => {
            clearTimeout(loadingTimeout)
            unsubscribeUsers()
          }
        }
      } catch (err) {
        console.error('❌ Error loading users:', err)
        setIsLoading(false)
        clearTimeout(loadingTimeout)
      }
    }

    loadUsers()
    
    return () => {
      clearTimeout(loadingTimeout)
    }
  }, [currentUser, viewMode])

  // Combine real users with customer care services
  const allContacts = [...realUsers, ...customerCareServices].map(contact => ({
    ...contact,
    online: contact.type === 'personal' ? userStatuses[contact.id] || false : contact.online
  }))

  const filteredContacts = allContacts.filter((contact) => {
    const matchesSearch = contact.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTab = 
      activeTab === 'all' || 
      (activeTab === 'personal' && contact.type === 'personal') ||
      (activeTab === 'customercare' && contact.type === 'customercare')
    return matchesSearch && matchesTab
  })

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getAvatarColor = (id: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-orange-500',
      'bg-teal-500',
      'bg-indigo-500',
    ]
    const index = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
    return colors[index]
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Search Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full bg-gray-100 dark:bg-gray-700 border-none outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
            />
          </div>
          <button
            onClick={() => setShowAddContact(true)}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-full font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <UserPlus size={18} />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'all'
                ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Users size={16} />
            <span>All</span>
          </button>
          <button
            onClick={() => setActiveTab('personal')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'personal'
                ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <MessageCircle size={16} />
            <span>Chats</span>
          </button>
          <button
            onClick={() => setActiveTab('customercare')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'customercare'
                ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Headphones size={16} />
            <span>Support</span>
          </button>
        </div>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 p-4">
            <Loader2 size={48} className="mb-2 opacity-50 animate-spin" />
            <p>Loading contacts...</p>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 p-4">
            <MessageCircle size={48} className="mb-2 opacity-50" />
            <p>No contacts found</p>
            {activeTab === 'personal' && realUsers.length === 0 && (
              <p className="text-xs mt-2 text-center">No other users registered yet.<br/>Ask someone to sign up!</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredContacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => onSelectContact(contact)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${
                      contact.type === 'customercare' 
                        ? 'bg-gradient-to-br from-primary-500 to-primary-700' 
                        : getAvatarColor(contact.id)
                    }`}
                  >
                    {contact.type === 'customercare' ? (
                      <Building2 size={24} />
                    ) : (
                      getInitials(contact.name)
                    )}
                  </div>
                  {contact.online && contact.type === 'personal' && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                  )}
                </div>

                {/* Contact Info */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {contact.name}
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      {contact.type === 'customercare' && <Clock size={12} />}
                      {contact.timestamp}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {contact.lastMessage}
                    </p>
                    {contact.unread && contact.unread > 0 && (
                      <span className="ml-2 bg-primary-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                        {contact.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {showAddContact && (
        <AddContactModal
          currentUser={currentUser}
          onClose={() => setShowAddContact(false)}
          onContactAdded={() => {
            // Reload contacts after adding
            setViewMode('all') // Switch to view all to see the new contact
            setIsLoading(true)
            setTimeout(() => setIsLoading(false), 500)
          }}
        />
      )}
    </div>
  )
}

