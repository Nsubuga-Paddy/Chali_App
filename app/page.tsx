'use client'

import { useState, useEffect } from 'react'
import Auth from '@/components/Auth'
import MainApp from '@/components/MainApp'
import { registerUser } from '@/lib/userService'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    // Use Firebase Auth as the source of truth (persists across refreshes)
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null)
        setIsAuthenticated(false)
        return
      }

      const userData = {
        id: fbUser.uid,
        name: fbUser.displayName || fbUser.email || 'User',
        // Firebase returns string | null for these fields; convert null -> undefined for our types
        email: fbUser.email ?? undefined,
        phone: fbUser.phoneNumber ?? undefined,
        avatar: fbUser.photoURL ?? undefined,
        balance: 0,
      }

      setUser(userData)
      setIsAuthenticated(true)

      // Register/update user in Realtime Database so others can find them
      try {
        await registerUser({
          id: fbUser.uid,
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          avatar: userData.avatar,
          createdAt: Date.now(),
        })
      } catch (error) {
        console.error('Error registering user:', error)
      }
    })

    return () => unsubscribe()
  }, [])

  const handleLogin = async (userData: any) => {
    // Auth.tsx passes Firebase-authenticated user data (id = uid)
    setUser(userData)
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    signOut(auth).catch((e) => console.error('Sign out failed:', e))
  }

  return (
    <main className="h-screen w-screen overflow-hidden">
      {!isAuthenticated ? (
        <Auth onLogin={handleLogin} />
      ) : (
        <MainApp user={user} onLogout={handleLogout} />
      )}
    </main>
  )
}

