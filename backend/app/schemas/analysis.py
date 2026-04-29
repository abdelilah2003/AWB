from typing import Dict, Union, List, Optional
from pydantic import BaseModel

AnswerValue = Union[str, bool, List[str], None]

class AnalysisCreateRequest(BaseModel):
    app_name: str
    app_description: str
    questionnaire_code: str
    answers: Dict[str, AnswerValue]
    dev_name: Optional[str] = None

class AnalysisCreateResponse(BaseModel):
    analysis_id: int
    status: str
    report_id: str
    report_url: str
    dfd_image_url: Optional[str] = None
    application_description: Optional[str] = None
    threat_count: Optional[int] = None
