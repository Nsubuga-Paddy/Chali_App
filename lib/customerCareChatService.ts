// Customer Care Chat History Service
// Stores and retrieves customer care chat history using Firebase Firestore

import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import { firestore } from './firebase'

export interface CustomerCareMessage {
  id?: string
  userId: string
  company: string
  type: 'user' | 'agent'
  content: string
  timestamp: Date | Timestamp
  quickReplies?: string[]
  provider?: string
  source?: string
  isCallSummary?: boolean
  callData?: {
    summary: string
    duration: string
    timestamp: Date
    fullTranscript?: Array<{
      userMessage: string
      aiResponse: string
      timestamp: Date
    }>
  }
}

export interface CustomerCareChat {
  id: string
  userId: string
  company: string
  lastMessage: string
  lastMessageTime: Date | Timestamp
  messageCount: number
  createdAt: Date | Timestamp
  updatedAt: Date | Timestamp
}

/**
 * Get chat ID for a user and company
 */
export const getCustomerCareChatId = (userId: string, company: string): string => {
  return `care_${userId}_${company}`
}

/**
 * Save a message to customer care chat history
 */
export const saveCustomerCareMessage = async (
  userId: string,
  company: string,
  message: Omit<CustomerCareMessage, 'id' | 'userId' | 'company'>
): Promise<string> => {
  try {
    const chatId = getCustomerCareChatId(userId, company)
    const messagesRef = collection(firestore, `customerCareChats/${chatId}/messages`)
    
    // Convert Date to Timestamp for Firestore
    const messageData = {
      ...message,
      userId,
      company,
      timestamp: message.timestamp instanceof Date 
        ? Timestamp.fromDate(message.timestamp)
        : serverTimestamp(),
      // Handle callData timestamps
      callData: message.callData ? {
        ...message.callData,
        timestamp: message.callData.timestamp instanceof Date
          ? Timestamp.fromDate(message.callData.timestamp)
          : message.callData.timestamp,
        fullTranscript: message.callData.fullTranscript?.map(exchange => ({
          ...exchange,
          timestamp: exchange.timestamp instanceof Date
            ? Timestamp.fromDate(exchange.timestamp)
            : exchange.timestamp
        }))
      } : undefined
    }
    
    const docRef = await addDoc(messagesRef, messageData)
    
    // Update chat metadata
    await updateCustomerCareChatMetadata(chatId, userId, company, message.content, message.timestamp)
    
    return docRef.id
  } catch (error) {
    console.error('Error saving customer care message:', error)
    throw error
  }
}

/**
 * Update chat metadata (last message, timestamp, message count)
 */
