from typing import Literal

from pydantic import BaseModel


class PredictionRequest(BaseModel):
    """Request model for prediction endpoint."""

    text: str
    model_type: Literal["lr", "distilbert", "mental_roberta"] = "lr"


class PredictionResponse(BaseModel):
    """Response model for prediction endpoint."""

    label: int
    probability: float
