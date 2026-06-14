from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.mdt import MDTStatus


class MDTCaseCreate(BaseModel):
    patient_id: int
    history_summary: str


class MDTCaseOut(BaseModel):
    id: int
    patient_id: int
    submitted_by_user_id: int
    history_summary: str
    discussion_status: MDTStatus
    final_recommendation: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    submitted_by_name: Optional[str] = None
    patient_name: Optional[str] = None
    comment_count: Optional[int] = None

    class Config:
        from_attributes = True


class MDTCaseDetail(MDTCaseOut):
    comments: List["MDTCommentOut"] = []


class MDTCaseConclude(BaseModel):
    final_recommendation: str


class MDTCommentCreate(BaseModel):
    comment_text: str


class MDTCommentOut(BaseModel):
    id: int
    case_id: int
    user_id: int
    comment_text: str
    created_at: datetime
    author_name: Optional[str] = None
    author_role: Optional[str] = None

    class Config:
        from_attributes = True


MDTCaseDetail.model_rebuild()