const updateCustomerCareChatMetadata = async (
  chatId: string,
  userId: string,
  company: string,
  lastMessage: string,
  timestamp: Date | Timestamp
): Promise<void> => {
  try {
    const chatRef = doc(firestore, `customerCareChats`, chatId)
    const chatDoc = await getDoc(chatRef)
    
    const timestampValue = timestamp instanceof Date 
      ? Timestamp.fromDate(timestamp)
      : timestamp
    
    if (chatDoc.exists()) {
      // Update existing chat
      const currentData = chatDoc.data()
      await setDoc(chatRef, {
        ...currentData,
        lastMessage,
        lastMessageTime: timestampValue,
        messageCount: (currentData.messageCount || 0) + 1,
        updatedAt: serverTimestamp()
      }, { merge: true })
    } else {
      // Create new chat
      await setDoc(chatRef, {
        userId,
        company,
        lastMessage,
        lastMessageTime: timestampValue,
        messageCount: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    }
  } catch (error) {
    console.error('Error updating chat metadata:', error)
  }
}

/**
 * Load chat history for a user and company
 * Includes timeout to prevent hanging on slow networks
 */
export const loadCustomerCareChatHistory = async (
  userId: string,
  company: string,
  limitCount: number = 100,
  timeoutMs: number = 5000
): Promise<CustomerCareMessage[]> => {
  try {
    const chatId = getCustomerCareChatId(userId, company)
    const messagesRef = collection(firestore, `customerCareChats/${chatId}/messages`)
    const messagesQuery = query(
      messagesRef,
      orderBy('timestamp', 'asc'),
      limit(limitCount)
    )
    
    // Add timeout to prevent hanging
    const queryPromise = getDocs(messagesQuery)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
    })
    
    const snapshot = await Promise.race([queryPromise, timeoutPromise])
    const messages: CustomerCareMessage[] = []
    
    snapshot.forEach((doc) => {
      const data = doc.data()
      const timestamp = data.timestamp instanceof Timestamp
        ? data.timestamp.toDate()
        : data.timestamp instanceof Date
        ? data.timestamp
        : new Date(data.timestamp)
      
      // Handle callData timestamps
      let callData = data.callData
      if (callData) {
        callData = {
          ...callData,
          timestamp: callData.timestamp instanceof Timestamp
            ? callData.timestamp.toDate()
            : callData.timestamp instanceof Date
            ? callData.timestamp
            : new Date(callData.timestamp),
          fullTranscript: callData.fullTranscript?.map((exchange: any) => ({
            ...exchange,
            timestamp: exchange.timestamp instanceof Timestamp
              ? exchange.timestamp.toDate()
              : exchange.timestamp instanceof Date
              ? exchange.timestamp
              : new Date(exchange.timestamp)
          }))
        }
      }
      
      messages.push({
        id: doc.id,
        userId: data.userId,
        company: data.company,
        type: data.type,
        content: data.content,
        timestamp,
        quickReplies: data.quickReplies,
        provider: data.provider,
        source: data.source,
        isCallSummary: data.isCallSummary,
        callData
      })
    })
    
    return messages
  } catch (error: any) {
    console.error('Error loading customer care chat history:', error)
    
    // If it's a timeout or network error, return empty array quickly
    if (error?.message === 'Query timeout' || error?.code === 'unavailable') {
      console.warn('Firestore query timed out or unavailable, returning empty history')
      return []
    }
    
    // Return empty array if chat doesn't exist yet or on any error
    return []
  }
}

/**
 * Get all customer care chats for a user
 */
export const getUserCustomerCareChats = async (
  userId: string
): Promise<CustomerCareChat[]> => {
  try {
    const chatsRef = collection(firestore, 'customerCareChats')
    const chatsQuery = query(
      chatsRef,
      where('userId', '==', userId),
      orderBy('lastMessageTime', 'desc')
    )
    
    const snapshot = await getDocs(chatsQuery)
    const chats: CustomerCareChat[] = []
    
    snapshot.forEach((doc) => {
      const data = doc.data()
      chats.push({
        id: doc.id,
        userId: data.userId,
        company: data.company,
        lastMessage: data.lastMessage,
        lastMessageTime: data.lastMessageTime instanceof Timestamp
          ? data.lastMessageTime.toDate()
          : data.lastMessageTime,
        messageCount: data.messageCount || 0,
        createdAt: data.createdAt instanceof Timestamp
          ? data.createdAt.toDate()
          : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp
          ? data.updatedAt.toDate()
          : data.updatedAt
      })
    })
    
    return chats
  } catch (error) {
    console.error('Error loading user customer care chats:', error)
    return []
  }
}

/**
 * Delete a customer care chat (optional - for cleanup)
 */
export const deleteCustomerCareChat = async (
  userId: string,
  company: string
): Promise<void> => {
  try {
    const chatId = getCustomerCareChatId(userId, company)
    const chatRef = doc(firestore, `customerCareChats`, chatId)
    await setDoc(chatRef, { deleted: true, deletedAt: serverTimestamp() }, { merge: true })
  } catch (error) {
    console.error('Error deleting customer care chat:', error)
    throw error
  }
}

