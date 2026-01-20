// Firebase Chat Service
import { 
  ref, 
  push, 
  onValue, 
  off, 
  set, 
  serverTimestamp,
  query,
  orderByChild,
  limitToLast,
  get,
  update
} from 'firebase/database'
import { db } from './firebase'

export interface ChatMessage {
  id?: string
  chatId: string
  senderId: string
  receiverId: string
  content: string
  timestamp: number
  status: 'sent' | 'delivered' | 'read'
  type: 'text' | 'payment'
}

export interface ChatMetadata {
  participants: string[]
  lastMessage: string
  lastMessageTime: number
  unreadCount: { [userId: string]: number }
}

/**
 * Generate a consistent chat ID for two users
 */
export const getChatId = (userId1: string, userId2: string): string => {
  const ids = [userId1, userId2].sort()
  return `chat_${ids[0]}_${ids[1]}`
}

/**
 * Send a message
 */
export const sendMessage = async (
  senderId: string,
  receiverId: string,
  content: string,
  type: 'text' | 'payment' = 'text'
): Promise<string> => {
  const chatId = getChatId(senderId, receiverId)
  const messagesRef = ref(db, `chats/${chatId}/messages`)
  
  const newMessageRef = push(messagesRef)
  const messageId = newMessageRef.key!
  
  const message: Omit<ChatMessage, 'id'> = {
    chatId,
    senderId,
    receiverId,
    content,
    timestamp: Date.now(),
    status: 'sent',
    type
  }
  
  await set(newMessageRef, message)
  
  // Update chat metadata
  await updateChatMetadata(chatId, senderId, receiverId, content)
  
  return messageId
}

/**
 * Update chat metadata (last message, unread count)
 */
const updateChatMetadata = async (
  chatId: string,
  senderId: string,
  receiverId: string,
  lastMessage: string
) => {
  const metadataRef = ref(db, `chatMetadata/${chatId}`)
  
  const metadata: ChatMetadata = {
    participants: [senderId, receiverId],
    lastMessage: lastMessage.substring(0, 50), // Store first 50 chars
    lastMessageTime: Date.now(),
    unreadCount: {
      [receiverId]: await getUnreadCount(chatId, receiverId) + 1
    }
  }
  
  await set(metadataRef, metadata)
}

/**
 * Get unread count for a user in a chat
 */
const getUnreadCount = async (chatId: string, userId: string): Promise<number> => {
  const metadataRef = ref(db, `chatMetadata/${chatId}/unreadCount/${userId}`)
  const snapshot = await get(metadataRef)
  return snapshot.val() || 0
}

/**
 * Listen to messages in real-time
 */
export const subscribeToMessages = (
  chatId: string,
  callback: (messages: ChatMessage[]) => void
): (() => void) => {
  const messagesRef = ref(db, `chats/${chatId}/messages`)
  const messagesQuery = query(messagesRef, orderByChild('timestamp'), limitToLast(100))
  
  const unsubscribe = onValue(messagesQuery, (snapshot) => {
    const messages: ChatMessage[] = []
    snapshot.forEach((childSnapshot) => {
      const message = childSnapshot.val()
      messages.push({
        ...message,
        id: childSnapshot.key
      })
    })
    callback(messages)
  })
  
  // Return cleanup function
  return () => off(messagesRef, 'value', unsubscribe)
}

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (
  chatId: string,
  userId: string
): Promise<void> => {
  // Reset unread count
  const unreadRef = ref(db, `chatMetadata/${chatId}/unreadCount/${userId}`)
  await set(unreadRef, 0)
  
  // Update message status
  const messagesRef = ref(db, `chats/${chatId}/messages`)
  const snapshot = await get(messagesRef)
  
  const updates: { [key: string]: any } = {}
  snapshot.forEach((childSnapshot) => {
    const message = childSnapshot.val()
    if (message.receiverId === userId && message.status !== 'read') {
      updates[`${childSnapshot.key}/status`] = 'read'
    }
  })
  
  if (Object.keys(updates).length > 0) {
    await update(messagesRef, updates)
  }
}

/**
 * Update user online status
 */
export const updateOnlineStatus = async (userId: string, isOnline: boolean): Promise<void> => {
  const statusRef = ref(db, `userStatus/${userId}`)
  await set(statusRef, {
    online: isOnline,
    lastSeen: Date.now()
  })
}

/**
 * Subscribe to user online status
 */
export const subscribeToUserStatus = (
  userId: string,
  callback: (online: boolean, lastSeen: number) => void
): (() => void) => {
  const statusRef = ref(db, `userStatus/${userId}`)
  
  const unsubscribe = onValue(statusRef, (snapshot) => {
    const status = snapshot.val()
    if (status) {
      callback(status.online || false, status.lastSeen || Date.now())
    } else {
      callback(false, Date.now())
    }
  })
  
  return () => off(statusRef, 'value', unsubscribe)
}

/**
 * Get recent chats for a user
 */
export const getUserChats = async (userId: string): Promise<any[]> => {
  const chatsRef = ref(db, 'chatMetadata')
  const snapshot = await get(chatsRef)
  
  const userChats: any[] = []
  snapshot.forEach((childSnapshot) => {
    const chat = childSnapshot.val()
    if (chat.participants && chat.participants.includes(userId)) {
      userChats.push({
        chatId: childSnapshot.key,
        ...chat
      })
    }
  })
  
  // Sort by last message time
  return userChats.sort((a, b) => b.lastMessageTime - a.lastMessageTime)
}

