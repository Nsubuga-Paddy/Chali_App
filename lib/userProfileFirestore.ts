import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore'
import { firestore } from '@/lib/firebase'
import { generateChaliId } from '@/lib/chaliId'

/** Canonical user profile (align with mobile / backend contract). */
export interface UserProfileDoc {
  id: string
  phone: string
  name: string
  chali_id: string
  photo_url: string | null
  created_at?: Timestamp | null
  updated_at?: Timestamp | null
  onboardingComplete: boolean
}

const usersCol = 'users'

export async function getUserProfile(
  uid: string
): Promise<UserProfileDoc | null> {
  const snap = await getDoc(doc(firestore, usersCol, uid))
  if (!snap.exists()) return null
  return snap.data() as UserProfileDoc
}

/**
 * Persist profile after phone verification (before final onboarding ack).
 * Creates or merges `users/{uid}`.
 */
export async function saveUserProfileDraft(params: {
  uid: string
  phoneE164: string
  name: string
  photoUrl: string | null
  existingChaliId?: string | null
}): Promise<{ chali_id: string }> {
  const { uid, phoneE164, name, photoUrl, existingChaliId } = params
  const ref = doc(firestore, usersCol, uid)
  const snap = await getDoc(ref)
  const isNew = !snap.exists()
  const chali_id =
    existingChaliId?.trim() ||
    (snap.data() as UserProfileDoc | undefined)?.chali_id?.trim() ||
    generateChaliId()

  await setDoc(
    ref,
    {
      id: uid,
      phone: phoneE164,
      name: name.trim(),
      chali_id,
      photo_url: photoUrl,
      onboardingComplete: false,
      updated_at: serverTimestamp(),
      ...(isNew ? { created_at: serverTimestamp() } : {}),
    },
    { merge: true }
  )

  return { chali_id }
}

export async function setOnboardingComplete(uid: string): Promise<void> {
  const ref = doc(firestore, usersCol, uid)
  await setDoc(
    ref,
    {
      id: uid,
      onboardingComplete: true,
      updated_at: serverTimestamp(),
    },
    { merge: true }
  )
}
