-- ============================================================
-- Research Paper Screening Agent — Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- User Profile
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    research_interests TEXT[] DEFAULT '{}',
    keywords TEXT[] DEFAULT '{}',
    preferred_domains TEXT[] DEFAULT '{}',
    preferred_venues TEXT[] DEFAULT '{}',
    excluded_topics TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Raw Papers (fetched from arXiv / Semantic Scholar)
-- ============================================================
CREATE TABLE IF NOT EXISTS papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT UNIQUE NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('arxiv', 'semantic_scholar')),
    title TEXT NOT NULL,
    abstract TEXT,
    authors TEXT[] DEFAULT '{}',
    categories TEXT[] DEFAULT '{}',
    published_at DATE,
    url TEXT,
    embedding VECTOR(384),
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector similarity index (cosine distance)
CREATE INDEX IF NOT EXISTS papers_embedding_idx
    ON papers USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- ============================================================
-- Recommendations (scored + classified papers)
-- ============================================================
CREATE TABLE IF NOT EXISTS recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    semantic_score FLOAT DEFAULT 0,
    keyword_score FLOAT DEFAULT 0,
    recency_score FLOAT DEFAULT 0,
    final_score FLOAT DEFAULT 0,
    category TEXT NOT NULL CHECK (category IN ('highly_relevant', 'potentially_relevant', 'not_relevant')),
    explanation JSONB DEFAULT '{}',
    analysis JSONB DEFAULT '{}',
    escalated BOOLEAN DEFAULT FALSE,
    user_decision TEXT CHECK (user_decision IN ('accept', 'reject', NULL)),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS recommendations_profile_idx ON recommendations(profile_id);
CREATE INDEX IF NOT EXISTS recommendations_category_idx ON recommendations(category);
CREATE INDEX IF NOT EXISTS recommendations_escalated_idx ON recommendations(escalated) WHERE escalated = TRUE;

-- ============================================================
-- Research Gaps
-- ============================================================
CREATE TABLE IF NOT EXISTS research_gaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    gap_title TEXT NOT NULL,
    description TEXT,
    supporting_paper_ids UUID[] DEFAULT '{}',
    trend_type TEXT NOT NULL CHECK (trend_type IN ('gap', 'emerging_trend', 'hot_topic')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Daily Digests
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_digests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    digest_date DATE NOT NULL,
    total_fetched INT DEFAULT 0,
    highly_relevant INT DEFAULT 0,
    potentially_relevant INT DEFAULT 0,
    escalated INT DEFAULT 0,
    summary TEXT,
    top_paper_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, digest_date)
);

-- ============================================================
-- Agent Run Logs
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    papers_fetched INT DEFAULT 0,
    papers_processed INT DEFAULT 0,
    errors TEXT[] DEFAULT '{}',
    log TEXT
);

-- ============================================================
-- Helper: Update timestamp trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
