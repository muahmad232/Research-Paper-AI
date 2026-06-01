# 🤖 Research Paper Screening Agent

> An autonomous AI agent that discovers, screens, analyzes, and recommends research papers — so you only review what matters.

![Stack](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![Stack](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![Stack](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)
![Stack](https://img.shields.io/badge/Groq-FF4B00?style=flat&logoColor=white)
![Stack](https://img.shields.io/badge/LangChain-1C3C3C?style=flat&logo=langchain&logoColor=white)

---

## 🌟 Features

| Feature | Description |
|---------|-------------|
| **Autonomous Daily Pipeline** | Runs every day at 7 AM UTC via GitHub Actions |
| **Multi-Source Fetching** | Pulls from arXiv + Semantic Scholar simultaneously |
| **Semantic Scoring** | Cosine similarity via all-MiniLM-L6-v2 embeddings |
| **LLM Analysis** | Groq Llama3 extracts problem, method, results, limitations |
| **Research Gap Detection** | AI identifies under-explored areas in your field |
| **Explainability Engine** | Every recommendation shows exactly why it was chosen |
| **Human Escalation** | Uncertain papers routed to a review queue |
| **Daily Digest** | AI-written summary of each day's findings |

---

## 🗂️ Project Structure

```
research-paper-agent/
├── frontend/          # React + Vite + TailwindCSS
│   └── src/
│       ├── pages/     # Dashboard, Papers, ResearchGaps, Escalations, Settings
│       ├── components/
│       └── api/
├── backend/           # FastAPI + LangChain
│   └── app/
│       ├── agent/     # Orchestrator + 6 LangChain tools
│       ├── routers/   # REST API endpoints
│       └── services/  # arXiv, Semantic Scholar, Embeddings
├── supabase/
│   └── schema.sql     # Full DB schema with pgvector
└── .github/
    └── workflows/
        └── daily_agent.yml
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
venv\Scripts\activate   # Windows
source venv/bin/activate # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env with your Supabase URL, service key, and Groq API key

# Run the API
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend

# Create env file
echo "VITE_API_URL=http://localhost:8000" > .env.local

# Run dev server
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
| `DAILY_AGENT_SECRET` | A secret string for GitHub Actions to authenticate |
| `MAX_PAPERS_PER_RUN` | Max papers to fetch per run (default: 200) |
| `ARXIV_QUERY_TERMS` | Comma-separated search terms |
| `ARXIV_CATEGORIES` | Comma-separated arXiv categories |

### Frontend `.env.local`

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend URL (e.g. `https://your-backend.onrender.com`) |

---

## 🔁 Agent Pipeline

```
GitHub Actions (7 AM UTC)
        │
        ▼
POST /agent/run
        │
        ├─ Step 1: Fetch Papers (arXiv + Semantic Scholar)
        ├─ Step 2: Generate Embeddings (all-MiniLM-L6-v2)
        ├─ Step 3: Score & Classify (Cosine + Keyword + Recency)
        ├─ Step 4: LLM Analysis (Groq Llama3-8b)
        ├─ Step 5: Research Gap Detection
        ├─ Step 6: Escalation Queue Update
        └─ Step 7: Generate Daily Digest
```

### Scoring Formula

```
Final Score = (Semantic Similarity × 0.50) + (Keyword Match × 0.30) + (Recency × 0.20)

Classification:
  ≥ 80  → Highly Relevant   (auto-analyzed by LLM)
  50-79 → Potentially Relevant
  < 50  → Ignored

Escalation Triggers:
  - Score between 50-70 (uncertain range)
  - High semantic + low keyword = conflicting signals
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/papers` | List scored papers (filter by category, source) |
| `GET` | `/papers/{id}` | Paper details + analysis |
| `GET` | `/profile` | Get user research profile |
| `POST` | `/profile` | Create/replace profile |
| `PUT` | `/profile` | Update profile |
| `GET` | `/gaps` | Research gap reports |
| `GET` | `/escalations` | Papers needing human review |
| `POST` | `/escalations/{id}/decide` | Accept or reject a paper |
| `GET` | `/digest/latest` | Latest daily digest |
| `POST` | `/agent/run` | Trigger full pipeline |
| `GET` | `/agent/status` | Recent run statuses |

---

## 🚢 Deployment

### Backend → Render

1. Push code to GitHub
2. Create a new **Web Service** on [render.com](https://render.com)
3. Set root directory to `backend`
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Add all environment variables

### Frontend → Vercel

1. Push code to GitHub
2. Import project in [vercel.com](https://vercel.com)
3. Set root directory to `frontend`
4. Add `VITE_API_URL` pointing to your Render backend URL

### GitHub Actions

In your repository **Settings > Secrets**, add:

| Secret | Value |
|--------|-------|
| `BACKEND_URL` | Your Render backend URL |
| `DAILY_AGENT_SECRET` | Same value as in backend `.env` |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TailwindCSS 3, React Query, Zustand |
| Backend | FastAPI, LangChain, Pydantic v2 |
| Database | Supabase (PostgreSQL + pgvector) |
| LLM | Groq API (Llama3-8b-8192) |
| Embeddings | sentence-transformers/all-MiniLM-L6-v2 |
| Automation | GitHub Actions (cron) |

---

## 📄 License

MIT
