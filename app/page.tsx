'use client'

import { useEffect } from 'react'
import MainApp from '@/components/MainApp'
import { registerUser } from '@/lib/userService'

/** Local-only identity when signup/auth is bypassed (dev / internal testing). */
const LOCAL_USER = {
  id: 'local-dev-user',
  name: 'Local tester',
  email: undefined as string | undefined,
  phone: undefined as string | undefined,
  avatar: undefined as string | undefined,
  balance: 0,
}

export default function Home() {
  useEffect(() => {
    registerUser({
      id: LOCAL_USER.id,
      name: LOCAL_USER.name,
      email: LOCAL_USER.email,
      phone: LOCAL_USER.phone,
      avatar: LOCAL_USER.avatar,
      createdAt: Date.now(),
    }).catch((err) =>
      console.warn('Realtime DB user registration skipped or failed:', err)
    )
  }, [])

  return (
    <main className="h-screen w-screen overflow-hidden">
      <MainApp user={LOCAL_USER} onLogout={() => {}} />
    </main>
  )
}
