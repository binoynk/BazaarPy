"""
Tests for the agent loop using a FAKE model — no Ollama, no network.

A fake `chat` function replays a scripted conversation, so we can prove the
loop's behaviour: tool call -> tool result -> final answer, plus guardrails.
"""
import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))  # make `agent` importable

from agent import tools
from agent.loop import run_agent


def scripted_chat(script):
    """Return a chat() that yields the scripted assistant messages in order."""
    it = iter(script)
    seen = []

    async def chat(messages, tool_list):
        seen.append([m.get("role") for m in messages])
        return next(it)

    chat.seen = seen
    return chat


def tool_call(name, args, call_id="c1"):
    return {"role": "assistant", "content": None,
            "tool_calls": [{"id": call_id, "function": {"name": name, "arguments": json.dumps(args)}}]}


def test_tool_call_then_final_answer(monkeypatch):
    async def fake_screen(symbol, days=10):
        return {"symbol": symbol, "rsi": 25.0, "signals": ["RSI Oversold"]}
    monkeypatch.setitem(tools.REGISTRY, "screen_stock", (tools.SCREEN_STOCK_SCHEMA, fake_screen))

    chat = scripted_chat([
        tool_call("screen_stock", {"symbol": "AAPL"}),
        {"role": "assistant", "content": "AAPL looks oversold (RSI 25)."},
    ])
    out = asyncio.run(run_agent("Is AAPL oversold?", chat=chat))

    assert out["answer"] == "AAPL looks oversold (RSI 25)."
    assert out["steps"] == 2
    assert out["trace"][0]["tool"] == "screen_stock"
    # 2nd model call must have seen the tool result in the history
    assert chat.seen[1] == ["system", "user", "assistant", "tool"]


def test_unknown_tool_is_reported_not_crashed():
    chat = scripted_chat([
        tool_call("delete_everything", {}),
        {"role": "assistant", "content": "Sorry, I can't do that."},
    ])
    out = asyncio.run(run_agent("do bad things", chat=chat))
    assert "Unknown tool" in out["trace"][0]["result"]
    assert out["answer"] == "Sorry, I can't do that."


def test_bad_arguments_are_reported():
    result = asyncio.run(tools.execute_tool("screen_stock", "not json"))
    assert "not valid JSON" in result


def test_max_steps_guardrail(monkeypatch):
    monkeypatch.setenv("AGENT_MAX_STEPS", "3")
    async def fake_screen(symbol, days=10):
        return {"symbol": symbol}
    monkeypatch.setitem(tools.REGISTRY, "screen_stock", (tools.SCREEN_STOCK_SCHEMA, fake_screen))

    chat = scripted_chat([tool_call("screen_stock", {"symbol": "X"}, f"c{i}") for i in range(10)])
    out = asyncio.run(run_agent("loop forever", chat=chat))
    assert out["steps"] == 3
    assert "step limit" in out["answer"]
