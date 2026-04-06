import { NextRequest, NextResponse } from 'next/server'
import { getAndClearOtp, normalizePhone } from '@/lib/otpStore'

/**
 * POST /api/otp/verify
 * Body: { "phone": "+256...", "code": "123456" }
 * Verifies the OTP and invalidates it on success.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const rawPhone = body?.phone
    const code = body?.code

    if (!rawPhone || typeof rawPhone !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid phone number' },
        { status: 400 }
      )
    }
    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid code' },
        { status: 400 }
      )
    }

    const phone = normalizePhone(rawPhone)
    const trimmedCode = code.replace(/\s/g, '').trim()
    if (!trimmedCode || trimmedCode.length !== 6) {
      return NextResponse.json(
        { error: 'Code must be 6 digits' },
        { status: 400 }
      )
    }

    const storedCode = getAndClearOtp(phone)
    if (!storedCode) {
      return NextResponse.json(
        { error: 'Code expired or not found. Please request a new one.' },
        { status: 400 }
      )
    }

    if (storedCode !== trimmedCode) {
      return NextResponse.json(
        { error: 'Invalid code' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Phone number verified',
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Verification failed'
    console.error('OTP verify error:', err)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
