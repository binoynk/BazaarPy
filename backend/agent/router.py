"""
agent/router.py — the HTTP door into the agent.  POST /api/agent/ask

Thin on purpose (same convention as the other routers): validate input,
call the loop, translate errors into HTTP responses.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from agent.llm import LLMError
from agent.loop import run_agent

router = APIRouter()


class AskRequest(BaseModel):
    question: str = Field(min_length=3, max_length=500,
                          examples=["Why is AAPL flagged Death Cross?"])


class AskResponse(BaseModel):
    answer: str
    steps:  int
    trace:  list[dict]


@router.post("/ask", response_model=AskResponse)
async def ask(body: AskRequest):
    """Ask the stock assistant a question in plain English."""
    try:
        return await run_agent(body.question)
    except LLMError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
