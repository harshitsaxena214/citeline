from __future__ import annotations

import re
import unicodedata
import uuid

# ---------------------------------------------------------------------------
# Injection screening patterns
# Applied at ingest to flag chunks, and defensively to questions.
# This is a first-layer heuristic and can be bypassed by paraphrasing.
# ---------------------------------------------------------------------------

_INJECTION_PATTERNS: list[re.Pattern] = [
    re.compile(r"ignore\s+(or\s+disregard\s+)?previous\s+instructions?", re.IGNORECASE),
    re.compile(r"disregard\s+(all\s+)?previous", re.IGNORECASE),
    re.compile(r"system\s+prompt", re.IGNORECASE),
    re.compile(r"\bassistant\s*:", re.IGNORECASE),
    re.compile(r"\bsystem\s*:", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\b", re.IGNORECASE),
    re.compile(r"\breveal\s+(your\s+)?(instructions?|system|prompt)", re.IGNORECASE),
    re.compile(r"\bprint\s+(your\s+)?(instructions?|system|prompt)", re.IGNORECASE),
]

# Output cleaning: strip markdown images, links, raw URLs
_MD_IMAGE_RE = re.compile(r"!\[[^\]]*\]\([^)]*\)")
_MD_LINK_RE = re.compile(r"\[([^\]]+)\]\([^)]*\)")
_RAW_URL_RE = re.compile(r"https?://\S+")

# Strip nonce attributes and source tags from document text so a PDF cannot
# break out of its own source wrapper.
_SOURCE_TAG_RE = re.compile(r"</?source[^>]*>", re.IGNORECASE)
_NONCE_RE = re.compile(r'\bnonce\s*=\s*"[^"]*"', re.IGNORECASE)

# Control and invisible characters: everything in the Cc category plus
# zero-width and other invisible Unicode codepoints.
_INVISIBLE_RE = re.compile(
    r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f"          # C0 controls (keep \t \n \r)
    r"\u00ad"                                      # soft hyphen
    r"\u200b-\u200f"                               # zero-width
    r"\u202a-\u202e"                               # bidi override
    r"\u2060-\u2064"                               # word joiner etc.
    r"\ufeff"                                      # BOM
    r"\ufe00-\ufe0f"                               # variation selectors
    r"]"
)


def sanitize_text(text: str, *, max_chars: int | None = None) -> str:
    """
    Normalize and clean untrusted text (PDF content or user question).
    - NFKC normalization
    - Strip invisible/control characters
    - Remove source tag fragments so docs cannot break their own tags
    - Collapse whitespace
    - Truncate to max_chars if given
    """
    text = unicodedata.normalize("NFKC", text)
    text = _INVISIBLE_RE.sub("", text)
    text = _SOURCE_TAG_RE.sub("", text)
    text = _NONCE_RE.sub("", text)
    text = re.sub(r"[ \t]+", " ", text)  # collapse spaces/tabs
    text = re.sub(r"\n{3,}", "\n\n", text)  # collapse excessive newlines
    text = text.strip()
    if max_chars is not None:
        text = text[:max_chars]
    return text


def is_injection(text: str) -> bool:
    """Return True if the text matches any injection screening pattern."""
    return any(p.search(text) for p in _INJECTION_PATTERNS)


def clean_output(text: str) -> str:
    """
    Strip markdown images, markdown links (keep label text), and raw URLs
    from model output to prevent data exfiltration via URLs.
    """
    text = _MD_IMAGE_RE.sub("", text)
    text = _MD_LINK_RE.sub(r"\1", text)  # keep the visible label
    text = _RAW_URL_RE.sub("[URL removed]", text)
    return text.strip()


def generate_nonce() -> str:
    """A short random nonce used to wrap source chunks."""
    return uuid.uuid4().hex[:16]


def wrap_sources(chunks: list[dict], nonce: str) -> str:
    """
    Wrap each chunk's text in a source tag with a unique numeric id and nonce.
    chunk dicts must have keys: id (chunk id used as source_id), document (text).
    Returns the full sources block to embed in the user prompt.
    """
    parts = []
    for i, chunk in enumerate(chunks, start=1):
        text = chunk["document"]
        parts.append(f'<source id="{i}" nonce="{nonce}">\n{text}\n</source>')
    return "\n\n".join(parts)


def validate_uuid(value: str) -> bool:
    """Return True if value is a valid UUID string."""
    try:
        uuid.UUID(value)
        return True
    except ValueError:
        return False
