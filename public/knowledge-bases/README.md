# Knowledge Bases

This directory contains AI knowledge bases for different companies' customer support chatbots.

## Structure

Each company has its own folder with a `knowledge.json` file:

```
knowledge-bases/
├── mtn/
│   └── knowledge.json
├── airtel/
│   └── knowledge.json
├── umeme/
│   └── knowledge.json
├── nwsc/
│   └── knowledge.json
├── dstv/
│   └── knowledge.json
└── ura/
    └── knowledge.json
```

## JSON Format

Each `knowledge.json` file should follow this structure:

```json
{
  "company": "Company Name",
  "lastUpdated": "2024-11-20",
  "version": "1.0",
  "products": [
    {
      "title": "Product Title",
      "product_name": "Product Name",
      "description": "Description of the product/service",
      "pricing": "Pricing information",
      "activation": "How to activate the service",
      "deactivation": "How to deactivate the service",
      "faqs": "Frequently asked questions and answers",
      "eligibility": "Who can use this service",
      "terms": "Terms and conditions"
    }
  ]
}
```

## How to Add a New Knowledge Base

### 1. For MTN (Already Configured)

You already have the MTN knowledge base file on your desktop. To use it:

1. Copy your `MTN.json` file from `C:\Users\PADDY\Desktop\MTN.json`
2. Rename it to `knowledge.json`
3. Replace the placeholder file at `knowledge-bases/mtn/knowledge.json`
4. Make sure it follows the format above

If your MTN file has a different structure (e.g., `mtn_products` array), update it to match:
- Change `"mtn_products"` to `"products"`
- Add `"company"`, `"lastUpdated"`, and `"version"` fields at the root

### 2. For Other Companies

When you get knowledge bases for other companies:

1. Create/use the company folder (already created)
2. Add your `knowledge.json` file to that folder
3. Ensure it follows the same format
4. The chatbot will automatically use it!

## How It Works

1. **Loading**: When a user opens a customer care chat, the system loads that company's knowledge base
2. **Caching**: Knowledge bases are cached in memory for faster responses
3. **Search**: User queries are matched against product names, descriptions, and FAQs
4. **Response**: The most relevant information is extracted and formatted as a response

## Supported Companies

Currently configured companies:
- ✅ MTN (ready to use - just add your file)
- ⏳ Airtel (waiting for knowledge base)
- ⏳ UMEME (waiting for knowledge base)
- ⏳ NWSC (waiting for knowledge base)
- ⏳ DStv (waiting for knowledge base)
- ⏳ URA (waiting for knowledge base)

## Testing

To test if a knowledge base is working:

1. Start the app: `npm run dev`
2. Go to Chat tab
3. Open the company's customer support chat
4. Ask questions like:
   - "Tell me about data bundles"
   - "How much is the daily bundle?"
   - "How do I activate?"
   - "Show me FAQs"

The chatbot should respond with information from the knowledge base!

## Updating Knowledge Bases

To update a knowledge base:

1. Replace the `knowledge.json` file with the updated version
2. Update the `lastUpdated` and `version` fields
3. Restart the app or refresh the page
4. The cache will be cleared and new data loaded

## Troubleshooting

**Q: Chatbot is giving generic responses**
- A: Check if the `knowledge.json` file exists and is valid JSON
- A: Check browser console for loading errors

**Q: Knowledge base not loading**
- A: Ensure file path is correct: `/knowledge-bases/[company]/knowledge.json`
- A: Check file format matches the schema above

**Q: Responses don't match my queries**
- A: Add more keywords to product descriptions and FAQs
- A: Use common terms users might search for

**Q: Need to add a new company**
- A: Create a new folder in `knowledge-bases/`
- A: Add the company to `COMPANY_KB_MAP` in `lib/knowledgeBase.ts`
- A: Add company info to `companyData` in `components/CustomerCareChat.tsx`

## Future Enhancements

- [ ] Dynamic loading from Firebase/API
- [ ] Version control and auto-updates
- [ ] Multi-language support
- [ ] Semantic search (AI embeddings)
- [ ] Analytics on common queries
- [ ] Admin panel for managing knowledge bases

