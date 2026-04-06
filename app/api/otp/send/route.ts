import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { setOtp, normalizePhone } from '@/lib/otpStore'

const OTP_LENGTH = 6

function generateOtp(): string {
  const digits = '0123456789'
  let code = ''
  for (let i = 0; i < OTP_LENGTH; i++) {
    code += digits[Math.floor(Math.random() * digits.length)]
  }
  return code
}

/**
 * POST /api/otp/send
 * Body: { "phone": "+256..." } (E.164 or local format)
 * Sends a 6-digit OTP via Twilio SMS. OTP valid for 10 minutes.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const rawPhone = body?.phone
    if (!rawPhone || typeof rawPhone !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid phone number' },
        { status: 400 }
      )
    }

    const phone = normalizePhone(rawPhone)
    if (!phone.startsWith('+') || phone.length < 10) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      )
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const fromNumber = process.env.TWILIO_PHONE_NUMBER

    if (!accountSid || !authToken || !fromNumber) {
      return NextResponse.json(
        { error: 'SMS service not configured (Twilio credentials missing)' },
        { status: 503 }
      )
    }

    const code = generateOtp()
    setOtp(phone, code)

    const client = twilio(accountSid, authToken)
    await client.messages.create({
      body: `Your Chali verification code is: ${code}. Valid for 10 minutes.`,
      from: fromNumber,
      to: phone,
    })

    return NextResponse.json({
      success: true,
      message: 'OTP sent',
      // Do not return the code in production; optional for debugging:
      // phone: phone,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send OTP'
    console.error('OTP send error:', err)
    if (typeof err === 'object' && err !== null && 'code' in err) {
      const twilioCode = (err as { code?: number }).code
      if (twilioCode === 21211 || twilioCode === 21614) {
        return NextResponse.json(
          { error: 'Invalid or unverified phone number' },
          { status: 400 }
        )
      }
    }
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
