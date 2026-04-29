import json
import re

from app.core.config import settings


def _strip_markdown_fences(text: str) -> str:
    cleaned = text.strip()
    cleaned = re.sub(r"^```json\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"^```\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


def clean_text_response(text: str) -> str:
    return _strip_markdown_fences(text).strip()


def extract_json_object(text: str) -> dict:
    if not text or not text.strip():
        raise ValueError("Reponse vide retournee par le modele.")

    cleaned = _strip_markdown_fences(text)
    if cleaned.startswith("{") and cleaned.endswith("}"):
        return json.loads(cleaned)

    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not match:
        raise ValueError(f"Aucun JSON detecte dans la reponse du modele : {cleaned}")

    return json.loads(match.group(0))


def call_mistral(prompt: str) -> str:
    if not settings.MISTRAL_API_KEY:
        raise RuntimeError("La variable d environnement MISTRAL_API_KEY est obligatoire.")

    try:
        from mistralai.client import Mistral
    except ImportError as exc:
        raise RuntimeError("La dependance mistralai est manquante dans le backend.") from exc

    client = Mistral(api_key=settings.MISTRAL_API_KEY)
    response = client.chat.complete(
        model=settings.MISTRAL_MODEL,
        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],
    )

    content = ""
    if getattr(response, "choices", None):
        message = getattr(response.choices[0], "message", None)
        content = getattr(message, "content", "") if message else ""

    if isinstance(content, list):
        text_chunks = []
        for chunk in content:
            chunk_text = getattr(chunk, "text", None)
            if chunk_text:
                text_chunks.append(chunk_text)
            elif isinstance(chunk, dict) and chunk.get("type") == "text":
                text_chunks.append(str(chunk.get("text", "")))
        content = "\n".join(part for part in text_chunks if part).strip()

    if not isinstance(content, str) or not content.strip():
        raise ValueError("Mistral n a retourne aucun contenu exploitable.")

    return content.strip()


def call_gemini(prompt: str) -> str:
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("La variable d environnement GEMINI_API_KEY est obligatoire.")

    try:
        from google import genai
    except ImportError as exc:
        raise RuntimeError("La dependance google-genai est manquante dans le backend.") from exc

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    response = client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=prompt,
    )
    content = getattr(response, "text", "") or ""
    if not content.strip():
        raise ValueError("Gemini n a retourne aucun contenu.")
    return content.strip()
