// Contact Management Service
import { ref, set, get, remove, query, orderByChild, equalTo } from 'firebase/database'
import { db } from './firebase'
import { getUser, type User } from './userService'

export interface UserContact {
  userId: string
  contactId: string
  addedAt: number
  nickname?: string
  isFavorite?: boolean
}

/**
 * Add a contact to user's contact list
 */
export const addContact = async (
  userId: string,
  contactId: string,
  nickname?: string
): Promise<void> => {
  const contactRef = ref(db, `userContacts/${userId}/${contactId}`)
  await set(contactRef, {
    contactId,
    addedAt: Date.now(),
    nickname: nickname || null,
    isFavorite: false
  })
}

/**
 * Remove a contact from user's contact list
 */
export const removeContact = async (
  userId: string,
  contactId: string
): Promise<void> => {
  const contactRef = ref(db, `userContacts/${userId}/${contactId}`)
  await remove(contactRef)
}

/**
 * Get user's contacts
 */
export const getUserContacts = async (userId: string): Promise<User[]> => {
  const contactsRef = ref(db, `userContacts/${userId}`)
  const snapshot = await get(contactsRef)
  
  if (!snapshot.exists()) {
    return []
  }
  
  const contactIds: string[] = []
  snapshot.forEach((childSnapshot) => {
    contactIds.push(childSnapshot.key!)
  })
  
  // Fetch full user details for each contact
  const contacts: User[] = []
  for (const contactId of contactIds) {
    const user = await getUser(contactId)
    if (user) {
      contacts.push(user)
    }
  }
  
  return contacts
}

/**
 * Check if a contact exists
 */
export const isContact = async (
  userId: string,
  contactId: string
): Promise<boolean> => {
  const contactRef = ref(db, `userContacts/${userId}/${contactId}`)
  const snapshot = await get(contactRef)
  return snapshot.exists()
}

/**
 * Search for user by phone or email
 */
export const searchUserByPhoneOrEmail = async (
  searchTerm: string
): Promise<User | null> => {
  const usersRef = ref(db, 'users')
  const snapshot = await get(usersRef)
  
  if (!snapshot.exists()) {
    return null
  }
  
  let foundUser: User | null = null
  
  snapshot.forEach((childSnapshot) => {
    const user = childSnapshot.val() as User
    const userId = childSnapshot.key!
    
    // Match by phone or email (case insensitive)
    if (
      user.phone?.toLowerCase() === searchTerm.toLowerCase() ||
      user.email?.toLowerCase() === searchTerm.toLowerCase() ||
      userId.toLowerCase() === searchTerm.toLowerCase()
    ) {
      foundUser = { ...user, id: userId }
      return true // Break loop
    }
  })
  
  return foundUser
}

/**
 * Toggle favorite status
 */
export const toggleFavorite = async (
  userId: string,
  contactId: string,
  isFavorite: boolean
): Promise<void> => {
  const favoriteRef = ref(db, `userContacts/${userId}/${contactId}/isFavorite`)
  await set(favoriteRef, isFavorite)
}

/**
 * Set contact nickname
 */
export const setContactNickname = async (
  userId: string,
  contactId: string,
  nickname: string
): Promise<void> => {
  const nicknameRef = ref(db, `userContacts/${userId}/${contactId}/nickname`)
  await set(nicknameRef, nickname)
}

/**
 * Generate invite link/message
 */
export const generateInviteMessage = (userName: string, userPhone?: string): string => {
  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://chali-app.com'
  
  return `Hi! ${userName} wants to connect with you on Chali. Download the app and message me at ${userPhone || 'my number'}!\n\n${appUrl}`
}

