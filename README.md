# VibeSync - Adaptive Relationship Engagement Platform

<div align="center">
  <h3>✨ Your Daily Connection Companion ✨</h3>
  <p>An AI-powered relationship app that helps couples stay emotionally engaged through adaptive daily activities and intelligent personalization.</p>
</div>

---

## 🏆 Hackathon Submission - Vibe Coding 2K26

**Team:** Solo Developer  
**Duration:** January 20-22, 2026  
**Mode:** Online/Individual

---

## 🚀 Live Demo

**Hosted Application:** [https://your-deployment-url.vercel.app](https://your-deployment-url.vercel.app)  
**GitHub Repository:** [https://github.com/your-username/vibesync](https://github.com/your-username/vibesync)

---

## 📋 User Stories Completed

### 🥉 Bronze Level - ✅ Complete
- **User Registration & Authentication** - Secure signup/login with JWT tokens and bcrypt password hashing
- **Partner Connection & Onboarding** - Unique partner codes + 3-step onboarding (communication style, love language, interests)

### 🥈 Silver Level - ✅ Complete
- **Daily Task Generation** - AI-generated personalized prompts based on user preferences and history

### 🥇 Gold Level - ✅ Complete
- **Feedback & Adaptation** - Star ratings + comments that influence future task generation

### 🏅 Platinum Level - ✅ Complete
- **Intent Understanding** - Mood check-ins + sentiment analysis from response text
- **Intelligent Personalization** - Tasks adapt based on emotional state, intensity preferences, and historical feedback
- **Avoids Repetition** - AI is instructed to avoid repeating previous tasks

### ⭐ Bonus Features Implemented
- ✅ **Mood Check-ins with Privacy Controls** - "Share Mood" toggle to control visibility
- ✅ **Task History & Engagement Analytics** - Timeline view + streak/memories/rating stats
- ✅ **Adjustable Task Intensity** - 3-level slider (Chill → Balanced → Deep)
- ✅ **Relationship Timeline/Progress View** - Full history page with responses
- ✅ **Interactive Response Exchange** - Partners submit responses that are revealed together
- ✅ **Password Recovery Flow** - Forgot password/reset functionality
- ❌ Smart Reminders/Notifications - Not implemented (out of scope for MVP)

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router), React, TypeScript |
| **Styling** | TailwindCSS, Framer Motion |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB (Mongoose) |
| **AI Layer** | Google Gemini API |
| **Authentication** | JWT, bcryptjs |
| **Deployment** | Vercel (Frontend) / Render (Backend) |

---

## 🤖 AI Usage Explanation

### How Gemini AI Powers VibeSync:

1. **Personalized Task Generation**
   - Gemini receives structured context about the couple including:
     - Both partners' onboarding data (communication style, love language, interests)
     - Current mood states and intensity preferences
     - Sentiment analysis from recent response texts
     - Historical task ratings and feedback comments
   
2. **Sentiment Analysis**
   - Simple keyword-based sentiment detection analyzes user responses
   - Positive/negative tone detection influences task recommendations
   - Example: Stressed responses → lighter, supportive prompts

3. **Adaptive Intelligence**
   - Feedback loop: Low ratings on a category → AI tries different categories
   - Mood-aware: Tired/stressed users get gentler prompts
   - Intensity-aware: Respects user preference for casual vs. deep activities

4. **Anti-Repetition**
   - Last 5 task titles are sent to Gemini with explicit instruction not to repeat

### Sample Prompt Structure:
```
=== COUPLE PROFILE ===
Partner 1: Communication=Direct, Love Language=Quality Time, Interests=Hiking, Movies

=== CURRENT EMOTIONAL STATE ===
Partner 1: Happy (Intensity: 2/3)
Sentiment: POSITIVE emotional tone

=== DESIRED INTENSITY: BALANCED (2/3) ===

=== ACTIVITY HISTORY & FEEDBACK ===
- Task: "Share a childhood memory" (Deep Talk). Ratings: [4/5, 5/5].

=== INSTRUCTIONS ===
- Create a prompt appropriate for BALANCED intensity level...
```

---

## 📁 Project Structure

```
vibecoding-relationship-app/
├── client/                  # Next.js Frontend
│   ├── app/
│   │   ├── (auth)/          # Login, Register, Forgot Password
│   │   ├── dashboard/       # Main dashboard
│   │   ├── history/         # Timeline view
│   │   ├── onboarding/      # User preference setup
│   │   └── globals.css      # Custom styles
│   └── lib/
│       ├── api.ts           # Axios client
│       └── utils.ts         # Utility functions
│
├── server/                  # Express Backend
│   ├── models/
│   │   ├── User.js          # User schema
│   │   └── Task.js          # Task schema
│   ├── routes/
│   │   ├── auth.js          # Authentication routes
│   │   ├── partner.js       # Partner connection routes
│   │   └── tasks.js         # Task & feedback routes
│   └── middleware/
│       └── auth.js          # JWT verification
```

---

## 🔧 Local Development

### Prerequisites
- Node.js 18+
- MongoDB instance
- Gemini API Key

### Environment Variables

**Server (.env):**
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/vibesync
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
```

**Client (.env.local):**
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### Running Locally

```bash
# Install dependencies
cd server && npm install
cd ../client && npm install

# Start backend (Terminal 1)
cd server && npm run dev

# Start frontend (Terminal 2)
cd client && npm run dev
```

---

## 📊 Key Features Breakdown

### Interactive Response Exchange
Unlike traditional task apps, VibeSync implements a unique "lock and reveal" system:
1. User A submits their response → locked
2. User B submits their response → both revealed simultaneously
3. Creates a shared moment of discovery

### Intelligent Adaptation Engine
The AI considers multiple signals:
- **Onboarding Data**: Long-term preferences
- **Current Mood**: Real-time emotional state
- **Response Sentiment**: Analyzed from text patterns
- **Historical Feedback**: Ratings and comments
- **Intensity Preference**: User-controlled depth slider

### Privacy-Respecting Design
- Mood sharing is opt-in via toggle
- Partner can only see mood if explicitly shared
- Secure authentication throughout

---

## 📈 Future Enhancements

- Push notifications for daily reminders
- Voice note responses
- Photo/media sharing for tasks
- Relationship coaching insights
- Calendar integration

---

## 📜 License

MIT License - Built with ❤️ for Vibe Coding Hackathon 2026

---

<div align="center">
  <h3>Made with ✨ and 💻</h3>
  <p>VibeSync - Because every relationship deserves intention.</p>
</div>
