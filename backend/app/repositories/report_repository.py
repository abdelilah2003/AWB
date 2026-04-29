from __future__ import annotations

from typing import Iterable

from app.core.auth import AuthenticatedUser
from app.core.database import get_connection


class ReportRepository:
    @staticmethod
    def create_report(
        *,
        title: str,
        description: str | None,
        file_name: str,
        file_type: str,
        file_size: int | None,
        minio_bucket: str,
        minio_object_key: str,
        generated_by: AuthenticatedUser,
        status: str = "PENDING_MANAGER_VALIDATION",
    ) -> dict:
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO reports (
                        title,
                        description,
                        file_name,
                        file_type,
                        file_size,
                        minio_bucket,
                        minio_object_key,
                        status,
                        generated_by,
                        generated_by_username,
                        generated_by_email
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING *
                    """,
                    (
                        title,
                        description,
                        file_name,
                        file_type,
                        file_size,
                        minio_bucket,
                        minio_object_key,
                        status,
                        str(generated_by.user_id),
                        generated_by.display_name,
                        generated_by.email,
                    ),
                )
                report = cur.fetchone()

                cur.execute(
                    """
                    INSERT INTO report_status_history (
                        report_id,
                        old_status,
                        new_status,
                        changed_by,
                        changed_by_username,
                        changed_by_email,
                        comment
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        report["id"],
                        None,
                        status,
                        str(generated_by.user_id),
                        generated_by.display_name,
                        generated_by.email,
                        "Rapport genere et soumis au manager.",
                    ),
                )
                conn.commit()
                return report
        finally:
            conn.close()

    @staticmethod
    def get_report_by_id(report_id: str) -> dict | None:
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT *
                    FROM reports
                    WHERE id = %s
                    """,
                    (report_id,),
                )
                return cur.fetchone()
        finally:
            conn.close()

    @staticmethod
    def list_reports(*, generated_by: str | None = None) -> list[dict]:
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                if generated_by:
                    cur.execute(
                        """
                        SELECT *
                        FROM reports
                        WHERE generated_by = %s
                        ORDER BY generated_at DESC, created_at DESC
                        """,
                        (generated_by,),
                    )
                else:
                    cur.execute(
                        """
                        SELECT *
                        FROM reports
                        ORDER BY generated_at DESC, created_at DESC
                        """
                    )
                return cur.fetchall()
        finally:
            conn.close()

    @staticmethod
    def get_annotations(report_id: str) -> list[dict]:
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT *
                    FROM report_annotations
                    WHERE report_id = %s
                    ORDER BY created_at DESC
                    """,
                    (report_id,),
                )
                return cur.fetchall()
        finally:
            conn.close()

    @staticmethod
    def get_status_history(report_id: str) -> list[dict]:
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT *
                    FROM report_status_history
                    WHERE report_id = %s
                    ORDER BY changed_at DESC
                    """,
                    (report_id,),
                )
                return cur.fetchall()
        finally:
            conn.close()

    @staticmethod
    def get_annotations_for_reports(report_ids: Iterable[str]) -> dict[str, list[dict]]:
        report_ids = list(report_ids)
        if not report_ids:
            return {}

        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT *
                    FROM report_annotations
                    WHERE report_id::text = ANY(%s)
                    ORDER BY created_at DESC
                    """,
                    (report_ids,),
                )
                rows = cur.fetchall()
        finally:
            conn.close()

        grouped: dict[str, list[dict]] = {}
        for row in rows:
            grouped.setdefault(str(row["report_id"]), []).append(row)
        return grouped

    @staticmethod
    def get_status_history_for_reports(report_ids: Iterable[str]) -> dict[str, list[dict]]:
        report_ids = list(report_ids)
        if not report_ids:
            return {}

        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT *
                    FROM report_status_history
                    WHERE report_id::text = ANY(%s)
                    ORDER BY changed_at DESC
                    """,
                    (report_ids,),
                )
                rows = cur.fetchall()
        finally:
            conn.close()

        grouped: dict[str, list[dict]] = {}
        for row in rows:
            grouped.setdefault(str(row["report_id"]), []).append(row)
        return grouped

    @staticmethod
    def update_report_status(
        *,
        report_id: str,
        new_status: str,
        actor: AuthenticatedUser,
        comment: str | None,
    ) -> dict | None:
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT status
                    FROM reports
                    WHERE id = %s
                    """,
                    (report_id,),
                )
                current = cur.fetchone()
                if not current:
                    return None

                old_status = current["status"]

                cur.execute(
                    """
                    UPDATE reports
                    SET status = %s,
                        validated_by = %s,
                        validated_by_username = %s,
                        validated_by_email = %s,
                        validated_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                    RETURNING *
                    """,
                    (
                        new_status,
                        str(actor.user_id),
                        actor.display_name,
                        actor.email,
                        report_id,
                    ),
                )
                updated = cur.fetchone()

                cur.execute(
                    """
                    INSERT INTO report_status_history (
                        report_id,
                        old_status,
                        new_status,
                        changed_by,
                        changed_by_username,
                        changed_by_email,
                        comment
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        report_id,
                        old_status,
                        new_status,
                        str(actor.user_id),
                        actor.display_name,
                        actor.email,
                        comment,
                    ),
                )

                if comment and comment.strip():
                    cur.execute(
                        """
                        INSERT INTO report_annotations (
                            report_id,
                            annotation,
                            created_by,
                            created_by_username,
                            created_by_email
                        )
                        VALUES (%s, %s, %s, %s, %s)
                        """,
                        (
                            report_id,
                            comment.strip(),
                            str(actor.user_id),
                            actor.display_name,
                            actor.email,
                        ),
                    )

                conn.commit()
                return updated
        finally:
            conn.close()
