import json
from app.core.database import get_connection

class AnalysisRepository:
    @staticmethod
    def get_questionnaire_meta_by_code(code: str):
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, version
                    FROM questionnaire
                    WHERE code = %s AND is_active = TRUE
                    LIMIT 1
                """, (code,))
                return cur.fetchone()
        finally:
            conn.close()

    @staticmethod
    def create_analysis_request(app_name: str, app_description: str, questionnaire_id: int, questionnaire_version: int):
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO analysis_request
                    (app_name, app_description, questionnaire_id, questionnaire_version, status)
                    VALUES (%s, %s, %s, %s, 'submitted')
                    RETURNING id
                """, (app_name, app_description, questionnaire_id, questionnaire_version))
                analysis = cur.fetchone()
                conn.commit()
                return analysis["id"]
        finally:
            conn.close()

    @staticmethod
    def insert_answers(analysis_request_id: int, answers: dict):
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                for question_code, value in answers.items():
                    if isinstance(value, bool):
                        cur.execute("""
                            INSERT INTO analysis_answer
                            (analysis_request_id, question_code, answer_boolean)
                            VALUES (%s, %s, %s)
                            ON CONFLICT (analysis_request_id, question_code)
                            DO UPDATE SET
                                answer_boolean = EXCLUDED.answer_boolean,
                                updated_at = CURRENT_TIMESTAMP
                        """, (analysis_request_id, question_code, value))

                    elif isinstance(value, str):
                        cur.execute("""
                            INSERT INTO analysis_answer
                            (analysis_request_id, question_code, answer_text)
                            VALUES (%s, %s, %s)
                            ON CONFLICT (analysis_request_id, question_code)
                            DO UPDATE SET
                                answer_text = EXCLUDED.answer_text,
                                updated_at = CURRENT_TIMESTAMP
                        """, (analysis_request_id, question_code, value))

                    elif isinstance(value, list):
                        cur.execute("""
                            INSERT INTO analysis_answer
                            (analysis_request_id, question_code, answer_json)
                            VALUES (%s, %s, %s::jsonb)
                            ON CONFLICT (analysis_request_id, question_code)
                            DO UPDATE SET
                                answer_json = EXCLUDED.answer_json,
                                updated_at = CURRENT_TIMESTAMP
                        """, (analysis_request_id, question_code, json.dumps(value)))

                conn.commit()
        finally:
            conn.close()

    @staticmethod
    def get_analysis_answers(analysis_request_id: int):
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        question_code,
                        answer_text,
                        answer_boolean,
                        answer_json
                    FROM analysis_answer
                    WHERE analysis_request_id = %s
                    ORDER BY question_code
                    """,
                    (analysis_request_id,),
                )
                return cur.fetchall()
        finally:
            conn.close()

    @staticmethod
    def get_answer_context_entries(questionnaire_code: str, question_code: str, option_values: list[str]):
        if not option_values:
            return []

        normalized_values = [value.strip().upper() for value in option_values if value and value.strip()]
        if not normalized_values:
            return []

        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        questionnaire_code,
                        question_code,
                        option_value,
                        context_category,
                        llm_sentence,
                        diagram_hint
                    FROM questionnaire_answer_context
                    WHERE questionnaire_code = %s
                      AND question_code = %s
                      AND UPPER(option_value) = ANY(%s)
                    ORDER BY option_value
                    """,
                    (questionnaire_code, question_code, normalized_values),
                )
                return cur.fetchall()
        finally:
            conn.close()

    @staticmethod
    def update_analysis_status(analysis_request_id: int, status: str):
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE analysis_request
                    SET status = %s
                    WHERE id = %s
                    """,
                    (status, analysis_request_id),
                )
                conn.commit()
        finally:
            conn.close()
