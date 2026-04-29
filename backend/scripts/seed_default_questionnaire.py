import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.repositories.questionnaire_repository import QuestionnaireRepository


DEFAULT_QUESTIONNAIRE = {
    "code": "awb_default",
    "name": "Questionnaire AWB par defaut",
    "version": 1,
    "status": "published",
    "is_active": True,
    "steps": [
        {
            "code": "context",
            "title": "Contexte general",
            "step_order": 1,
            "questions": [],
        },
        {
            "code": "architecture",
            "title": "Architecture et exposition",
            "step_order": 2,
            "questions": [
                {
                    "code": "internet_exposed",
                    "label": "L application est-elle exposee a Internet ?",
                    "help_text": "Indiquez si des utilisateurs ou services externes peuvent y acceder.",
                    "question_type": "boolean",
                    "is_required": True,
                    "display_order": 1,
                    "default_value": None,
                    "is_active": True,
                    "backend_key": "internet_exposed",
                    "send_if_true_only": False,
                    "options": [],
                    "visibility_rules": [],
                },
                {
                    "code": "authentication_required",
                    "label": "Une authentification est-elle requise ?",
                    "help_text": "Connexion utilisateur, SSO, MFA ou acces technique authentifie.",
                    "question_type": "boolean",
                    "is_required": True,
                    "display_order": 2,
                    "default_value": None,
                    "is_active": True,
                    "backend_key": "authentication_required",
                    "send_if_true_only": False,
                    "options": [],
                    "visibility_rules": [],
                },
                {
                    "code": "data_sensitivity",
                    "label": "Quel niveau de sensibilite de donnees traitez-vous ?",
                    "help_text": "Choisissez le niveau dominant pour l application analysee.",
                    "question_type": "select",
                    "is_required": True,
                    "display_order": 3,
                    "default_value": None,
                    "is_active": True,
                    "backend_key": "data_sensitivity",
                    "send_if_true_only": False,
                    "options": [
                        {"label": "Public", "value": "public", "display_order": 1},
                        {"label": "Interne", "value": "internal", "display_order": 2},
                        {"label": "Sensible", "value": "sensitive", "display_order": 3},
                        {"label": "Critique", "value": "critical", "display_order": 4},
                    ],
                    "visibility_rules": [],
                },
                {
                    "code": "external_integrations",
                    "label": "Dependances ou integrations externes",
                    "help_text": "API tierces, fournisseurs cloud, services IAM, paiements, email, etc.",
                    "question_type": "textarea",
                    "is_required": False,
                    "display_order": 4,
                    "default_value": None,
                    "is_active": True,
                    "backend_key": "external_integrations",
                    "send_if_true_only": False,
                    "options": [],
                    "visibility_rules": [],
                },
            ],
        },
        {
            "code": "security",
            "title": "Donnees et securite",
            "step_order": 3,
            "questions": [
                {
                    "code": "stores_personal_data",
                    "label": "L application manipule-t-elle des donnees personnelles ?",
                    "help_text": "Exemples : identite, RH, clients, donnees de contact, traces nominatives.",
                    "question_type": "boolean",
                    "is_required": True,
                    "display_order": 1,
                    "default_value": None,
                    "is_active": True,
                    "backend_key": "stores_personal_data",
                    "send_if_true_only": False,
                    "options": [],
                    "visibility_rules": [],
                },
                {
                    "code": "has_admin_interface",
                    "label": "Existe-t-il une interface d administration ou des comptes privilegies ?",
                    "help_text": "Console admin, back-office, comptes de support ou operations.",
                    "question_type": "boolean",
                    "is_required": True,
                    "display_order": 2,
                    "default_value": None,
                    "is_active": True,
                    "backend_key": "has_admin_interface",
                    "send_if_true_only": False,
                    "options": [],
                    "visibility_rules": [],
                },
                {
                    "code": "logging_monitoring",
                    "label": "Decrivez rapidement la journalisation et la supervision en place",
                    "help_text": "Logs applicatifs, SIEM, alerting, traces, detection d anomalies, etc.",
                    "question_type": "textarea",
                    "is_required": False,
                    "display_order": 3,
                    "default_value": None,
                    "is_active": True,
                    "backend_key": "logging_monitoring",
                    "send_if_true_only": False,
                    "options": [],
                    "visibility_rules": [],
                },
            ],
        },
    ],
}


def main() -> None:
    questionnaires = QuestionnaireRepository.list_questionnaires()
    if questionnaires:
        print("Questionnaire seed skipped: database already contains questionnaires.")
        return

    questionnaire = QuestionnaireRepository.create_questionnaire(DEFAULT_QUESTIONNAIRE)
    print(
        "Created default questionnaire:",
        questionnaire["id"],
        questionnaire["code"],
        questionnaire["name"],
    )


if __name__ == "__main__":
    main()
