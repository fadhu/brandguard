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
from typing import Optional

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


EXTRACTION_SYSTEM_PROMPT = """You are a brand guidelines expert. Extract structured brand rules from the provided brand kit document.

RESPOND WITH ONLY VALID JSON - no markdown, no code blocks, pure JSON only.

Required JSON structure:
{
  "guidelines": [
    {
      "category": "color|typography|logo|imagery|voice|layout",
      "title": "Short descriptive title",
      "description": "1-2 sentence description of this guideline area",
      "rules": ["Specific rule 1", "Specific rule 2"]
    }
  ]
}

Rules for extraction:
- Only output JSON, nothing else
- Use exactly these categories: color, typography, logo, imagery, voice, layout
- Create one guideline object per distinct topic area (e.g. separate "Primary Colors" from "Accent Colors")
- Extract specific, actionable rules: include hex codes, font names, sizes, spacing values where present
- If the document mentions do's and don'ts, convert them to rules
- If a category is not covered in the document, omit it entirely
- Be thorough: extract every rule you can find
- Rules should be self-contained and understandable without the source document"""


COMPLIANCE_SYSTEM_PROMPT = """You are a brand compliance analyst. Analyze the asset against brand guidelines.

RESPOND WITH ONLY VALID JSON - no markdown, no code blocks, pure JSON only.

Required JSON structure:
{
  "overall_score": 0-100 number,
  "category_scores": {"color": 0-100, "typography": 0-100, "logo": 0-100, "imagery": 0-100, "voice": 0-100, "layout": 0-100},
  "summary": "2-3 sentence summary",
  "issues": [{"title": "text", "description": "text", "category": "text", "severity": "high|medium|low", "suggested_fix": "text"}]
}

Rules:
- Only output JSON, nothing else
- Make scores 0-100 integers
- If category not applicable, score 70
- Reference exact violations
- Be specific and actionable"""


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
            "maxOutputTokens": 8000,
            "temperature": 0.3,
        }
    }

    # Call Gemini API
    url = f"{API_URL}?key={api_key}"
    
    async with httpx.AsyncClient(timeout=180.0) as client:
        response = await client.post(url, headers=headers, json=body)

    if response.status_code != 200:
        raise RuntimeError(f"Gemini API error {response.status_code}: {response.text}")

    data = response.json()

    # Parse and clean the response
    response_text = _extract_gemini_text(data)
    result = _clean_gemini_json(response_text)

    if result is None:
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


async def extract_guidelines_from_brandkit(
    file_path: str,
    file_type: str,
) -> dict:
    """
    Send a brand kit document to Gemini to extract structured brand guidelines.

    Returns:
        Dict with "guidelines" key containing list of extracted guideline objects.
    """
    api_key = get_api_key()
    parts = []

    # Encode the file (reuse same pattern as analyze_asset)
    if file_type.startswith("image/") or file_type == "application/pdf":
        with open(file_path, "rb") as f:
            file_data = base64.standard_b64encode(f.read()).decode("utf-8")
        parts.append({
            "inlineData": {
                "mimeType": file_type,
                "data": file_data,
            }
        })
    else:
        try:
            with open(file_path, "r") as f:
                text_content = f.read()
            parts.append({"text": f"[Document content]:\n{text_content[:20000]}"})
        except UnicodeDecodeError:
            raise RuntimeError("Cannot read the uploaded file as text or image")

    parts.append({
        "text": (
            "Please analyze this brand kit / brand guidelines document thoroughly. "
            "Extract ALL brand rules, specifications, and guidelines into structured format. "
            "Return ONLY the JSON response."
        )
    })

    body = {
        "systemInstruction": {"parts": [{"text": EXTRACTION_SYSTEM_PROMPT}]},
        "contents": [{"parts": parts}],
        "generationConfig": {
            "maxOutputTokens": 8000,
            "temperature": 0.2,
        }
    }

    url = f"{API_URL}?key={api_key}"
    async with httpx.AsyncClient(timeout=180.0) as client:
        response = await client.post(url, headers={"Content-Type": "application/json"}, json=body)

    if response.status_code != 200:
        raise RuntimeError(f"Gemini API error {response.status_code}: {response.text}")

    data = response.json()
    response_text = _extract_gemini_text(data)
    result = _clean_gemini_json(response_text)

    if result is None:
        raise RuntimeError("Failed to parse extraction response from Gemini")

    # Validate categories
    valid_categories = {"color", "typography", "logo", "imagery", "voice", "layout"}
    for g in result.get("guidelines", []):
        if g.get("category") not in valid_categories:
            g["category"] = "layout"

    return result


def _extract_gemini_text(data: dict) -> str:
    """Extract the text response from a Gemini API response."""
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError, TypeError):
        raise RuntimeError(f"Unexpected Gemini API response format: {data}")


def _clean_gemini_json(response_text: str) -> Optional[dict]:
    """Clean and parse JSON from Gemini responses. Returns None on failure."""
    # Clean up markdown code fences (```json...```)
    if response_text.startswith("```"):
        lines = response_text.split("\n")
        response_text = "\n".join(lines[1:])
    if response_text.endswith("```"):
        lines = response_text.split("\n")
        response_text = "\n".join(lines[:-1])
    response_text = response_text.strip()

    # Fix escaped single quotes
    response_text = response_text.replace("\\'", "'")

    # If response appears truncated, try to complete it
    if not response_text.endswith("}"):
        open_braces = response_text.count("{") - response_text.count("}")
        open_brackets = response_text.count("[") - response_text.count("]")
        if response_text.rstrip().endswith(","):
            response_text = response_text.rstrip()[:-1]
        response_text += "]" * open_brackets + "}" * open_braces

    try:
        return json.loads(response_text)
    except json.JSONDecodeError as e:
        print(f"JSON Parse Error: {e}")
        print(f"Response text: {repr(response_text[:500])}")
        return None