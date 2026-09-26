import json
import logging
from decimal import Decimal
from typing import Dict, Any, Optional, List
from app.config import settings

logger = logging.getLogger(__name__)

# Initialize GenAI Client
_client = None

def get_genai_client():
    global _client
    if _client is None and settings.GEMINI_API_KEY:
        try:
            from google import genai
            _client = genai.Client(api_key=settings.GEMINI_API_KEY)
            logger.info("Google GenAI client initialized with model %s", settings.GEMINI_MODEL)
        except Exception as e:
            logger.error("Failed to initialize Google GenAI client: %s", e)
    return _client

def generate_content_with_fallback(contents, preferred_model: str = None):
    client = get_genai_client()
    if not client:
        return None

    model_cascade = [
        preferred_model or settings.GEMINI_MODEL,
        "gemini-3.5-flash",
        "gemini-flash-latest",
        "gemini-2.5-flash-lite"
    ]

    for model_name in model_cascade:
        if not model_name:
            continue
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=contents
            )
            return response, model_name
        except Exception as e:
            err_str = str(e)
            if "503" in err_str or "demand" in err_str.lower() or "404" in err_str:
                logger.warning("Model %s unavailable (%s), trying next candidate...", model_name, err_str[:80])
                continue
            logger.warning("Gemini generation error on %s: %s", model_name, err_str[:80])
            break
    return None, None

def extract_receipt_with_gemini(filename: str, file_bytes: bytes, mime_type: str = "image/jpeg") -> Optional[Dict[str, Any]]:
    """
    Uses Gemini multimodal vision to extract structured receipt line items.
    """
    client = get_genai_client()
    if not client or not file_bytes:
        return None

    try:
        from google.genai import types

        prompt = """
        You are an intelligent corporate finance receipt extractor.
        Extract the following fields from this receipt document into a valid JSON object:
        - merchant: Vendor or merchant name (string)
        - amount: Total transaction amount as a numeric float (e.g. 12390.0)
        - expense_date: Date in YYYY-MM-DD format (string)
        - invoice_number: Invoice / Bill / Reference number (string or null)
        - tax: GST, VAT, or Tax amount as a numeric float or null
        - category: One of ['Travel', 'Accommodation', 'Food', 'Office Supplies', 'Cloud Infrastructure', 'Other']
        - description: Concise 1-sentence description of the purchased goods/services

        Return ONLY a single valid JSON object, without markdown formatting or code blocks.
        """

        fn_lower = filename.lower()
        if fn_lower.endswith(".pdf"):
            part_mime = "application/pdf"
        elif fn_lower.endswith(".png"):
            part_mime = "image/png"
        elif fn_lower.endswith(".webp"):
            part_mime = "image/webp"
        else:
            part_mime = "image/jpeg"

        content_part = types.Part.from_bytes(data=file_bytes, mime_type=part_mime)

        response, used_model = generate_content_with_fallback([prompt, content_part])
        if not response:
            return None

        raw_text = response.text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        elif raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]

        parsed = json.loads(raw_text.strip())
        parsed["_model_used"] = used_model
        logger.info("Gemini receipt extraction succeeded on model %s for %s", used_model, filename)
        return parsed
    except Exception as e:
        logger.warning("Gemini receipt extraction fallback due to: %s", e)
        return None

def analyze_expense_with_gemini(
    expense_data: Dict[str, Any],
    policy_result: Dict[str, Any],
    duplicate_result: Dict[str, Any],
    anomaly_result: Dict[str, Any],
    budget_info: Optional[Dict[str, Any]] = None
) -> Optional[Dict[str, Any]]:
    """
    Uses Gemini to synthesize backend-calculated facts into an explainable review with recommendations.
    Gemini does NOT invent numbers; it reasons over FastAPI-calculated facts.
    """
    client = get_genai_client()
    if not client:
        return None

    try:
        facts_payload = {
            "expense": {
                "merchant": expense_data.get("merchant"),
                "amount": float(expense_data.get("amount", 0)),
                "category": expense_data.get("category"),
                "date": expense_data.get("expense_date"),
                "description": expense_data.get("description"),
                "has_receipt": expense_data.get("has_receipt")
            },
            "backend_calculated_facts": {
                "policy_status": policy_result.get("policy_status"),
                "policy_violations": policy_result.get("violations", []),
                "policy_limit": float(policy_result.get("policy_limit")) if policy_result.get("policy_limit") else None,
                "exceeded_by": float(policy_result.get("exceeded_by", 0)),
                "duplicate_detected": duplicate_result.get("duplicate_detected", False),
                "duplicate_warning": duplicate_result.get("warning"),
                "is_anomaly": anomaly_result.get("anomaly", False),
                "historical_employee_average": float(anomaly_result.get("historical_average", 0)),
                "anomaly_multiplier": float(anomaly_result.get("multiplier", 1.0)),
                "anomaly_signals": anomaly_result.get("signals", []),
                "department_budget_utilization_pct": float(budget_info.get("utilization_pct", 0)) if budget_info else None,
                "projected_department_utilization_pct": float(budget_info.get("projected_utilization_pct", 0)) if budget_info else None
            }
        }

        prompt = f"""
        You are an AI Financial Controller evaluating an employee expense.
        All financial arithmetic and policy checks have ALREADY been computed by the backend.
        DO NOT invent or alter any numbers.

        Based on the provided facts:
        {json.dumps(facts_payload, default=str, indent=2)}

        Generate a JSON object with:
        - "ai_summary": A professional, executive 1-2 sentence summary explaining the findings.
        - "reasons": An array of concise bullet points (strings), starting with '✓' for positive/compliant signals or '⚠' for risks/violations.
        - "recommendation": One of:
          * "auto_approve_eligible" (if fully compliant, low amount, no risks)
          * "manager_scrutiny_required" (if minor policy alert or anomaly)
          * "finance_review" (if policy violation or high transaction value >= ₹25,000)
          * "escalate" (if severe anomaly or critical budget overspend)
        - "risk_level": "low", "medium", or "high"

        Return ONLY the raw JSON object.
        """

        response, used_model = generate_content_with_fallback(prompt)
        if not response:
            return None

        raw = response.text.strip()
        if raw.startswith("```json"):
            raw = raw[7:]
        elif raw.startswith("```"):
            raw = raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3]

        parsed = json.loads(raw.strip())
        parsed["_model_used"] = used_model
        logger.info("Gemini expense analysis completed on model %s for %s", used_model, expense_data.get("merchant"))
        return parsed
    except Exception as e:
        logger.warning("Gemini expense analysis fallback due to: %s", e)
        return None

def answer_copilot_with_gemini(user_query: str, retrieved_data: Dict[str, Any], context_label: str) -> Optional[str]:
    """
    Uses Gemini to compose a natural-language answer strictly grounded in the database data points.
    """
    client = get_genai_client()
    if not client:
        return None

    try:
        serialized_facts = json.dumps(retrieved_data, default=str, indent=2)

        prompt = f"""
        You are an enterprise AI Finance Copilot.
        The user asked: "{user_query}"

        The backend queried the live Supabase PostgreSQL database and returned these actual facts ({context_label}):
        {serialized_facts}

        Rules:
        1. Base your answer strictly on the provided database facts.
        2. Format numbers clearly in Indian Rupees (e.g., ₹12,390 or ₹18.4L).
        3. Be concise, executive, and actionable.
        4. Never make up numbers not present in the data.
        """

        response, used_model = generate_content_with_fallback(prompt)
        if not response:
            return None
        return response.text.strip()
    except Exception as e:
        logger.warning("Gemini copilot answer fallback due to: %s", e)
        return None
