# Quick Start Guide - ElevenLabs + OpenAI Integration

## 🚀 Get Up and Running in 5 Minutes

### Step 1: Install Dependencies (1 min)
```bash
npm install
```

### Step 2: Configure API Keys (2 min)

Create `.env.local` in project root:

```env
# Choose at least ONE:
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Recommended: Configure BOTH for best reliability
```

**Get API Keys:**
- ElevenLabs: https://elevenlabs.io/ (free tier available)
- OpenAI: https://platform.openai.com/api-keys (requires payment)

### Step 3: Start Server (30 sec)
```bash
npm run dev
```

**Check terminal for:**
```
✅ ElevenLabs API key found
✅ OpenAI API key found
✅ Available providers: ElevenLabs + OpenAI
```

### Step 4: Test in Browser (1 min)
1. Open http://localhost:3000
2. Navigate to MTN customer care
3. Send: "How do I activate MoMo?"
4. ✅ Look for provider badge on response (ElevenLabs or GPT-4)
5. ✅ Look for "+RAG" badge (shows vector search working)

### Step 5: Run Tests (30 sec)
```bash
# In a new terminal (keep server running)
node test_api_complete.js
```

**Target:** 80%+ tests passing

---

## ✅ Success Checklist

- [ ] Dependencies installed
- [ ] At least one API key configured
- [ ] Server starts without errors
- [ ] Provider detected in terminal
- [ ] Test message gets response
- [ ] Provider badge shows in UI
- [ ] "+RAG" badge appears for MTN
- [ ] Automated tests mostly pass

---

## 🎯 What You Get

### Primary: ElevenLabs
- Tried first for all requests
- May offer cost benefits
- Falls back automatically if fails

### Fallback: OpenAI
- Kicks in if ElevenLabs unavailable
- Proven reliability
- GPT-4o-mini model

### RAG: Vector Search
- Semantic search in MTN knowledge base
- 918 chunks from cleaned data
- Accurate, contextual responses
- "+RAG" badge shows when active

### UI Indicators
- **Header**: Shows current AI provider
- **Message badge**: Shows which AI answered
- **Color coding**: Purple (ElevenLabs), Green (OpenAI)
- **"+RAG" badge**: Shows vector search used

---

## 🔧 Troubleshooting

### "No AI provider configured"
→ Add API key to `.env.local` and restart

### No provider badge showing
→ Check API response includes `provider` field

### RAG not working
→ Verify `mtn_vector_db/` folder exists

### Slow responses (>10s)
→ Check internet, API keys, browser network tab

---

## 📚 Full Documentation

- **ENV_SETUP.md** - Detailed environment setup
- **ELEVENLABS_INTEGRATION_SUMMARY.md** - Technical details
- **TEST_INTEGRATION.md** - Comprehensive testing
- **INTEGRATION_COMPLETE.md** - Complete overview

---

## 💡 Quick Tips

### Use Both Providers
```env
ELEVENLABS_API_KEY=...
OPENAI_API_KEY=...
```
Best reliability with automatic fallback.

### OpenAI Only (Simpler)
```env
OPENAI_API_KEY=...
```
Skip ElevenLabs if you only want OpenAI.

### Force OpenAI
In code, send:
```javascript
preferredProvider: 'openai'
```

### Check Logs
Terminal shows:
- Which provider was tried
- If fallback occurred
- Vector search results
- Error details

---

## 🎉 You're Ready!

If all checks pass above, your integration is complete and ready to use.

**For production deployment**, review:
- INTEGRATION_COMPLETE.md
- Production Checklist section
- Security best practices

---

**Need Help?**
1. Check terminal logs
2. Run `node test_api_complete.js`
3. Review ENV_SETUP.md
4. Check browser console





