# SkillSwap - AI-Powered Peer-to-Peer Skill Exchange

SkillSwap is a premium web application designed to facilitate peer-to-peer skill exchanges, integrated with a voice-based AI assessment agent that evaluates user skills and issues mentor certificates.

---

## 📂 Project Structure

```
├── .env                              # Frontend environment configurations (Supabase URL/Anon Key)
├── package.json                      # Node dependencies and npm scripts
├── supabase_schema.sql               # Database schema definition (tables, triggers, RLS policies)
├── supabase/                         # Supabase configuration and edge functions
│   └── functions/
│       ├── create-session/           # Edge function to initialize session instances
│       ├── google-tts/               # Google Text-to-Speech Edge integration
│       └── interview-agent/          # AI Interviewer Agent (integrates with Groq LLM)
├── src/                              # Frontend source code
│   ├── App.tsx                       # Main entry and React Router definitions
│   ├── index.css                     # Global styles and tailwind integration
│   ├── components/                   # Reusable UI layout and modular components
│   │   ├── Layout.tsx                # Master dashboard wrapper layout
│   │   ├── Navbar.tsx                # Navigation header
│   │   ├── Sidebar.tsx               # Left sidebar for dashboard navigation
│   │   └── ProtectedRoute.tsx        # Authentication Route guard
│   ├── context/                      # Global React State contexts
│   │   ├── AuthContext.tsx           # Session management & user profile caching
│   │   └── ThemeContext.tsx          # System dark/light mode toggle provider
│   ├── hooks/                        # Custom React Hooks
│   │   └── useInterviewController.ts # Core state controller for speech & AI interview flow
│   ├── lib/                          # Services and backend clients
│   │   ├── supabaseClient.ts         # Supabase JS initialization client
│   │   ├── qualificationService.ts   # Interview session & assessment database calls
│   │   ├── certificateService.ts     # PDF Certificate compiler
│   │   └── VoiceService.ts           # Speech synthesis interface wrapper
│   ├── services/                     # Utility services
│   │   ├── SpeechService.ts          # Speech Recognition listener (Web Speech API)
│   │   └── GroqService.ts            # Client-side agent execution fallback
│   ├── pages/                        # View Pages
│   │   ├── LandingPage.tsx           # Public homepage introducing the platform
│   │   ├── AuthPage.tsx              # Sign up / Log in page
│   │   ├── ResetPasswordPage.tsx     # Account recovery portal
│   │   ├── DashboardPage.tsx         # User workspace (shows certificates, active requests, history)
│   │   ├── BrowseSkillsPage.tsx      # Explorer view to find and request swaps with peer mentors
│   │   ├── SkillsPage.tsx            # View and manage personal teaches/learns skills catalog
│   │   ├── RequestsPage.tsx          # Inbox for managing incoming and outgoing swap requests
│   │   ├── SessionPage.tsx           # Co-working workspace room interface
│   │   ├── AssessmentSetupPage.tsx   # Language configuration & pre-checks for AI qualification
│   │   ├── AssessmentPage.tsx        # Immersive speech-to-text voice assessment room
│   │   ├── InterviewSummaryPage.tsx  # Post-interview evaluation metrics, tabs, & certificates
│   │   └── CertificatesPage.tsx      # Vault containing all earned mentor certificates
│   └── types/
│       └── index.ts                  # Type definitions for the application
```

---

## 🛠️ Database Setup

The tables, triggers, and Row Level Security (RLS) policies are managed via the [supabase_schema.sql](file:///c:/Users/srith/Downloads/super_apps/supabase_schema.sql) script.

### Essential Tables
1. **`profiles`**: User information, available statuses, and certificates checklist.
2. **`skills`**: Catalog of skills supported by the platform.
3. **`user_skills`**: Maps whether a user wants to `teach` or `learn` a skill.
4. **`swap_requests`**: Coordination of skill exchange contracts between users.
5. **`interview_sessions`**: Active interview state logs (JSON transcript, progression status).
6. **`mentor_assessments`**: Stores overall grade, badge levels, and sub-score metrics.

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v18 or higher)
* **Supabase CLI** (for local Deno function deployment)

### 1. Installation
Install project dependencies:
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory and configure your keys:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Deploy Edge Functions
Login to Supabase CLI and deploy the Edge Functions:
```bash
npx supabase login
npx supabase secrets set GROQ_API_KEY=your_groq_key
npx supabase functions deploy interview-agent
```

### 4. Running the App
Run the local Vite development server:
```bash
npm run dev
```
The application will be served at `http://localhost:5173`.
