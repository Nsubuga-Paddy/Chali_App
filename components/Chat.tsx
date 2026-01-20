'use client'

import { useState } from 'react'
import ContactsList from './ContactsList'
import PersonalChat from './PersonalChat'
import CustomerCareChat from './CustomerCareChat'

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

interface ChatProps {
  user: any
  onChatStateChange?: (inChat: boolean) => void
}

export default function Chat({ user, onChatStateChange }: ChatProps) {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact)
    onChatStateChange?.(true) // Notify that we're in a chat
  }

  const handleBackToContacts = () => {
    setSelectedContact(null)
    onChatStateChange?.(false) // Notify that we're back to contacts list
  }

  // Show appropriate chat view based on selected contact
  if (selectedContact) {
    if (selectedContact.type === 'customercare') {
      return (
        <CustomerCareChat
          contact={selectedContact}
          onBack={handleBackToContacts}
          user={user}
        />
      )
    } else {
      return (
        <PersonalChat
          contact={selectedContact}
          onBack={handleBackToContacts}
          user={user}
        />
      )
    }
  }

  // Show contacts list by default
  return <ContactsList onSelectContact={handleSelectContact} currentUser={user} />
}

