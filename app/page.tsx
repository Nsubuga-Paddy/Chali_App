'use client'

import { useState, useEffect } from 'react'
import Auth from '@/components/Auth'
import MainApp from '@/components/MainApp'
import { registerUser } from '@/lib/userService'

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('chali_user')
    if (savedUser) {
      const userData = JSON.parse(savedUser)
      setUser(userData)
      setIsAuthenticated(true)
      
      // Register/update user in Firebase
      registerUser({
        id: userData.id || userData.email || userData.phone,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        createdAt: Date.now()
      }).catch(console.error)
    }
  }, [])

  const handleLogin = async (userData: any) => {
    // Create user ID from email or phone
    const userId = userData.email || userData.phone
    const userWithId = {
      ...userData,
      id: userId
    }
    
    setUser(userWithId)
    setIsAuthenticated(true)
    localStorage.setItem('chali_user', JSON.stringify(userWithId))
    
    // Register user in Firebase
    try {
      await registerUser({
        id: userId,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        createdAt: Date.now()
      })
    } catch (error) {
      console.error('Error registering user:', error)
    }
  }

  const handleLogout = () => {
    setUser(null)
    setIsAuthenticated(false)
    localStorage.removeItem('chali_user')
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

