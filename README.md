# Chali - Your Payment Assistant 🇺🇬

A beautiful, conversational super-app for utility payments in Uganda. Chat or speak to an AI assistant to manage all your payments - from Yaka electricity to water bills, airtime, TV subscriptions, and more.

![Chali App](https://img.shields.io/badge/Next.js-14-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue) ![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.3-38bdf8) ![PWA Ready](https://img.shields.io/badge/PWA-Ready-5a67d8)

## ✨ Features

### 🤖 AI-Powered Chat Interface
- Natural language processing for payment commands
- Voice input support for hands-free operation
- Smart payment suggestions and quick actions
- Real-time typing indicators and smooth animations

### 💳 Comprehensive Payment Options
- **Yaka** - Electricity tokens
- **NWSC** - Water bill payments
- **Airtime & Data** - MTN, Airtel, Africell
- **Tax Services** - URA (Uganda Revenue Authority)
- **School Fees** - Direct institutional payments
- **URA** - Tax payments
- **Contact Payments** - Send money to saved contacts

### 💰 Smart Wallet
- Real-time balance tracking
- Multiple top-up methods (Mobile Money, Cards)
- Transaction history with detailed receipts
- Spending analytics and insights
- Quick send and receive money

### 👤 User Profile & Settings
- Save frequently used account numbers
- Manage payment methods
- Dark/Light mode toggle
- Transaction notifications
- Security settings (PIN, Password)

### 📱 Mobile-First Design
- Responsive layout for all screen sizes
- WhatsApp-inspired chat bubbles
- Fintech-quality dashboard design
- Smooth animations and transitions
- PWA support for offline access

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Modern web browser
- (Optional) n8n instance for automation workflows

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/chali-app.git
   cd chali-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your configuration.

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: TailwindCSS with custom animations
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **State Management**: React Hooks
- **PWA**: Next.js PWA support

## 📱 PWA Installation

The app is Progressive Web App (PWA) ready! Users can install it on their devices:

1. Open the app in a browser (Chrome, Edge, Safari)
2. Click the install prompt or use browser's "Install App" option
3. Access Chali like a native app with offline support

## 🎨 Design Philosophy

Chali combines the simplicity of WhatsApp with the trustworthiness of fintech apps like Revolut and Flutterwave:

- **Chat-first**: Natural conversation flow
- **Minimal UI**: Clean, uncluttered interface
- **Friendly**: Soft colors, rounded corners
- **Accessible**: High contrast, large touch targets
- **Fast**: Optimized performance, instant feedback

## 🔌 API Integration

The app is designed to integrate with backend APIs and n8n workflows. Key integration points:

- `/api/auth` - User authentication
- `/api/payments` - Payment processing
- `/api/wallet` - Wallet operations
- `/api/transactions` - Transaction history
- n8n webhooks for automation workflows

## 🌙 Dark Mode

Toggle between light and dark themes in the Profile settings. The preference is saved locally and persists across sessions.

## 📊 Transaction Types

All supported services:
- ⚡ Yaka Electricity
- 💧 NWSC Water
- 📱 MTN/Airtel/Africell Airtime & Data
- 📺 TV Subscriptions (DStv, GOtv, etc.)
- 🎓 School Fees
- 📄 URA Tax Payments
- 👥 Person-to-Person Transfers

## 🔐 Security Features

- Secure authentication flow
- Encrypted local storage
- PIN/Password protection options
- Transaction verification
- Fraud detection ready

## 🚧 Development Roadmap

- [ ] Backend API integration
- [ ] Real voice recognition (Web Speech API)
- [ ] Biometric authentication
- [ ] QR code payments
- [ ] Split bill feature
- [ ] Recurring payments/subscriptions
- [ ] Multi-language support (Luganda, Swahili)
- [ ] WhatsApp-style contact sharing

## 📝 Usage Examples

### Making a Payment via Chat
```
User: "Pay Yaka 10,000"
Chali: "I'll help you buy Yaka electricity. What's your meter number?"
User: "04123456789"
Chali: "✅ Payment successful! UGX 10,000 sent to meter 04123456789"
```

### Quick Actions
Use the quick action buttons at the top of the chat for instant access to payment types.

### Saved Accounts
Save frequently used account numbers in your profile for one-tap payments.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Author

Built with ❤️ for Uganda

## 🙏 Acknowledgments

- Inspired by WhatsApp's simplicity
- Design patterns from Revolut and Flutterwave
- Icons by Lucide React
- Community feedback and testing

---

**Note**: This is a front-end implementation. Backend API integration is required for production use. The current version uses mock data for demonstration purposes.

## 📞 Support

For issues or questions, please open an issue on GitHub or contact support.

---

Made with ❤️ in Uganda 🇺🇬

