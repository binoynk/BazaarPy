"""
agent/llm.py — the ONLY file that knows how to talk to a model.

We call the OpenAI-compatible "chat completions" endpoint with httpx
(already in requirements.txt, so no new dependency).

The agent loop receives `chat` as a plain function, so tests can swap in a
fake model and you can swap providers without touching the loop.

Request shape (simplified):
    POST {base_url}/chat/completions
    {"model": "...", "messages": [...], "tools": [...]}

Response shape (simplified):
    {"choices": [{"message": {"role": "assistant",
                              "content": "text or null",
                              "tool_calls": [{"id": "...", "function":
                                   {"name": "...", "arguments": "{json string}"}}]}}]}

If `tool_calls` is present, the model is asking US to run a function.
"""

from typing import Any

import httpx

from agent.config import get_settings


class LLMError(RuntimeError):
    """Raised when the model server is unreachable or returns an error."""


async def chat(messages: list[dict], tools: list[dict] | None = None) -> dict[str, Any]:
    """Send the conversation to the model; return the assistant `message` dict."""
    s = get_settings()
    payload: dict[str, Any] = {
        "model":       s.model,
        "messages":    messages,
        "temperature": 0,   # low randomness = more reliable tool calls from small models
        "stream":      False,
    }
    if tools:
        payload["tools"] = tools

    try:
        async with httpx.AsyncClient(timeout=s.timeout_s) as client:
            resp = await client.post(
                f"{s.base_url}/chat/completions",
                json=payload,
                headers={"Authorization": f"Bearer {s.api_key}"},
            )
            resp.raise_for_status()
    except httpx.ConnectError as exc:
        raise LLMError(
            f"Cannot reach the model server at {s.base_url}. "
            "Is Ollama running? Try: `ollama serve`"
        ) from exc
    except httpx.HTTPError as exc:
        raise LLMError(f"Model server error: {exc}") from exc

    return resp.json()["choices"][0]["message"]
