"""
agent/loop.py — THE AGENT LOOP. This is the heart of every agent.

    1. Send the conversation + tool list to the model.
    2. If the model answers with plain text  -> we're done.
    3. If the model asks for tool calls      -> run them, append the results
                                                to the conversation, go to 1.
    4. Stop after max_steps no matter what (guardrail).

The "memory" of the agent is simply the `messages` list that grows each turn.
"""

from typing import Any, Awaitable, Callable

from agent import llm
from agent.config import get_settings
from agent.tools import execute_tool, tool_schemas

SYSTEM_PROMPT = """You are the Bazaar stock-screener assistant.
- For any question about a specific stock, call the screen_stock tool. Never guess numbers.
- Explain results in plain English for a beginner: what each signal means and why it matters.
- Only use numbers returned by tools. If a tool returns an error, say so and suggest a fix.
- You provide information, not financial advice. Do not tell the user to buy or sell."""

ChatFn = Callable[[list[dict], list[dict] | None], Awaitable[dict[str, Any]]]


async def run_agent(question: str, chat: ChatFn = llm.chat) -> dict[str, Any]:
    """
    Run the loop for one user question.

    `chat` is injectable: production uses llm.chat (real model), tests pass a
    scripted fake. Returns the final answer plus a `trace` of every tool call —
    invaluable for learning how the agent actually behaved.
    """
    max_steps = get_settings().max_steps
    tools = tool_schemas()

    messages: list[dict] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user",   "content": question},
    ]
    trace: list[dict] = []

    for step in range(1, max_steps + 1):
        assistant = await chat(messages, tools)
        messages.append(assistant)               # keep the model's turn in the history

        tool_calls = assistant.get("tool_calls") or []
        if not tool_calls:                       # plain text answer -> finished
            return {"answer": assistant.get("content") or "", "steps": step, "trace": trace}

        for call in tool_calls:
            fn = call["function"]
            result = await execute_tool(fn["name"], fn.get("arguments", "{}"))
            trace.append({"step": step, "tool": fn["name"],
                          "arguments": fn.get("arguments"), "result": result})
            messages.append({
                "role":         "tool",
                "tool_call_id": call.get("id", ""),
                "content":      result,
            })

    return {
        "answer": "I couldn't finish within the step limit. Try a more specific question.",
        "steps":  max_steps,
        "trace":  trace,
    }
