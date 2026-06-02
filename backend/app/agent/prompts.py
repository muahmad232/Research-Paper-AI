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

GENERATE_SEARCH_QUERY_PROMPT = """You are an expert research librarian. Your task is to formulate a highly targeted search query to find the most relevant recent research papers for a user based on their profile.

User Research Interests:
{interests}

User Keywords:
{keywords}

Available arXiv Categories:
- cs.AI (Artificial Intelligence)
- cs.CL (Computation and Language / NLP)
- cs.CV (Computer Vision)
- cs.LG (Machine Learning)
- cs.CR (Cryptography and Security)
- cs.RO (Robotics)
- cs.SE (Software Engineering)
- cs.HC (Human-Computer Interaction)
- stat.ML (Machine Learning - Statistics)
- math.OC (Optimization and Control)
- eess.SY (Systems and Control)
- q-bio.QM (Quantitative Methods in Biology)
- q-fin.CP (Computational Finance)

Based on the user's profile, select EXACTLY 3 highly relevant arXiv categories from the list above, and formulate EXACTLY 3 specific query terms (can be short phrases, acronyms, or single words) that will yield the best search results across databases.

Output EXACTLY and ONLY a JSON object in this format:
{{
  "query_terms": ["term1", "term2", "term3"],
  "categories": ["cs.AI", "cs.LG", "stat.ML"]
}}
"""

LLM_RELEVANCE_SCORE_PROMPT = """You are a research relevance judge. Score each paper's relevance to the researcher's profile on a scale of 0-100.

Researcher Profile:
{profile_text}

Papers to score:
{papers_list}

Rules:
- 85-100: Directly addresses the researcher's core topics
- 60-84: Closely related, would be useful
- 35-59: Tangentially related
- 0-34: Not relevant

Return ONLY a JSON array, one object per paper, in order:
[{{"idx": 0, "score": 72}}, {{"idx": 1, "score": 45}}, ...]
No other text."""
