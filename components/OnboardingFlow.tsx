'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  Smartphone,
  AlertTriangle,
  UserCircle,
  Bell,
  Sparkles,
} from 'lucide-react'
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  updateProfile,
  type ConfirmationResult,
  type User as FirebaseUser,
} from 'firebase/auth'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { auth, storage } from '@/lib/firebase'
import { normalizePhone } from '@/lib/phoneNormalize'
import {
  saveUserProfileDraft,
  setOnboardingComplete,
  type UserProfileDoc,
} from '@/lib/userProfileFirestore'

function mapAuthError(code: string, fallback: string): string {
  switch (code) {
    case 'auth/invalid-phone-number':
      return 'Invalid phone number. Check the country code and number.'
    case 'auth/missing-phone-number':
      return 'Please enter your phone number.'
    case 'auth/invalid-verification-code':
      return 'Invalid code. Check the SMS and try again.'
    case 'auth/code-expired':
      return 'This code expired. Request a new one.'
    case 'auth/session-expired':
      return 'Session expired. Enter your number again and request a new code.'
    case 'auth/quota-exceeded':
      return 'Too many attempts. Try again later.'
    case 'auth/too-many-requests':
      return 'Too many requests. Wait a bit and try again.'
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized. In Firebase Console → Authentication → Settings, add this site under Authorized domains (include localhost for local dev).'
    case 'auth/captcha-check-failed':
      return 'Security check failed. Refresh the page and try again.'
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.'
    default:
      return fallback
  }
}

type Step = 'welcome' | 'phone' | 'otp' | 'profile' | 'finish'
type CountryOption = { code: string; label: string }

const COUNTRY_OPTIONS: CountryOption[] = [
  { code: '+256', label: 'Uganda' },
  { code: '+254', label: 'Kenya' },
  { code: '+255', label: 'Tanzania' },
  { code: '+250', label: 'Rwanda' },
  { code: '+1', label: 'US/Canada' },
  { code: '+44', label: 'UK' },
]

interface OnboardingFlowProps {
  firebaseUser: FirebaseUser | null
  profile: UserProfileDoc | null
  profileLoading: boolean
  onProfileSynced: () => Promise<void>
}

async function uploadProfilePhoto(uid: string, file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const safe = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg'
  const storageRef = ref(storage, `profilePhotos/${uid}/avatar_${Date.now()}.${safe}`)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}

