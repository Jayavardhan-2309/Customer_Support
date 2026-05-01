from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ChatHistoryMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")

    role: Literal["user", "assistant", "ai", "staff"]
    content: str = Field(min_length=1, max_length=8000)

    @field_validator("content", mode="before")
    @classmethod
    def normalize_content(cls, value):
        if value is None:
            raise ValueError("content is required")
        return str(value).strip()


class AIRequestInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    query: str = Field(min_length=1, max_length=4000)
    history: list[ChatHistoryMessage] = Field(default_factory=list)
    org_id: int | None = Field(default=None, ge=1)
    escalation_count: int = Field(default=0, ge=0)

    @field_validator("query", mode="before")
    @classmethod
    def normalize_query(cls, value):
        if value is None:
            raise ValueError("query is required")
        return str(value).strip()

    def history_dicts(self) -> list[dict[str, str]]:
        return [message.model_dump() for message in self.history]


class ChatLLMResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    intent: str = Field(min_length=1, max_length=80)
    reply: str = Field(min_length=1, max_length=4000)
    confidence: float = Field(ge=0.0, le=1.0)

    @field_validator("intent", "reply", mode="before")
    @classmethod
    def normalize_text(cls, value):
        if value is None:
            raise ValueError("field is required")
        return str(value).strip()


class TicketStructure(BaseModel):
    model_config = ConfigDict(extra="forbid")

    category: Literal["authentication", "billing", "technical", "general"]
    priority: Literal["low", "normal", "high"]
    description: str = Field(min_length=1, max_length=1000)
    context_summary: str = Field(default="", max_length=4000)

    @field_validator("description", "context_summary", mode="before")
    @classmethod
    def normalize_optional_text(cls, value):
        if value is None:
            return ""
        return str(value).strip()
