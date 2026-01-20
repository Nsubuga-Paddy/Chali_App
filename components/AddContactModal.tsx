'use client'

import { useState } from 'react'
import { X, Search, UserPlus, Share2, Loader2, Check, AlertCircle } from 'lucide-react'
import { searchUserByPhoneOrEmail, addContact, generateInviteMessage } from '@/lib/contactManagement'
import type { User } from '@/lib/userService'

interface AddContactModalProps {
  currentUser: any
  onClose: () => void
  onContactAdded: () => void
}

export default function AddContactModal({ currentUser, onClose, onContactAdded }: AddContactModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [foundUser, setFoundUser] = useState<User | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setError('Please enter a phone number or email')
      return
    }

    setIsSearching(true)
    setError('')
    setFoundUser(null)
    setSuccess(false)

    try {
      const user = await searchUserByPhoneOrEmail(searchTerm.trim())
      
      if (user) {
        // Check if it's the current user
        const currentUserId = currentUser.id || currentUser.email || currentUser.phone
        if (user.id === currentUserId) {
          setError('You cannot add yourself as a contact')
          setFoundUser(null)
        } else {
          setFoundUser(user)
        }
      } else {
        setError('User not found. They may not be registered yet.')
      }
    } catch (err) {
      console.error('Search error:', err)
      setError('Failed to search. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddContact = async () => {
    if (!foundUser) return

    setIsAdding(true)
    setError('')

    try {
      const currentUserId = currentUser.id || currentUser.email || currentUser.phone
      await addContact(currentUserId, foundUser.id)
      setSuccess(true)
      
      setTimeout(() => {
        onContactAdded()
        onClose()
      }, 1500)
    } catch (err) {
      console.error('Add contact error:', err)
      setError('Failed to add contact. Please try again.')
    } finally {
      setIsAdding(false)
    }
  }

  const handleInvite = () => {
    const inviteMessage = generateInviteMessage(
      currentUser.name,
      currentUser.phone
    )

    // Try to share via Web Share API
    if (navigator.share) {
      navigator.share({
        title: 'Join me on Chali',
        text: inviteMessage
      }).catch(console.error)
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(inviteMessage).then(() => {
        alert('Invite message copied to clipboard!')
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Add Contact
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Search Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phone Number or Email
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="0700000000 or email@example.com"
                className="flex-1 px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 border-none outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
                disabled={isSearching || isAdding}
              />
              <button
                onClick={handleSearch}
                disabled={isSearching || isAdding}
                className="px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {isSearching ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Search size={20} />
                )}
                Search
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                {error.includes('not found') && (
                  <button
                    onClick={handleInvite}
                    className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline font-medium flex items-center gap-1"
                  >
                    <Share2 size={14} />
                    Invite them to Chali
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <Check size={20} className="text-green-600 dark:text-green-400" />
              <p className="text-sm text-green-800 dark:text-green-200">
                Contact added successfully!
              </p>
            </div>
          )}

          {/* Found User */}
          {foundUser && !success && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                  {foundUser.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {foundUser.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {foundUser.phone || foundUser.email}
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleAddContact}
                disabled={isAdding}
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isAdding ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus size={20} />
                    Add to Contacts
                  </>
                )}
              </button>
            </div>
          )}

          {/* Help Text */}
          {!foundUser && !error && !isSearching && (
            <div className="text-center py-8">
              <UserPlus size={48} className="mx-auto text-gray-400 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enter a phone number or email to find users
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-b-2xl border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleInvite}
            className="w-full py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Share2 size={20} />
            Invite Friends to Chali
          </button>
        </div>
      </div>
    </div>
  )
}