export default function OnboardingFlow({
  firebaseUser,
  profile,
  profileLoading,
  onProfileSynced,
}: OnboardingFlowProps) {
  const [step, setStep] = useState<Step>('welcome')
  const [countryCode, setCountryCode] = useState('+256')
  const [phoneInput, setPhoneInput] = useState('')
  const [otpInput, setOtpInput] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const confirmationRef = useRef<ConfirmationResult | null>(null)
  const verifierRef = useRef<RecaptchaVerifier | null>(null)
  const hadFirebaseUserRef = useRef(false)

  const clearVerifier = useCallback(() => {
    try {
      verifierRef.current?.clear()
    } catch {
      /* ignore */
    }
    verifierRef.current = null
  }, [])

  const makeVerifier = useCallback(() => {
    clearVerifier()
    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
    })
    verifierRef.current = verifier
    return verifier
  }, [clearVerifier])

  useEffect(() => {
    if (firebaseUser) {
      hadFirebaseUserRef.current = true
      return
    }
    if (hadFirebaseUserRef.current) {
      hadFirebaseUserRef.current = false
      setStep('welcome')
      confirmationRef.current = null
      clearVerifier()
      setPhoneInput('')
      setOtpInput('')
      setDisplayName('')
      setPhotoFile(null)
      setPhotoPreviewUrl(null)
      setError(null)
    }
  }, [firebaseUser, clearVerifier])

  const buildE164Phone = useCallback(() => {
    const raw = phoneInput.trim()
    if (!raw) return ''
    if (raw.startsWith('+')) return raw.replace(/\s+/g, '')
    const national = raw.replace(/\D/g, '').replace(/^0+/, '')
    return `${countryCode}${national}`
  }, [countryCode, phoneInput])

  useEffect(() => {
    if (profileLoading || !firebaseUser || profile?.onboardingComplete) return
    const nameOk = Boolean(profile?.name?.trim())
    setStep(nameOk ? 'finish' : 'profile')
    if (profile?.name) setDisplayName(profile.name)
    if (profile?.photo_url) setPhotoPreviewUrl(profile.photo_url)
  }, [firebaseUser, profile, profileLoading])

  useEffect(() => {
    if (!photoFile) return
    const url = URL.createObjectURL(photoFile)
    setPhotoPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [photoFile])

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      if (!phoneInput.trim()) {
        setError('Please enter your phone number')
        return
      }
      const e164 = normalizePhone(buildE164Phone())
      const digits = e164.replace(/\D/g, '')
      if (!e164.startsWith('+') || digits.length < 10) {
        setError('Enter a valid phone number (E.164, e.g. +256…).')
        return
      }

      const verifier = makeVerifier()
      const confirmation = await signInWithPhoneNumber(auth, e164, verifier)
      confirmationRef.current = confirmation
      setOtpInput('')
      setStep('otp')
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string }
      const code = err?.code || ''
      setError(
        mapAuthError(
          code,
          err?.message || 'Could not send the code. Try again.'
        )
      )
      clearVerifier()
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const code = otpInput.replace(/\s/g, '')
    if (code.length !== 6) {
      setError('Enter the 6-digit code from your SMS.')
      return
    }

    setIsLoading(true)
    try {
      const conf = confirmationRef.current
      if (!conf) {
        setError('Session expired. Go back and request a new code.')
        return
      }
      await conf.confirm(code)
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string }
      const errCode = err?.code || ''
      setError(
        mapAuthError(
          errCode,
          err?.message || 'Verification failed. Try again.'
        )
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangeNumber = () => {
    confirmationRef.current = null
    setOtpInput('')
    setError(null)
    clearVerifier()
    setStep('phone')
  }

  const handleResend = async () => {
    setError(null)
    setIsLoading(true)
    try {
      const e164 = normalizePhone(buildE164Phone())
      const digits = e164.replace(/\D/g, '')
      if (!e164.startsWith('+') || digits.length < 10) {
        setError('Invalid phone number. Go back and fix it.')
        return
      }
      const verifier = makeVerifier()
      const confirmation = await signInWithPhoneNumber(auth, e164, verifier)
      confirmationRef.current = confirmation
      setOtpInput('')
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string }
      const code = err?.code || ''
      setError(
        mapAuthError(
          code,
          err?.message || 'Could not resend the code. Try again.'
        )
      )
      clearVerifier()
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const name = displayName.trim()
    if (!name) {
      setError('Please enter your display name.')
      return
    }
    const u = auth.currentUser
    if (!u) {
      setError('You are not signed in. Start again from the phone step.')
      setStep('welcome')
      return
    }
    const phoneE164 = u.phoneNumber || normalizePhone(phoneInput.trim())
    if (!phoneE164) {
      setError('Missing phone number on your account.')
      return
    }

    setIsLoading(true)
    try {
      let photoUrl: string | null = profile?.photo_url ?? null
      if (photoFile) {
        photoUrl = await uploadProfilePhoto(u.uid, photoFile)
      }

      await saveUserProfileDraft({
        uid: u.uid,
        phoneE164,
        name,
        photoUrl,
        existingChaliId: profile?.chali_id,
      })

      await updateProfile(u, {
        displayName: name,
        photoURL: photoUrl ?? undefined,
      })

      setPhotoFile(null)
      setStep('finish')
      await onProfileSynced()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not save profile.'
      setError(
        msg.includes('storage/unauthorized')
          ? 'Photo upload was blocked. Check Firebase Storage rules for profilePhotos/.'
          : msg
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleFinish = async () => {
    const u = auth.currentUser
    if (!u) return
    setError(null)
    setIsLoading(true)
    try {
      await setOnboardingComplete(u.uid)
      await onProfileSynced()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not finish setup.'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  if (profileLoading && firebaseUser) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 dark:from-primary-800 dark:to-primary-900">
        <p className="text-white text-sm font-medium">Loading your profile…</p>
      </div>
    )
  }

  return (
    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 dark:from-primary-800 dark:to-primary-900">
      <div id="recaptcha-container" className="sr-only" aria-hidden="true" />

      <div className="w-full max-w-md mx-4">
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white dark:bg-gray-800 rounded-full mb-4 shadow-lg">
            <span className="text-4xl font-bold text-primary-600">C</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Chali</h1>
          <p className="text-primary-100">
            Your customer care and payments assistant
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 animate-slide-up">
          {step === 'welcome' && (
            <>
              <div className="flex justify-center mb-4">
                <Sparkles className="text-primary-600" size={36} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">
                Chali
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">
                Your customer care and payments assistant
              </p>
              <div className="space-y-3 text-left mb-6">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Contact customer care
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Chat or call support for MTN, Airtel, NWSC, URA &amp; more
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Pay utilities
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Yaka, water, airtime, TV, school fees-all in one place
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Send money
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Seamlessly send to friends and family
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Secure chats
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    One-to-one encrypted messaging
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  setStep('phone')
                }}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-3 transition-all"
              >
                <span>Get Started</span>
                <ArrowRight size={20} />
              </button>
            </>
          )}

          {step === 'phone' && (
            <>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <Smartphone size={22} className="text-primary-600" />
                Your phone number
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                We'll send you a verification code by SMS
              </p>
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 flex gap-2">
                  <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
                  <div className="text-sm">{error}</div>
                </div>
              )}
              <form onSubmit={handleSendCode} className="space-y-4">
                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Phone number
                  </label>
                  <div className="grid grid-cols-[130px_1fr] gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      disabled={isLoading}
                    >
                      {COUNTRY_OPTIONS.map((option) => (
                        <option key={option.code} value={option.code}>
                          {option.code} {option.label}
                        </option>
                      ))}
                    </select>
                  <input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="771234567"
                    value={phoneInput}
                    onChange={(ev) => setPhoneInput(ev.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-3 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    disabled={isLoading}
                  />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    For security, Google may verify this device first. If it
                    cannot, you may see a short reCAPTCHA screen before the SMS
                    is sent.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !phoneInput.trim()}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-3 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span>{isLoading ? 'Sending code…' : 'Continue'}</span>
                  <ArrowRight size={20} className="opacity-90" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError(null)
                    setStep('welcome')
                  }}
                  className="w-full text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                >
                  Back
                </button>
              </form>
            </>
          )}

          {step === 'otp' && (
            <>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Verification code
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Enter the 6-digit code sent to{' '}
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {normalizePhone(phoneInput.trim())}
                </span>
                .
              </p>
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 flex gap-2">
                  <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
                  <div className="text-sm">{error}</div>
                </div>
              )}
              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label
                    htmlFor="otp"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Code
                  </label>
                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    maxLength={8}
                    value={otpInput}
                    onChange={(ev) =>
                      setOtpInput(ev.target.value.replace(/\D/g, ''))
                    }
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-3 text-gray-900 dark:text-white tracking-widest text-lg font-mono placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    disabled={isLoading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || otpInput.replace(/\s/g, '').length < 6}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-3 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span>{isLoading ? 'Verifying…' : 'Verify'}</span>
                  <ArrowRight size={20} className="opacity-90" />
                </button>
              </form>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                <button
                  type="button"
                  onClick={handleChangeNumber}
                  className="text-primary-600 dark:text-primary-400 font-medium hover:underline disabled:opacity-50"
                  disabled={isLoading}
                >
                  Change number
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-primary-600 dark:text-primary-400 font-medium hover:underline disabled:opacity-50"
                  disabled={isLoading}
                >
                  Resend code
                </button>
              </div>
            </>
          )}

          {step === 'profile' && (
            <>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <UserCircle size={24} className="text-primary-600" />
                Your profile
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                This is saved to your Chali account (Firestore) so web and
                mobile stay in sync.
              </p>
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 flex gap-2">
                  <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
                  <div className="text-sm">{error}</div>
                </div>
              )}
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label
                    htmlFor="displayName"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Display name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    autoComplete="name"
                    placeholder="How should we call you?"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-3 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Photo (optional)
                  </label>
                  {photoPreviewUrl && (
                    <div className="mb-2 flex justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoPreviewUrl}
                        alt=""
                        className="w-24 h-24 rounded-full object-cover border border-gray-200 dark:border-gray-600"
                      />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      setPhotoFile(f ?? null)
                    }}
                    className="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-100 file:text-primary-800 dark:file:bg-primary-900 dark:file:text-primary-200"
                    disabled={isLoading}
                  />
                </div>
                {profile?.chali_id && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Chali ID:{' '}
                    <span className="font-mono font-medium">
                      {profile.chali_id}
                    </span>
                  </p>
                )}
                <button
                  type="submit"
                  disabled={isLoading || !displayName.trim()}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-3 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span>{isLoading ? 'Saving…' : 'Continue'}</span>
                  <ArrowRight size={20} className="opacity-90" />
                </button>
              </form>
            </>
          )}

          {step === 'finish' && (
            <>
              <div className="flex justify-center mb-4">
                <Bell className="text-primary-600" size={36} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">
                Almost there
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
                On the web, Chali may ask for microphone access when you use
                voice features. Notifications depend on your browser — you can
                allow them when prompted.
              </p>
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 flex gap-2">
                  <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
                  <div className="text-sm">{error}</div>
                </div>
              )}
              <button
                type="button"
                onClick={handleFinish}
                disabled={isLoading}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-3 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>{isLoading ? 'Finishing…' : 'Enter Chali'}</span>
                <ArrowRight size={20} className="opacity-90" />
              </button>
            </>
          )}

          {(step === 'phone' || step === 'otp') && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
              Phone sign-in uses Firebase reCAPTCHA in the background. If
              something fails, refresh and try again.
            </p>
          )}
        </div>

        <p className="text-center mt-6 text-white text-sm">
          Secure payments powered by trusted partners
        </p>
      </div>
    </div>
  )
}
