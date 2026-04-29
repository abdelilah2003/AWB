import json
import logging
from pathlib import Path

from app.core.auth import AuthenticatedUser
from app.core.exceptions import AnalysisStepError
from app.repositories.analysis_repository import AnalysisRepository
from app.repositories.catalog_repository import CatalogRepository
from app.repositories.questionnaire_repository import QuestionnaireRepository
from app.services.dfd_generator import generate_dfd_with_pytm
from app.services.llm_clients import (
    call_gemini,
    call_mistral,
    clean_text_response,
    extract_json_object,
)
from app.services.prompts import (
    APPLICATION_DESCRIPTION_PROMPT,
    DFD_SYSTEM_PROMPT,
    THREAT_MODELING_PROMPT,
)
from app.services.report_management_service import ReportManagementService
from app.services.report_service import build_safe_slug, generate_report_pdf

logger = logging.getLogger(__name__)


class AnalysisService:
    _latest_report_path: str | None = None
    _latest_dfd_path: str | None = None

    @staticmethod
    def _normalize_answer_candidates(answer_row: dict) -> list[str]:
        answer_text = answer_row.get("answer_text")
        answer_boolean = answer_row.get("answer_boolean")
        answer_json = answer_row.get("answer_json")

        if isinstance(answer_text, str) and answer_text.strip():
            return [answer_text.strip()]

        if isinstance(answer_boolean, bool):
            return [
                "YES" if answer_boolean else "NO",
                "TRUE" if answer_boolean else "FALSE",
                "true" if answer_boolean else "false",
            ]

        if isinstance(answer_json, list):
            return [str(item).strip() for item in answer_json if str(item).strip()]

        return []

    @staticmethod
    def _render_answer_value(answer_row: dict) -> str:
        answer_text = answer_row.get("answer_text")
        answer_boolean = answer_row.get("answer_boolean")
        answer_json = answer_row.get("answer_json")

        if isinstance(answer_text, str) and answer_text.strip():
            return answer_text.strip()
        if isinstance(answer_boolean, bool):
            return "Oui" if answer_boolean else "Non"
        if isinstance(answer_json, list):
            values = [str(item).strip() for item in answer_json if str(item).strip()]
            return ", ".join(values)
        return ""

    @staticmethod
    def _build_fallback_sentence(question_meta: dict, answer_row: dict) -> str | None:
        answer_value = AnalysisService._render_answer_value(answer_row)
        if not answer_value:
            return None

        label = (question_meta.get("label") or answer_row.get("question_code") or "").strip()
        if not label:
            return None

        return f"{label} : {answer_value}."

    @staticmethod
    def _build_context_bundle(analysis_id: int, questionnaire_code: str, questionnaire_data: dict) -> dict:
        answers = AnalysisRepository.get_analysis_answers(analysis_id)
        questions_by_code = {
            question["code"]: question
            for question in questionnaire_data.get("questions", [])
        }

        llm_sentences: list[str] = []
        diagram_hints: list[str] = []
        question_summaries: list[str] = []

        for answer_row in answers:
            question_code = answer_row["question_code"]
            question_meta = questions_by_code.get(question_code, {})
            candidates = AnalysisService._normalize_answer_candidates(answer_row)
            context_rows = AnalysisRepository.get_answer_context_entries(
                questionnaire_code=questionnaire_code,
                question_code=question_code,
                option_values=candidates,
            )

            if context_rows:
                for context_row in context_rows:
                    sentence = (context_row.get("llm_sentence") or "").strip()
                    hint = (context_row.get("diagram_hint") or "").strip()

                    if sentence and sentence not in llm_sentences:
                        llm_sentences.append(sentence)
                    if hint and hint not in diagram_hints:
                        diagram_hints.append(hint)
            else:
                fallback_sentence = AnalysisService._build_fallback_sentence(question_meta, answer_row)
                if fallback_sentence and fallback_sentence not in llm_sentences:
                    llm_sentences.append(fallback_sentence)

            display_value = AnalysisService._render_answer_value(answer_row)
            if display_value:
                label = (question_meta.get("label") or question_code).strip()
                question_summaries.append(f"- {label}: {display_value}")

        context_parts = ["Contexte applicatif extrait du questionnaire :"]
        if llm_sentences:
            context_parts.extend(f"- {sentence}" for sentence in llm_sentences)
        else:
            context_parts.append("- Aucun contexte traduisible n a ete trouve dans questionnaire_answer_context.")

        if diagram_hints:
            context_parts.append("")
            context_parts.append("Indications diagramme :")
            context_parts.extend(f"- {hint}" for hint in diagram_hints)

        if question_summaries:
            context_parts.append("")
            context_parts.append("Reponses brutes utiles :")
            context_parts.extend(question_summaries)

        return {
            "llm_sentences": llm_sentences,
            "diagram_hints": diagram_hints,
            "question_summaries": question_summaries,
            "context_text": "\n".join(context_parts),
        }

    @staticmethod
    def _generate_application_description(app_name: str, app_description: str, context_bundle: dict) -> str:
        prompt = (
            f"{APPLICATION_DESCRIPTION_PROMPT}\n\n"
            f"Nom de l application :\n{app_name}\n\n"
            f"Description initiale fournie :\n{app_description}\n\n"
            f"{context_bundle['context_text']}\n"
        )
        return clean_text_response(call_mistral(prompt))

    @staticmethod
    def _generate_dfd_json(app_name: str, generated_description: str, context_bundle: dict) -> dict:
        prompt = (
            f"{DFD_SYSTEM_PROMPT}\n\n"
            f"Nom de l application :\n{app_name}\n\n"
            f"Description consolidee :\n{generated_description}\n\n"
            f"{context_bundle['context_text']}\n"
        )
        return extract_json_object(call_mistral(prompt))

    @staticmethod
    def _analyze_catalog_threats(app_name: str, generated_description: str, context_bundle: dict) -> dict:
        catalog_threats = CatalogRepository.list_threats_for_analysis()
        prompt = (
            f"{THREAT_MODELING_PROMPT}\n\n"
            f"Nom de l application :\n{app_name}\n\n"
            f"Description consolidee :\n{generated_description}\n\n"
            f"{context_bundle['context_text']}\n\n"
            f"Catalogue de menaces disponible :\n"
            f"{json.dumps(catalog_threats, ensure_ascii=False, indent=2)}\n"
        )
        return extract_json_object(call_gemini(prompt))

    @staticmethod
    def _normalize_selected_threats(analysis_result: dict) -> list[dict]:
        normalized = []

        for raw_threat in analysis_result.get("threats", []):
            name = str(raw_threat.get("name", "")).strip()
            if not name:
                continue

            attack_scenarios = raw_threat.get("attack_scenarios", [])
            if isinstance(attack_scenarios, str):
                attack_scenarios = [attack_scenarios]

            mitigations = raw_threat.get("mitigations", [])
            if isinstance(mitigations, str):
                mitigations = [mitigations]

            normalized.append(
                {
                    "name": name,
                    "description": str(raw_threat.get("description", "")).strip(),
                    "impact": str(raw_threat.get("impact", "")).strip(),
                    "attack_scenarios": [
                        str(item).strip()
                        for item in attack_scenarios
                        if str(item).strip()
                    ],
                    "mitigations": [
                        str(item).strip()
                        for item in mitigations
                        if str(item).strip()
                    ],
                }
            )

        return normalized

    @staticmethod
    def create_analysis(
        app_name: str,
        app_description: str,
        questionnaire_code: str,
        answers: dict,
        generated_by: AuthenticatedUser,
        dev_name: str = "",
    ):
        logger.info(
            "Debut analyse: app_name=%s questionnaire_code=%s generated_by=%s",
            app_name,
            questionnaire_code,
            generated_by.username,
        )

        try:
            questionnaire_meta = AnalysisRepository.get_questionnaire_meta_by_code(questionnaire_code)
        except Exception as exc:
            logger.exception("Echec lecture meta questionnaire")
            raise AnalysisStepError(
                "questionnaire_lookup",
                "Impossible de charger les metadonnees du questionnaire.",
                cause=exc,
            ) from exc
        if not questionnaire_meta:
            raise ValueError("Questionnaire actif introuvable")

        try:
            questionnaire_data = QuestionnaireRepository.get_active_questionnaire_by_code(questionnaire_code)
        except Exception as exc:
            logger.exception("Echec lecture questionnaire actif")
            raise AnalysisStepError(
                "questionnaire_load",
                "Impossible de charger la configuration du questionnaire.",
                cause=exc,
            ) from exc
        if not questionnaire_data:
            raise ValueError("Configuration questionnaire introuvable")

        try:
            analysis_id = AnalysisRepository.create_analysis_request(
                app_name=app_name,
                app_description=app_description,
                questionnaire_id=questionnaire_meta["id"],
                questionnaire_version=questionnaire_meta["version"],
            )
        except Exception as exc:
            logger.exception("Echec creation analysis_request")
            raise AnalysisStepError(
                "analysis_request_create",
                "Impossible de creer la demande d'analyse en base.",
                cause=exc,
            ) from exc

        try:
            try:
                AnalysisRepository.insert_answers(analysis_id, answers)
                logger.info("Reponses questionnaire enregistrees: analysis_id=%s", analysis_id)
            except Exception as exc:
                logger.exception("Echec insertion reponses analyse")
                raise AnalysisStepError(
                    "analysis_answers_save",
                    "Impossible d'enregistrer les reponses du questionnaire.",
                    cause=exc,
                ) from exc

            try:
                AnalysisRepository.update_analysis_status(analysis_id, "processing")
            except Exception as exc:
                logger.exception("Echec maj statut analyse -> processing")
                raise AnalysisStepError(
                    "analysis_status_processing",
                    "Impossible de passer l'analyse au statut processing.",
                    cause=exc,
                ) from exc

            try:
                context_bundle = AnalysisService._build_context_bundle(
                    analysis_id=analysis_id,
                    questionnaire_code=questionnaire_code,
                    questionnaire_data=questionnaire_data,
                )
            except Exception as exc:
                logger.exception("Echec construction contexte analyse")
                raise AnalysisStepError(
                    "context_build",
                    "Impossible de construire le contexte d'analyse.",
                    cause=exc,
                ) from exc

            try:
                generated_description = AnalysisService._generate_application_description(
                    app_name=app_name,
                    app_description=app_description,
                    context_bundle=context_bundle,
                )
                logger.info("Description applicative generee: analysis_id=%s", analysis_id)
            except Exception as exc:
                logger.exception("Echec generation description applicative")
                raise AnalysisStepError(
                    "application_description_generation",
                    "La generation de la description applicative a echoue.",
                    cause=exc,
                ) from exc

            try:
                dfd_json = AnalysisService._generate_dfd_json(
                    app_name=app_name,
                    generated_description=generated_description,
                    context_bundle=context_bundle,
                )
            except Exception as exc:
                logger.exception("Echec generation JSON DFD")
                raise AnalysisStepError(
                    "dfd_json_generation",
                    "La generation du JSON DFD a echoue.",
                    cause=exc,
                ) from exc

            try:
                dfd_output_dir = Path(__file__).resolve().parents[2] / "resources" / "out" / "diagrams"
                dfd_image_path = generate_dfd_with_pytm(dfd_json, str(dfd_output_dir))
                AnalysisService._latest_dfd_path = dfd_image_path
                logger.info("DFD genere: analysis_id=%s path=%s", analysis_id, dfd_image_path)
            except Exception as exc:
                logger.exception("Echec rendu DFD")
                raise AnalysisStepError(
                    "dfd_render",
                    "La generation du diagramme DFD a echoue.",
                    cause=exc,
                ) from exc

            try:
                gemini_result = AnalysisService._analyze_catalog_threats(
                    app_name=app_name,
                    generated_description=generated_description,
                    context_bundle=context_bundle,
                )
                selected_threats = AnalysisService._normalize_selected_threats(gemini_result)
                logger.info(
                    "Analyse menaces terminee: analysis_id=%s threat_count=%s",
                    analysis_id,
                    len(selected_threats),
                )
            except Exception as exc:
                logger.exception("Echec analyse des menaces")
                raise AnalysisStepError(
                    "threat_analysis",
                    "L'analyse des menaces via le catalogue a echoue.",
                    cause=exc,
                ) from exc

            analyst_name = generated_by.display_name.strip() or generated_by.username
            report_file_name = (
                f"rapport-{build_safe_slug(analyst_name)}-"
                f"{build_safe_slug(app_name)}-"
                f"{Path(dfd_image_path).stem.split('_')[-1]}.pdf"
            )

            try:
                report_path = generate_report_pdf(
                    app_name=app_name,
                    developer_name=analyst_name or dev_name,
                    generated_description=generated_description,
                    selected_threats=selected_threats,
                    dfd_image_path=dfd_image_path,
                    report_file_name=report_file_name,
                )
                logger.info("PDF rapport genere: analysis_id=%s path=%s", analysis_id, report_path)
            except Exception as exc:
                logger.exception("Echec generation PDF rapport")
                raise AnalysisStepError(
                    "report_pdf_generation",
                    "La generation du PDF rapport a echoue.",
                    cause=exc,
                ) from exc

            AnalysisService._latest_report_path = report_path
            report = ReportManagementService.create_report_record(
                app_name=app_name,
                description=generated_description,
                pdf_path=report_path,
                file_name=report_file_name,
                generated_by=generated_by,
            )
            logger.info("Rapport persiste: analysis_id=%s report_id=%s", analysis_id, report.id)

            try:
                AnalysisRepository.update_analysis_status(analysis_id, "completed")
            except Exception as exc:
                logger.exception("Echec maj statut analyse -> completed")
                raise AnalysisStepError(
                    "analysis_status_completed",
                    "Le rapport est genere mais le statut final de l'analyse n'a pas pu etre mis a jour.",
                    cause=exc,
                ) from exc

            return {
                "analysis_id": analysis_id,
                "status": "success",
                "report_id": report.id,
                "report_url": report.report_url,
                "dfd_image_url": "/download-dfd",
                "application_description": generated_description,
                "threat_count": len(selected_threats),
            }
        except Exception as exc:
            try:
                AnalysisRepository.update_analysis_status(analysis_id, "failed")
            except Exception:
                logger.exception("Echec maj statut analyse -> failed")
            logger.exception("Pipeline analyse en echec: analysis_id=%s", analysis_id)
            if isinstance(exc, AnalysisStepError):
                raise
            raise AnalysisStepError(
                "unknown",
                "Une erreur inattendue est survenue pendant le pipeline d'analyse.",
                cause=exc,
            ) from exc

    @staticmethod
    def get_latest_report_path() -> str | None:
        return AnalysisService._latest_report_path

    @staticmethod
    def get_latest_dfd_path() -> str | None:
        return AnalysisService._latest_dfd_path
