from fastapi import APIRouter, HTTPException

from app.schemas.questionnaire import (
    QuestionnaireListItemResponse,
    QuestionnaireResponse,
    QuestionnaireUpsertRequest,
)
from app.services.questionnaire_service import QuestionnaireService

router = APIRouter(prefix="/admin/questionnaires", tags=["admin-questionnaires"])
QUESTIONNAIRE_NOT_FOUND = "Questionnaire non trouvé"


@router.get("", response_model=list[QuestionnaireListItemResponse])
def list_questionnaires():
    return QuestionnaireService.list_questionnaires()


@router.get(
    "/{questionnaire_id}",
    response_model=QuestionnaireResponse,
    responses={404: {"description": QUESTIONNAIRE_NOT_FOUND}},
)
def get_questionnaire(questionnaire_id: int):
    questionnaire = QuestionnaireService.get_questionnaire_by_id(questionnaire_id)
    if not questionnaire:
        raise HTTPException(status_code=404, detail=QUESTIONNAIRE_NOT_FOUND)
    return questionnaire


@router.post("", response_model=QuestionnaireResponse)
def create_questionnaire(payload: QuestionnaireUpsertRequest):
    return QuestionnaireService.create_questionnaire(payload.dict())


@router.put(
    "/{questionnaire_id}",
    response_model=QuestionnaireResponse,
    responses={404: {"description": QUESTIONNAIRE_NOT_FOUND}},
)
def update_questionnaire(questionnaire_id: int, payload: QuestionnaireUpsertRequest):
    questionnaire = QuestionnaireService.update_questionnaire(questionnaire_id, payload.dict())
    if not questionnaire:
        raise HTTPException(status_code=404, detail=QUESTIONNAIRE_NOT_FOUND)
    return questionnaire


@router.delete(
    "/{questionnaire_id}",
    responses={404: {"description": QUESTIONNAIRE_NOT_FOUND}},
)
def delete_questionnaire(questionnaire_id: int):
    deleted = QuestionnaireService.delete_questionnaire(questionnaire_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=QUESTIONNAIRE_NOT_FOUND)
    return {"deleted": True}
