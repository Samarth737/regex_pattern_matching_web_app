# api/llm_utils.py
import os
import json
from typing import List, Dict, Any
from openai import OpenAI

import logging
logger = logging.getLogger("api")

_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def _safe_json_parse(text: str, fallback: Dict[str, Any]) -> Dict[str, Any]:
    try:
        return json.loads(text)
    except Exception:
        return fallback

def detect_target_columns(prompt: str, columns: List[str]) -> Dict[str, Any]:
    """
    LLM Call A: Given NL prompt + list of column names, pick target columns.
    Returns: { target_columns: [..], confidence: float, rationale: str }
    """
    sys = (
        "You map a user's natural-language instruction to EXACT column names "
        "from a provided list. Respond with STRICT JSON only, no prose."
    )
    user = json.dumps({
        "task": "select_target_columns",
        "prompt": prompt,
        "columns": columns
    })
    logger.info(f"LLM Call A input: {user}")
    resp = _client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0,
        messages=[
            {"role": "system", "content": sys},
            {"role": "user", "content": user},
        ]
    )
    logger.info(f"LLM response for detect_target_columns: {resp}")
    text = resp.choices[0].message.content.strip()
    return _safe_json_parse(text, {
        "target_columns": [],
        "confidence": 0.0,
        "rationale": "fallback"
    })

def infer_regex_for_column(prompt: str, column: str, positive_examples: List[str]) -> Dict[str, Any]:
    """
    LLM Call B: Given NL prompt + a specific column name + sample values,
    infer {pattern, flags, replacement}. Respond STRICT JSON only.
    """
    sys = (
        "You generate safe, valid Python regular expressions (re module). "
        "Avoid catastrophic backtracking. Respond with STRICT JSON only."
    )
    user = json.dumps({
        "task": "infer_regex",
        "prompt": prompt,
        "column": column,
        "positive_examples": positive_examples[:50],  # cap
        "requirements": {
            "language_flavor": "python",
            "output_schema": ["pattern", "flags", "replacement", "rationale"]
        }
    })
    resp = _client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0,
        messages=[
            {"role": "system", "content": sys},
            {"role": "user", "content": user},
        ]
    )
    text = resp.choices[0].message.content.strip()
    return _safe_json_parse(text, {
        "pattern": "",
        "flags": "",
        "replacement": "",
        "rationale": "fallback"
    })
