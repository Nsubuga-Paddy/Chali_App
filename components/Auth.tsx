'use client'

import { useState } from 'react'
import { ArrowRight, Chrome, AlertTriangle } from 'lucide-react'
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGoogleSignIn = async () => {
    setError(null)
    setIsLoading(true)

    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })

    // Redirect is more reliable on iOS Safari; on Android Chrome, popup often works and avoids redirect loops.
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
    const isIOS = /iPhone|iPad|iPod/i.test(ua)

    try {
      // Prefer redirect on iOS
      if (isIOS) {
        await signInWithRedirect(auth, provider)
        return
      }

      // Prefer popup elsewhere (desktop + Android)
      const result = await signInWithPopup(auth, provider)
      // Home page listens to onAuthStateChanged and will transition to app automatically
      void result
    } catch (e: any) {
      // Fallback to redirect if popup is blocked / unsupported
      const code = e?.code || ''
      const msg =
        e?.message ||
        'Google sign-in failed. Please try again or use a different browser.'

      if (
        code === 'auth/popup-blocked' ||
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/operation-not-supported-in-this-environment'
      ) {
        try {
          await signInWithRedirect(auth, provider)
          return
        } catch (e2: any) {
          setError(e2?.message || msg)
        }
      } else if (code === 'auth/unauthorized-domain') {
        setError(
          'Unauthorized domain. Add your website domain in Firebase Console → Authentication → Settings → Authorized domains.'
        )
      } else {
        setError(msg)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 dark:from-primary-800 dark:to-primary-900">
      <div className="w-full max-w-md mx-4">
        {/* Logo/Brand */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white dark:bg-gray-800 rounded-full mb-4 shadow-lg">
            <span className="text-4xl font-bold text-primary-600">C</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Chali</h1>
          <p className="text-primary-100">Your smart payment assistant</p>
        </div>

        {/* Auth Form */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 animate-slide-up">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Sign in with Google
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Use your Gmail to create an account and start chatting with other users.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 flex gap-2">
              <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
              <div className="text-sm">{error}</div>
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full bg-white hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-3 transition-all border border-gray-200 dark:border-gray-600 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Chrome size={20} />
            <span>{isLoading ? 'Signing in…' : 'Continue with Google'}</span>
            <ArrowRight size={20} className="ml-auto opacity-70" />
          </button>

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
            If you see “unauthorized-domain”, add your web domain in Firebase Authorized domains.
          </p>
        </div>

        <p className="text-center mt-6 text-white text-sm">
          Secure payments powered by trusted partners
        </p>
      </div>
    </div>
  )
}

