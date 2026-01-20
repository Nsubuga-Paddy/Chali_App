// Firebase User Service
import { 
  ref, 
  set, 
  get, 
  onValue, 
  off,
  query,
  orderByChild
} from 'firebase/database'
import { db } from './firebase'

export interface User {
  id: string
  name: string
  email?: string
  phone?: string
  avatar?: string
  createdAt: number
  lastSeen?: number
  online?: boolean
}

/**
 * Register or update a user in Firebase
 */
export const registerUser = async (user: User): Promise<void> => {
  const userRef = ref(db, `users/${user.id}`)
  await set(userRef, {
    ...user,
    createdAt: user.createdAt || Date.now(),
    lastSeen: Date.now()
  })
}

/**
 * Get a single user by ID
 */
export const getUser = async (userId: string): Promise<User | null> => {
  const userRef = ref(db, `users/${userId}`)
  const snapshot = await get(userRef)
  
  if (snapshot.exists()) {
    return {
      id: userId,
      ...snapshot.val()
    }
  }
  
  return null
}

/**
 * Get all users except the current user
 */
export const getAllUsers = async (excludeUserId?: string): Promise<User[]> => {
  const usersRef = ref(db, 'users')
  const snapshot = await get(usersRef)
  
  const users: User[] = []
  
  if (snapshot.exists()) {
    snapshot.forEach((childSnapshot) => {
      const userId = childSnapshot.key
      if (userId !== excludeUserId) {
        users.push({
          id: userId!,
          ...childSnapshot.val()
        })
      }
    })
  }
  
  return users
}

/**
 * Subscribe to all users in real-time
 */
export const subscribeToUsers = (
  excludeUserId: string | undefined,
  callback: (users: User[]) => void
): (() => void) => {
  const usersRef = ref(db, 'users')
  
  const unsubscribe = onValue(usersRef, (snapshot) => {
    const users: User[] = []
    
    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        const userId = childSnapshot.key
        if (userId !== excludeUserId) {
          users.push({
            id: userId!,
            ...childSnapshot.val()
          })
        }
      })
    }
    
    callback(users)
  })
  
  return () => off(usersRef, 'value', unsubscribe)
}

/**
 * Update user's last seen timestamp
 */
export const updateLastSeen = async (userId: string): Promise<void> => {
  const userRef = ref(db, `users/${userId}/lastSeen`)
  await set(userRef, Date.now())
}

/**
 * Search users by name or phone
 */
export const searchUsers = async (
  searchTerm: string,
  excludeUserId?: string
): Promise<User[]> => {
  const users = await getAllUsers(excludeUserId)
  const term = searchTerm.toLowerCase()
  
  return users.filter(user => 
    user.name?.toLowerCase().includes(term) ||
    user.phone?.toLowerCase().includes(term) ||
    user.email?.toLowerCase().includes(term)
  )
}

