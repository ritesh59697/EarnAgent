# 🤖 Earn Agent

> AI-powered Superteam Earn matcher — finds bounties, grants and projects that match your skills, and drafts your application automatically.

## How it works

1. **Scraper** polls Superteam Earn every 30 minutes for new listings
2. **AI agent** scores each listing against your profile (0–10) using Groq + Llama 3.3
3. **If score ≥ 7** → generates a tailored application draft
4. **Notifies you** via Telegram bot instantly + saves to web dashboard

---

## Stack

| Layer | Tech |
|---|---|
| Backend | Node.js + TypeScript |
| AI | Groq API (free) — Llama 3.3 70B |
| Database | Supabase (free tier) |
| Telegram bot | grammY |
| Frontend | Next.js 14 + Tailwind CSS |
| Hosting | Vercel (frontend) + Railway (backend) |

---

## Setup

### 1. Clone & install

```bash
git clone https://github.com/yourname/earn-agent
cd earn-agent

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) → New project
2. Open SQL Editor → paste contents of `backend/src/db/schema.sql` → Run
3. Copy your **Project URL** and **service_role key** from Settings → API

### 3. Get your Groq API key

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up → API Keys → Create key
3. Free tier: 14,400 requests/day — more than enough

### 4. Create your Telegram bot

1. Open Telegram → search `@BotFather`
2. Send `/newbot` → follow prompts
3. Copy the bot token

### 5. Configure environment

```bash
# Backend
cd backend
cp .env.example .env
# Fill in: GROQ_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, TELEGRAM_BOT_TOKEN

# Frontend
cd ../frontend
cp .env.local.example .env.local
# Fill in: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 6. Run locally

```bash
# Terminal 1 — backend (bot + scraper + agent)
cd backend && npm run dev

# Terminal 2 — frontend dashboard
cd frontend && npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the dashboard.
Open Telegram → find your bot → send `/start` to onboard.

---

## Project structure

```
earn-agent/
├── backend/
│   ├── src/
│   │   ├── scraper/index.ts     # Fetches listings from Superteam Earn
│   │   ├── agent/index.ts       # AI matching + draft generation (Groq)
│   │   ├── bot/index.ts         # Telegram bot (grammY)
│   │   ├── db/
│   │   │   ├── client.ts        # Supabase client
│   │   │   └── schema.sql       # Database schema
│   │   └── index.ts             # Entry point, cron scheduler
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/app/
    │   ├── page.tsx             # Main dashboard UI
    │   ├── layout.tsx
    │   └── globals.css
    ├── .env.local.example
    └── package.json
```

---

## Deploying to production

### Frontend → Vercel (free)
```bash
cd frontend
npx vercel
# Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel dashboard
```

### Backend → Railway (free tier)
1. Push to GitHub
2. Go to [railway.app](https://railway.app) → New project → Deploy from GitHub
3. Add all env vars from `.env.example`
4. Set start command: `npm run start`

---

## Cost breakdown

| Service | Cost |
|---|---|
| Groq API | Free (14,400 req/day) |
| Supabase | Free (500MB DB) |
| Vercel | Free |
| Railway | Free tier |
| Telegram bot | Free |
| **Total** | **$0/month** |

---

## Built for Superteam Earn — Agentic Engineering Grant
