# OTP Setup Guide: Twilio & Firebase

This app sends OTPs via **Twilio SMS** and verifies them on the server. No Firebase changes are required for basic OTP; optional steps are listed if you later store verified phones in Firebase.

---

## 1. Twilio

### 1.1 Create a Twilio account

1. Go to [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio) and sign up.
2. Verify your email and (optionally) phone.

### 1.2 Get credentials

1. In the [Twilio Console](https://console.twilio.com/), open the **Dashboard**.
2. Copy:
   - **Account SID** (starts with `AC...`)
   - **Auth Token** (click “Show” to reveal)

### 1.3 Get a phone number for SMS

1. In the console go to **Phone Numbers → Manage → Buy a number** (or use a Trial number).
2. For **SMS** (and optionally **Voice**), select a number and complete purchase.
3. Copy the number in **E.164** form (e.g. `+1234567890`).  
   For Uganda you can search for a number with country **Uganda (+256)** if available.

**Trial accounts:**  
- You can only send SMS to **verified** numbers (Phone Numbers → Manage → Verified Caller IDs).  
- Add the test phone numbers (e.g. your own) there.

### 1.4 Set environment variables (e.g. Railway)

In your deployment (Railway / Vercel / `.env.local`), set:

| Variable | Description |
|----------|-------------|
| `TWILIO_ACCOUNT_SID` | Account SID from the Twilio Dashboard |
| `TWILIO_AUTH_TOKEN` | Auth Token from the Twilio Dashboard |
| `TWILIO_PHONE_NUMBER` | Your Twilio number in E.164 (e.g. `+1234567890`) |

Example `.env.local`:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

Restart the app after changing env vars.

### 1.5 Optional: Messaging Service (recommended for production)

For better deliverability and multiple numbers:

1. In Twilio go to **Messaging → Try it out → Send an SMS → Manage → Messaging Services**.
2. Create a Messaging Service and add your phone number(s).
3. Use the **Messaging Service SID** (starts with `MG...`) instead of a single number:  
   - Either set `TWILIO_MESSAGING_SERVICE_SID=MG...` and update the send API to use it,  
   - Or keep using `TWILIO_PHONE_NUMBER` for simplicity.

---

## 2. Firebase

**For the current OTP flow you do not need to change anything in Firebase.**  
OTPs are generated and stored on the server (in-memory with 10‑minute TTL). No Firebase collections or rules are used for OTP.

If later you want to:

- **Store “verified phone” in Firestore**  
  Create a collection (e.g. `verifiedPhones` or a field on `users`) and write to it from your app after a successful `/api/otp/verify` call. Add Firestore rules so only the authenticated user can write their own record.

- **Use Firebase Auth phone sign-in**  
  That is a separate flow (Firebase sends the SMS). This project uses Twilio + custom APIs instead, so no Firebase phone auth setup is required for the existing OTP APIs.

---

## 3. Chali Mobile: calling the APIs

- **Base URL:** Your deployed app (e.g. `https://your-app.up.railway.app`).
- **Send OTP:**  
  `POST /api/otp/send`  
  Body: `{ "phone": "+256..." }`  
  Use E.164 (e.g. Uganda `+256...`).  
  Success: `{ "success": true, "message": "OTP sent" }`.  
  Errors: 400 (invalid phone), 503 (Twilio not configured), 500 (e.g. Twilio failure).
- **Verify OTP:**  
  `POST /api/otp/verify`  
  Body: `{ "phone": "+256...", "code": "123456" }`  
  Success: `{ "success": true, "message": "Phone number verified" }`.  
  Errors: 400 with `"error": "Code expired or not found..."` or `"Invalid code"`.

Handle 400 and show the user the `error` message; on success you can proceed (e.g. mark phone verified or continue sign-up).

---

## 4. Quick checklist

- [ ] Twilio account created
- [ ] Account SID and Auth Token copied
- [ ] Phone number bought or Trial number with Verified Caller IDs for test numbers
- [ ] `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` set in Railway (or your host) and in `.env.local` for local dev
- [ ] App restarted after env changes
- [ ] (Optional) Firebase: only if you later add Firestore/Rules for verified-phone or phone auth
