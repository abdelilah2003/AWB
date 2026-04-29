from datetime import datetime

from pydantic import BaseModel, Field


class ReportAnnotationResponse(BaseModel):
    id: str
    annotation: str
    created_by_username: str | None = None
    created_by_email: str | None = None
    created_at: datetime


class ReportStatusHistoryResponse(BaseModel):
    id: str
    old_status: str | None = None
    new_status: str
    changed_by_username: str | None = None
    changed_by_email: str | None = None
    comment: str | None = None
    changed_at: datetime


class ReportResponse(BaseModel):
    id: str
    title: str
    app_name: str
    description: str | None = None
    summary: str
    file_name: str
    file_type: str
    file_size: int | None = None
    status: str
    report_url: str
    generated_by: str
    generated_by_username: str | None = None
    generated_by_email: str | None = None
    generated_at: datetime
    validated_by: str | None = None
    validated_by_username: str | None = None
    validated_by_email: str | None = None
    validated_at: datetime | None = None
    annotations: list[ReportAnnotationResponse] = Field(default_factory=list)
    status_history: list[ReportStatusHistoryResponse] = Field(default_factory=list)


class ReportStatusUpdateRequest(BaseModel):
    status: str
    comment: str | None = None
