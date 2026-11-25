"""
agent/config.py — all agent settings in one place, read from environment variables.

Why env vars? So you can switch model providers (Ollama -> Groq -> Anthropic-
compatible gateway) by editing .env, without touching code.

Defaults target a local Ollama server, which exposes an OpenAI-compatible API
at http://localhost:11434/v1
"""

import os
from dataclasses import dataclass


def _flag(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).strip().lower() in ("1", "true", "yes", "on")


@dataclass(frozen=True)
class AgentSettings:
    enabled:   bool
    base_url:  str
    model:     str
    api_key:   str   # Ollama ignores it, but the OpenAI-style API expects a header
    max_steps: int   # hard cap on loop iterations so a confused model can't run forever
    timeout_s: float


def get_settings() -> AgentSettings:
    """Read settings at call time (not import time) so load_dotenv() has run first."""
    return AgentSettings(
        enabled   = _flag("AGENT_ENABLED", False),
        base_url  = os.getenv("AGENT_BASE_URL", "http://localhost:11434/v1").rstrip("/"),
        model     = os.getenv("AGENT_MODEL", "llama3.1:8b"),
        api_key   = os.getenv("AGENT_API_KEY", "ollama"),
        max_steps = int(os.getenv("AGENT_MAX_STEPS", "6")),
        timeout_s = float(os.getenv("AGENT_TIMEOUT_S", "120")),
    )
