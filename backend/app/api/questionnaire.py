from fastapi import APIRouter, HTTPException

from app.schemas.questionnaire import QuestionnaireResponse
from app.services.questionnaire_service import QuestionnaireService

router = APIRouter(prefix="/questionnaires", tags=["questionnaires"])
QUESTIONNAIRE_NOT_FOUND = "Questionnaire non trouve"
NO_ACTIVE_QUESTIONNAIRE = (
    "Aucun questionnaire actif. Creez-en un depuis l espace admin puis activez-le."
)


@router.get(
    "/active",
    response_model=QuestionnaireResponse,
    responses={404: {"description": QUESTIONNAIRE_NOT_FOUND}},
)
def get_active_questionnaire():
    questionnaire = QuestionnaireService.get_active_questionnaire()
    if not questionnaire:
        raise HTTPException(status_code=404, detail=NO_ACTIVE_QUESTIONNAIRE)
    return questionnaire


@router.get(
    "/{code}",
    response_model=QuestionnaireResponse,
    responses={404: {"description": QUESTIONNAIRE_NOT_FOUND}},
)
def get_questionnaire(code: str):
    questionnaire = QuestionnaireService.get_questionnaire(code)
    if not questionnaire:
        raise HTTPException(status_code=404, detail=QUESTIONNAIRE_NOT_FOUND)
    return questionnaire
