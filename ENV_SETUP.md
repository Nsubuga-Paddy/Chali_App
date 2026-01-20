# Environment Variables Setup

## Required Environment Variables

Create a `.env.local` file in the root directory with the following variables:

### Firebase Configuration (Required)
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### AI Provider Configuration

#### Option 1: ElevenLabs + OpenAI (Recommended)
This setup uses ElevenLabs as the primary AI provider with OpenAI as fallback for maximum reliability.

```env
# Primary AI Provider
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Optional: Voice ID for TTS (defaults to Rachel voice)
ELEVENLABS_VOICE_ID=your_voice_id_here

# Optional: TTS Model ID (defaults to eleven_turbo_v2 - free tier compatible)
# Available models: eleven_turbo_v2, eleven_turbo_v2_5, eleven_multilingual_v2
ELEVENLABS_MODEL_ID=eleven_turbo_v2

# Fallback AI Provider
OPENAI_API_KEY=your_openai_api_key_here
```

**Benefits:**
- ElevenLabs tried first for responses
- Automatic fallback to OpenAI if ElevenLabs fails
- Best reliability and uptime
- RAG (vector search) works with both providers

**Get API Keys:**
- ElevenLabs: https://elevenlabs.io/ → Sign up → Dashboard → API Keys
- OpenAI: https://platform.openai.com/api-keys

---

#### Option 2: OpenAI Only
If you only want to use OpenAI (simpler setup):

```env
OPENAI_API_KEY=your_openai_api_key_here
```

**Note:** Without ElevenLabs, all responses will come from OpenAI. This is fine and fully supported.

---

#### Option 3: ElevenLabs Only
If you only have ElevenLabs:

```env
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Optional: Voice ID for TTS
ELEVENLABS_VOICE_ID=your_voice_id_here

# Optional: TTS Model ID (defaults to eleven_turbo_v2 - free tier compatible)
ELEVENLABS_MODEL_ID=eleven_turbo_v2
```

**Note:** If ElevenLabs text generation endpoint is not available, you'll need OpenAI as well.

---

## Important Notes

1. **At least ONE AI provider is required** - Either ElevenLabs or OpenAI must be configured
2. **Recommended setup**: Both ElevenLabs + OpenAI for best reliability
3. **Vector search (RAG)** works with both providers and is automatically used for MTN queries
4. **Provider priority**: ElevenLabs → OpenAI → Fallback (in that order)

## Testing Your Setup

After setting up your `.env.local`:

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Check the terminal logs - you should see:
   ```
   ✅ ElevenLabs API key found
   ✅ OpenAI API key found
   ```

3. Open the app and send a message to MTN support
4. Look for the provider badge on the response (ElevenLabs or GPT-4)
5. The header will show "Powered by ElevenLabs + RAG" or "Powered by GPT-4 + RAG"

## Troubleshooting

### "No AI provider configured" error
- Make sure you have either `ELEVENLABS_API_KEY` or `OPENAI_API_KEY` in your `.env.local`
- Restart your dev server after adding environment variables

### "ElevenLabs failed, falling back to OpenAI"
- This is normal and expected if ElevenLabs text API is not available
- The system will automatically use OpenAI
- Make sure you have `OPENAI_API_KEY` configured for fallback

### RAG not working
- Make sure you have the `mtn_vector_db` folder in your project root
- Check that `mtn_vector_search.py` exists
- Ensure Python is installed and accessible
- Vector search only works for MTN (other companies use keyword search)

### Provider not showing in UI
- The provider badge appears only on agent messages (not user messages)
- Look at the bottom-right of agent message bubbles
- The header shows the current provider after the first message

## Cost Considerations

### ElevenLabs
- Text generation pricing varies based on your plan
- Check their pricing at: https://elevenlabs.io/pricing
- May be more cost-effective for high volume

### OpenAI
- GPT-4o-mini is used (most cost-effective)
- Pricing: https://openai.com/pricing
- Pay per token usage

### Recommendation
Having both providers gives you flexibility to switch based on cost, performance, and availability.





