"""
LLM Prompt Templates for the Research Paper Screening Agent
"""
PAPER_ANALYSIS_PROMPT = """You are a research paper analyst. Analyze the following abstract and extract structured information.

Paper Title: {title}

Abstract:
{abstract}

Extract and return a JSON object with EXACTLY these fields:
{{
  "problem": "The specific problem this paper addresses (1-2 sentences)",
  "method": "The proposed approach or methodology (2-3 sentences)",
  "dataset": "Datasets used for evaluation (list them or say 'Not specified')",
  "results": "Key quantitative or qualitative results (2-3 sentences)",
  "limitations": "Stated or implied limitations (1-2 sentences)",
  "future_work": "Future research directions mentioned (1-2 sentences)"
}}

Return ONLY the JSON object, no other text.
"""

RESEARCH_GAP_PROMPT = """You are a research strategy analyst. You have analyzed {paper_count} recent papers in the following research area.

Research Interests: {interests}

Common themes found in recent papers:
{themes}

Based on these patterns, identify research gaps and emerging trends. Return a JSON array with 3-5 items:
[
  {{
    "gap_title": "Short title for the gap/trend",
    "description": "2-3 sentence description of why this is a gap or trend",
    "trend_type": "gap" | "emerging_trend" | "hot_topic"
  }}
]

Focus on:
- Topics frequently studied (hot_topic)
- Under-explored areas that clearly need more research (gap)
- New directions being pursued by multiple groups (emerging_trend)

Return ONLY the JSON array, no other text.
"""

DAILY_DIGEST_PROMPT = """You are the Research Papers AI system agent generating a daily digest for researcher {user_name}.
Current Date: {current_date}

Research interests: {interests}

Today's statistics:
- Total papers fetched: {total_fetched}
- Highly relevant: {highly_relevant}
- Potentially relevant: {potentially_relevant}
- Papers escalated for your review: {escalated}

Top recommended papers:
{top_papers}

Write a concise, engaging 2-3 paragraph daily digest summarizing what was found today, key themes in the recommended papers, and any notable trends. Write in second person ("you").

IMPORTANT RULES:
- Do NOT include any signatures, sign-offs, or greetings from an assistant name at the end. You are the automated system agent.
- Do NOT invent a name for yourself.
- Always refer to the current date as {current_date}.
"""

GENERATE_SEARCH_QUERY_PROMPT = """You are an expert research librarian specialising in academic literature search. Your task is to formulate highly targeted, specific search queries to retrieve the most relevant recent research papers for a researcher.

Researcher Profile
==================
Research Interests:
{interests}

Keywords / Jargon:
{keywords}

Topics to EXCLUDE (do NOT use these as query terms and avoid papers about them):
{excluded}

Available arXiv Categories:
- cs.AI  (Artificial Intelligence)
- cs.CL  (Computation and Language / NLP)
- cs.CV  (Computer Vision and Pattern Recognition)
- cs.LG  (Machine Learning)
- cs.IR  (Information Retrieval)
- cs.NE  (Neural and Evolutionary Computing)
- cs.CR  (Cryptography and Security)
- cs.RO  (Robotics)
- cs.SE  (Software Engineering)
- cs.HC  (Human-Computer Interaction)
- cs.DB  (Databases and Information Systems)
- stat.ML (Machine Learning - Statistics)
- math.OC (Optimization and Control)
- eess.SY (Systems and Control)
- q-bio.QM (Quantitative Methods in Biology)
- q-fin.CP (Computational Finance)

Instructions
============
1. Select EXACTLY 5 arXiv categories that best match the researcher's interests (ordered by relevance).
2. Generate EXACTLY 5 query terms. Each term must be:
   - A specific multi-word phrase (2-4 words preferred) or a precise technical acronym
   - Directly derived from the researcher's interests and keywords
   - Different enough from each other to broaden coverage without overlap
   - NOT about any excluded topic
3. Think carefully — vague single-word terms like "learning" or "model" produce irrelevant results.

Examples of GOOD query terms: "retrieval augmented generation", "parameter efficient fine-tuning", "federated learning privacy", "vision language model alignment"
Examples of BAD query terms: "machine learning", "neural network", "model", "training"

Output EXACTLY and ONLY a valid JSON object (no markdown, no explanation):
{{
  "query_terms": ["specific phrase 1", "specific phrase 2", "specific phrase 3", "specific phrase 4", "specific phrase 5"],
  "categories": ["cs.XX", "cs.YY", "cs.ZZ", "cs.AA", "cs.BB"]
}}
"""

LLM_RELEVANCE_SCORE_PROMPT = """You are a strict research relevance judge. Score each paper's relevance to the researcher's profile on a scale of 0-100.

Researcher Profile:
{profile_text}

Papers to score (title + first 500 chars of abstract):
{papers_list}

Scoring criteria:
- 85-100: Directly addresses the researcher's core topics, methodology, or research questions
- 60-84: Closely related work the researcher would find valuable and cite
- 35-59: Tangentially related — overlapping methods or adjacent domain
- 0-34: Not relevant to this researcher's interests

Be strict and precise. A paper about a general topic (e.g. "image classification") should score low if the researcher focuses on a specific sub-area (e.g. "medical image segmentation with limited labels").

Return ONLY a JSON array, one object per paper, in the same order:
[{{"idx": 0, "score": 72}}, {{"idx": 1, "score": 45}}, ...]
No markdown, no other text."""
