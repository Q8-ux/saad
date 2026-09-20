from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


class AnalysisRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    query: str = Field(min_length=1, max_length=1500)
    urls: list[str] = Field(default_factory=list, max_length=20)
    discover: bool = False
    provider: Literal["auto", "web", "browser", "youtube", "x", "reddit"] = "auto"
    language: Literal["ar", "en"] = "ar"
    use_llm: bool = False


class Finding(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str = Field(max_length=4000)
    source_ids: list[str] = Field(min_length=1, max_length=20)


class ModelAnalysis(BaseModel):
    model_config = ConfigDict(extra="forbid")
    findings: list[Finding] = Field(max_length=20)
    gaps: list[str] = Field(max_length=20)
    counterarguments: list[str] = Field(max_length=20)
    recommendations: list[str] = Field(max_length=20)
