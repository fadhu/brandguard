"""
Gemini API integration for brand compliance analysis.

Uses direct httpx calls to the Google Gemini API
to analyze uploaded assets against stored brand guidelines.
"""

import httpx
import json
import os
import base64
import mimetypes
from pathlib import Path

API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"


def get_api_key():
    """Get Gemini API key from environment."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY environment variable is required. "
            "Get your key at https://aistudio.google.com/app/apikey"
        )
    return api_key


def build_guidelines_context(guidelines: list[dict]) -> str:
    """Format brand guidelines into a structured prompt context."""
    if not guidelines:
        return "No brand guidelines have been configured yet. Analyze based on general brand best practices."

    sections = []
    for g in guidelines:
        rules = json.loads(g["rules"]) if isinstance(g["rules"], str) else g["rules"]
        rules_text = "\n".join(f"  - {r}" for r in rules) if rules else "  (no specific rules defined)"
        sections.append(
            f"### {g['category'].upper()}: {g['title']}\n"
            f"{g['description']}\n"
            f"Rules:\n{rules_text}"
        )

    return "## BRAND GUIDELINES\n\n" + "\n\n".join(sections)


COMPLIANCE_SYSTEM_PROMPT = """You are Brandguard, an expert brand compliance analyst. Your job is to review
creative assets against a company's brand guidelines and identify any violations.

You will be given:
1. Brand guidelines with specific rules per category (color, typography, logo, imagery, voice, layout)
2. An asset to review (image or document)

IMPORTANT: Respond with ONLY valid JSON, no markdown formatting, no code blocks, pure JSON only.

Use this exact structure:
{
  "overall_score": 0-100,
  "category_scores": {
    "color": 0-100,
    "typography": 0-100,
    "logo": 0-100,
    "imagery": 0-100,
    "voice": 0-100,
    "layout": 0-100
  },
  "summary": "brief 2-3 sentence summary",
  "issues": [
    {
      "title": "short title",
      "description": "what's wrong",
      "category": "color|typography|logo|imagery|voice|layout",
      "severity": "high|medium|low",
      "suggested_fix": "how to fix it"
    }
  ]
}

- Be specific and actionable
- Reference exact guideline rules when flagging violations
- Score generously for categories not applicable (e.g., voice for pure image)"""


async def analyze_asset(
    file_path: str,
    file_type: str,
    guidelines: list[dict],
) -> dict:
    """
    Send an asset to Gemini for brand compliance analysis.

    Args:
        file_path: Path to the uploaded file
        file_type: MIME type of the file
        guidelines: List of guideline dicts from the database

    Returns:
        Parsed compliance analysis dict
    """
    api_key = get_api_key()
    guidelines_context = build_guidelines_context(guidelines)

    # Build the message parts array for Gemini (correct format)
    parts = []

    # Add the file as an image if it's an image type
    if file_type.startswith("image/"):
        with open(file_path, "rb") as f:
            file_data = base64.standard_b64encode(f.read()).decode("utf-8")
        parts.append({
            "inlineData": {
                "mimeType": file_type,
                "data": file_data,
            }
        })
    elif file_type == "application/pdf":
        with open(file_path, "rb") as f:
            file_data = base64.standard_b64encode(f.read()).decode("utf-8")
        parts.append({
            "inlineData": {
                "mimeType": "application/pdf",
                "data": file_data,
            }
        })
    else:
        # For other file types, read as text if possible
        try:
            with open(file_path, "r") as f:
                text_content = f.read()
            parts.append({
                "text": f"[File content of {Path(file_path).name}]:\n{text_content[:10000]}"
            })
        except UnicodeDecodeError:
            parts.append({
                "text": f"[Binary file: {Path(file_path).name}, type: {file_type}. Unable to read content directly. Please analyze based on filename and type.]"
            })

    # Add the analysis request with guidelines
    parts.append({
        "text": (
            f"{guidelines_context}\n\n"
            "---\n\n"
            "Please analyze the above asset for brand compliance against the provided guidelines. "
            "Return ONLY the JSON response, no other text."
        )
    })

    # Prepare Gemini API request
    headers = {
        "Content-Type": "application/json",
    }

    body = {
        "systemInstruction": {
            "parts": [{
                "text": COMPLIANCE_SYSTEM_PROMPT
            }]
        },
        "contents": [{
            "parts": parts
        }],
        "generationConfig": {
            "maxOutputTokens": 4000,
            "temperature": 0.7,
        }
    }

    # Call Gemini API
    url = f"{API_URL}?key={api_key}"
    
    async with httpx.AsyncClient(timeout=180.0) as client:
        response = await client.post(url, headers=headers, json=body)

    if response.status_code != 200:
        raise RuntimeError(f"Gemini API error {response.status_code}: {response.text}")

    data = response.json()

    # Parse the response - Gemini returns in a different format
    try:
        response_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError, TypeError):
        raise RuntimeError(f"Unexpected Gemini API response format: {data}")

    # Clean up markdown code fences (```json...```)
    if response_text.startswith("```"):
        # Remove first line (the opening ``` with language specifier)
        lines = response_text.split("\n")
        response_text = "\n".join(lines[1:])
    if response_text.endswith("```"):
        # Remove last line (the closing ```)
        lines = response_text.split("\n")
        response_text = "\n".join(lines[:-1])
    response_text = response_text.strip()

    try:
        result = json.loads(response_text)
    except json.JSONDecodeError as e:
        # Log the error for debugging
        print(f"JSON Parse Error: {e}")
        print(f"Response text: {repr(response_text)}")
        # Fallback if Gemini doesn't return clean JSON
        result = {
            "overall_score": 50,
            "category_scores": {
                "color": 50, "typography": 50, "logo": 50,
                "imagery": 50, "voice": 50, "layout": 50,
            },
            "summary": "Analysis completed but response parsing failed. Please try again.",
            "issues": [],
        }

    return result