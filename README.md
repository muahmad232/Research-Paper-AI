# 🤖 Research Paper Screening Agent

> An autonomous AI agent that discovers, screens, analyzes, and recommends research papers tailored to your exact profile — so you only review what matters.

![Stack](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![Stack](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![Stack](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)
![Stack](https://img.shields.io/badge/Groq-FF4B00?style=flat&logoColor=white)
![Stack](https://img.shields.io/badge/LangChain-1C3C3C?style=flat&logo=langchain&logoColor=white)

---

## 🌟 Features

| Feature | Description |
|---------|-------------|
| **Autonomous Agent** | Generates its own search terms from your profile and runs daily via GitHub Actions |
| **Multi-Source Fetching** | Pulls from **arXiv** + **OpenAlex** simultaneously |
| **4-Signal Scoring** | Embeddings (40%), LLM Judgment (25%), Keywords (20%), Recency (15%) |
| **LLM Deep Analysis** | Groq Llama 3.1 8B extracts problem, method, results, and limitations |
| **Research Gap Detection** | AI identifies under-explored areas, trends, and hot topics in your weekly corpus |
| **Human Escalation** | Ambiguous or conflicting papers are routed to a review queue for your judgment |
| **Daily Digest** | Personalized AI-written summary of each day's discoveries |
| **Progressive UI** | Glassmorphic frontend with an interactive onboarding tour and real-time agent progress tracking |

---

## 🗂️ Project Structure

```
research-paper-agent/
├── frontend/          # React + Vite + TailwindCSS
│   └── src/
│       ├── pages/     # LandingPage, Dashboard, Papers, ResearchGaps, Escalations, Settings
│       ├── components/# Layouts, Modals, Cards
│       └── api/       # Axios client
├── backend/           # FastAPI + LangChain
│   └── app/
│       ├── agent/     # Orchestrator + 6 LangChain tools + Prompts
│       ├── routers/   # REST API endpoints
│       └── services/  # arXiv, OpenAlex, Embeddings
├── supabase/
│   └── schema.sql     # Full DB schema with pgvector and user profiles
└── .github/
    └── workflows/
        ├── daily_agent.yml      # Cron job calling /agent/run-all
        └── deploy-backend.yml   # Syncs backend to Hugging Face Space
```

---

## 🚀 Quick Start

### 1. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Enable the **pgvector** extension in Database > Extensions
3. Run `supabase/schema.sql` in the SQL Editor

### 2. Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate    # Windows
source venv/bin/activate # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your Supabase URL, service key, and Groq API key

# Run the API
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend

# Create env file
echo "VITE_API_URL=http://localhost:8000" > .env.local

# Install and run dev server
npm install
npm run dev
```

Open `http://localhost:5173`

---

## ⚙️ Environment Variables

### Backend `.env`

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Service role key (from Project Settings > API) |
| `GROQ_API_KEY` | From [console.groq.com](https://console.groq.com) |
| `JWT_SECRET_KEY` | Secure random string for auth tokens |
| `DAILY_AGENT_SECRET` | A secret string for GitHub Actions to authenticate |
| `MAX_PAPERS_PER_RUN` | Max papers to fetch per run (default: 20) |

### Frontend `.env.local`

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend URL (e.g., `http://localhost:8000` or hosted URL) |

---

## 🔁 Agent Pipeline

> [!NOTE]
> For an exhaustive, interview-ready engineering breakdown of the models, algorithms, data structures, and optimizations used in the agent pipeline, check out the [Agent Pipeline Deep-Dive](file:///e:/Projects/Research%20Papers%20AI/backend/app/agent/README.md).

The pipeline can be triggered in two ways:
1. **User Triggered**: `POST /agent/run` (loads only the active user's profile, takes ~2 mins).
2. **Scheduled**: `POST /agent/run-all` (triggered by GitHub Actions at 7 AM UTC for all profiles).

```
Pipeline Steps
        │
        ├─ Step 1: Load Profiles
        ├─ Step 2: Fetch Papers (LLM generates query terms → arXiv & OpenAlex)
        ├─ Step 3: Generate Embeddings (all-MiniLM-L6-v2)
        ├─ Step 4: Score & Classify (Cosine + LLM + Keyword + Recency)
        ├─ Step 5: Analyze highly relevant papers (Groq Llama 3.1 8B)
        ├─ Step 6: Identify Research Gaps
        ├─ Step 7: Flag Escalations
        └─ Step 8: Generate Daily Digest
```

### 4-Signal Scoring Formula

```
Final Score = (Semantic Similarity × 0.40) + (LLM Relevance × 0.25) + (Keyword Match × 0.20) + (Recency × 0.15)

Classification Thresholds:
  ≥ 68  → Highly Relevant   (auto-analyzed by LLM)
  38-67 → Potentially Relevant
  < 38  → Not Relevant

Escalation Triggers:
  - Score falls between 50-70 (the "uncertain" boundary)
  - Conflicting signals (e.g., extremely high cosine similarity but LLM says it's irrelevant)
```

---

## 🔌 API Reference

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/papers` | List scored papers | JWT |
| `GET` | `/papers/{id}` | Paper details + analysis | JWT |
| `GET` | `/profile` | Get user research profile | JWT |
| `POST` | `/profile` | Create/replace profile | JWT |
| `GET` | `/gaps` | Research gap reports | JWT |
| `GET` | `/escalations` | Papers needing human review | JWT |
| `POST` | `/escalations/{id}/decide` | Accept or reject an escalated paper | JWT |
| `GET` | `/digest/latest` | Latest daily digest | JWT |
| `POST` | `/agent/run` | Run pipeline for current user profile | JWT |
| `POST` | `/agent/run-all` | Run pipeline for ALL users | `X-Agent-Secret` |
| `GET` | `/agent/status` | Recent pipeline execution logs | JWT |

---

## 🚢 Deployment

### Backend → Hugging Face Spaces

1. Create a Docker Space on [Hugging Face](https://huggingface.co)
2. Add your GitHub repository's `HF_TOKEN` secret to GitHub Actions.
3. The `.github/workflows/deploy-backend.yml` action will automatically sync the `backend/` directory to Hugging Face on push to main.

### Frontend → Vercel or Netlify

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com) or Netlify.
3. Set root directory to `frontend`
4. Add `VITE_API_URL` pointing to your Hugging Face Space URL.

### GitHub Actions (Daily Agent)

In your repository **Settings > Secrets**, add:

| Secret | Value |
|--------|-------|
| `BACKEND_URL` | Your Hugging Face Space URL (e.g., `https://muahmad123-research-ai.hf.space`) |
| `DAILY_AGENT_SECRET` | Same value as in backend `.env` |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TailwindCSS 3, React Query v5, Zustand, Lucide React |
| Backend | FastAPI, LangChain, Pydantic v2 |
| Database | Supabase (PostgreSQL + pgvector) |
| LLM | Groq API (llama-3.1-8b-instant) |
| Embeddings | sentence-transformers/all-MiniLM-L6-v2 |
| Automation | GitHub Actions |

---

## 📄 License

MIT
