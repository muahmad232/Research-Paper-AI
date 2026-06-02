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
