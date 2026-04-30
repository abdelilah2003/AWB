from typing import List, Optional, Literal
from pydantic import BaseModel

QuestionType = Literal["boolean", "select", "text", "textarea", "multiselect"]


class QuestionOptionPayload(BaseModel):
    label: str
    value: str
    display_order: int


class QuestionVisibilityRulePayload(BaseModel):
    question_code: str
    depends_on_question_code: str
    operator: Literal["equals", "not_equals"]
    expected_value: str


class QuestionPayload(BaseModel):
    code: str
    label: str
    help_text: Optional[str] = None
    question_type: QuestionType
    is_required: bool = False
    display_order: int
    default_value: Optional[str] = None
    is_active: bool = True
    backend_key: Optional[str] = None
    send_if_true_only: bool = False
    options: List[QuestionOptionPayload] = []
    visibility_rules: List[QuestionVisibilityRulePayload] = []


class QuestionnaireStepPayload(BaseModel):
    code: str
    title: str
    step_order: int
    questions: List[QuestionPayload] = []


class QuestionnaireUpsertRequest(BaseModel):
    code: str
    name: str
    version: int = 1
    status: str = "draft"
    is_active: bool = False
    steps: List[QuestionnaireStepPayload] = []

class QuestionOptionResponse(BaseModel):
    id: int
    question_id: int
    label: str
    value: str
    display_order: int

class QuestionVisibilityRuleResponse(BaseModel):
    id: int
    question_id: int
    depends_on_question_id: int
    operator: str
    expected_value: str
    question_code: Optional[str] = None
    depends_on_question_code: Optional[str] = None

class QuestionResponse(BaseModel):
    id: int
    step_id: int
    step_code: Optional[str] = None
    code: str
    label: str
    help_text: Optional[str] = None
    question_type: QuestionType
    is_required: bool
    display_order: int
    default_value: Optional[str] = None
    is_active: bool
    backend_key: str
    send_if_true_only: bool
    options: List[QuestionOptionResponse] = []
    visibility_rules: List[QuestionVisibilityRuleResponse] = []

class QuestionnaireStepResponse(BaseModel):
    id: int
    code: str
    title: str
    step_order: int

class QuestionnaireResponse(BaseModel):
    id: int
    code: str
    name: str
    version: int
    status: str
    is_active: bool
    steps: List[QuestionnaireStepResponse]
    questions: List[QuestionResponse]


class QuestionnaireListItemResponse(BaseModel):
    id: int
    code: str
    name: str
    version: int
    status: str
    is_active: bool