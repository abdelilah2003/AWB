from typing import Any, Dict

from app.repositories.questionnaire_repository import QuestionnaireRepository


class QuestionnaireService:
    @staticmethod
    def list_questionnaires():
        return QuestionnaireRepository.list_questionnaires()

    @staticmethod
    def get_questionnaire(code: str):
        data = QuestionnaireRepository.get_active_questionnaire_by_code(code)
        return data

    @staticmethod
    def get_active_questionnaire():
        return QuestionnaireRepository.get_active_questionnaire()

    @staticmethod
    def get_questionnaire_by_id(questionnaire_id: int):
        return QuestionnaireRepository.get_questionnaire_by_id(questionnaire_id)

    @staticmethod
    def create_questionnaire(payload: Dict[str, Any]):
        return QuestionnaireRepository.create_questionnaire(payload)

    @staticmethod
    def update_questionnaire(questionnaire_id: int, payload: Dict[str, Any]):
        return QuestionnaireRepository.update_questionnaire(questionnaire_id, payload)

    @staticmethod
    def delete_questionnaire(questionnaire_id: int):
        return QuestionnaireRepository.delete_questionnaire(questionnaire_id)