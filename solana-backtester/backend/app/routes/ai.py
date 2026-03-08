from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from ..services.ai_service import generate_strategy, tweak_strategy

router = APIRouter(prefix="/api/ai", tags=["ai"])


class GenerateRequest(BaseModel):
    prompt: str


class TweakRequest(BaseModel):
    code: str
    metrics: dict
    user_prompt: Optional[str] = ""


@router.post("/generate")
async def generate_strategy_endpoint(request: GenerateRequest):
    if not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")
    if len(request.prompt) > 2000:
        raise HTTPException(status_code=400, detail="Prompt too long (max 2000 chars)")

    try:
        result = await generate_strategy(request.prompt)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")


@router.post("/tweak")
async def tweak_strategy_endpoint(request: TweakRequest):
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="Strategy code cannot be empty")

    try:
        result = await tweak_strategy(
            code=request.code,
            metrics=request.metrics,
            user_prompt=request.user_prompt or "",
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI tweak failed: {str(e)}")
