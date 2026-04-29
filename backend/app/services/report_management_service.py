from __future__ import annotations

import logging
from pathlib import Path

from fastapi import HTTPException, status

from app.core.auth import AuthenticatedUser
from app.core.exceptions import AnalysisStepError
from app.repositories.report_repository import ReportRepository
from app.schemas.report import (
    ReportAnnotationResponse,
    ReportResponse,
    ReportStatusHistoryResponse,
)
from app.services.minio_service import MinioService

logger = logging.getLogger(__name__)


class ReportManagementService:
    DOWNLOAD_PATH_TEMPLATE = "/reports/{report_id}/download"
    ALLOWED_MANAGER_STATUSES = {"APPROVED", "REJECTED", "NEEDS_CHANGES"}

    @staticmethod
    def _build_summary(description: str | None) -> str:
        text = (description or "").strip()
        if not text:
            return "Rapport genere sans resume disponible."
        return text[:200] + ("..." if len(text) > 200 else "")

    @staticmethod
    def _serialize_report(
        report_row: dict,
        annotations_map: dict[str, list[dict]] | None = None,
        history_map: dict[str, list[dict]] | None = None,
    ) -> ReportResponse:
        report_id = str(report_row["id"])
        annotations = annotations_map.get(report_id, []) if annotations_map else []
        history = history_map.get(report_id, []) if history_map else []

        return ReportResponse(
            id=report_id,
            title=report_row["title"],
            app_name=report_row["title"],
            description=report_row.get("description"),
            summary=ReportManagementService._build_summary(report_row.get("description")),
            file_name=report_row["file_name"],
            file_type=report_row["file_type"],
            file_size=report_row.get("file_size"),
            status=report_row["status"],
            report_url=ReportManagementService.DOWNLOAD_PATH_TEMPLATE.format(report_id=report_id),
            generated_by=str(report_row["generated_by"]),
            generated_by_username=report_row.get("generated_by_username"),
            generated_by_email=report_row.get("generated_by_email"),
            generated_at=report_row["generated_at"],
            validated_by=str(report_row["validated_by"]) if report_row.get("validated_by") else None,
            validated_by_username=report_row.get("validated_by_username"),
            validated_by_email=report_row.get("validated_by_email"),
            validated_at=report_row.get("validated_at"),
            annotations=[
                ReportAnnotationResponse(
                    id=str(annotation["id"]),
                    annotation=annotation["annotation"],
                    created_by_username=annotation.get("created_by_username"),
                    created_by_email=annotation.get("created_by_email"),
                    created_at=annotation["created_at"],
                )
                for annotation in annotations
            ],
            status_history=[
                ReportStatusHistoryResponse(
                    id=str(entry["id"]),
                    old_status=entry.get("old_status"),
                    new_status=entry["new_status"],
                    changed_by_username=entry.get("changed_by_username"),
                    changed_by_email=entry.get("changed_by_email"),
                    comment=entry.get("comment"),
                    changed_at=entry["changed_at"],
                )
                for entry in history
            ],
        )

    @staticmethod
    def _build_object_key(user: AuthenticatedUser, file_name: str) -> str:
        return f"reports/{user.user_id}/{file_name}"

    @staticmethod
    def create_report_record(
        *,
        app_name: str,
        description: str,
        pdf_path: str,
        file_name: str,
        generated_by: AuthenticatedUser,
    ) -> ReportResponse:
        object_key = ReportManagementService._build_object_key(generated_by, file_name)
        try:
            upload_result = MinioService.upload_file(
                pdf_path,
                object_key=object_key,
                content_type="application/pdf",
            )
            logger.info(
                "Rapport stocke dans MinIO: app=%s bucket=%s object_key=%s",
                app_name,
                upload_result["bucket"],
                upload_result["object_key"],
            )
        except Exception as exc:
            logger.warning("MinIO indisponible, fallback local active: %s", exc)
            upload_result = {
                "bucket": MinioService.LOCAL_BUCKET,
                "object_key": str(Path(pdf_path).resolve()),
                "file_size": Path(pdf_path).stat().st_size,
            }

        try:
            report_row = ReportRepository.create_report(
                title=app_name,
                description=description,
                file_name=file_name,
                file_type="application/pdf",
                file_size=upload_result["file_size"],
                minio_bucket=upload_result["bucket"],
                minio_object_key=upload_result["object_key"],
                generated_by=generated_by,
            )
        except Exception as exc:
            logger.exception("Echec insertion metadata rapport en base")
            raise AnalysisStepError(
                "database_report_metadata",
                "Impossible d'enregistrer les metadonnees du rapport en base.",
                cause=exc,
            ) from exc
        return ReportManagementService._serialize_report(report_row)

    @staticmethod
    def list_my_reports(user: AuthenticatedUser) -> list[ReportResponse]:
        rows = ReportRepository.list_reports(generated_by=str(user.user_id))
        report_ids = [str(row["id"]) for row in rows]
        annotations_map = ReportRepository.get_annotations_for_reports(report_ids)
        history_map = ReportRepository.get_status_history_for_reports(report_ids)
        return [
            ReportManagementService._serialize_report(row, annotations_map, history_map)
            for row in rows
        ]

    @staticmethod
    def list_all_reports() -> list[ReportResponse]:
        rows = ReportRepository.list_reports()
        report_ids = [str(row["id"]) for row in rows]
        annotations_map = ReportRepository.get_annotations_for_reports(report_ids)
        history_map = ReportRepository.get_status_history_for_reports(report_ids)
        return [
            ReportManagementService._serialize_report(row, annotations_map, history_map)
            for row in rows
        ]

    @staticmethod
    def get_report(report_id: str) -> ReportResponse:
        row = ReportRepository.get_report_by_id(report_id)
        if not row:
            raise HTTPException(status_code=404, detail="Rapport introuvable.")

        annotations_map = {report_id: ReportRepository.get_annotations(report_id)}
        history_map = {report_id: ReportRepository.get_status_history(report_id)}
        return ReportManagementService._serialize_report(row, annotations_map, history_map)

    @staticmethod
    def get_download_payload(report_id: str) -> dict:
        report_row = ReportRepository.get_report_by_id(report_id)
        if not report_row:
            raise HTTPException(status_code=404, detail="Rapport introuvable.")

        if report_row["minio_bucket"] == MinioService.LOCAL_BUCKET:
            local_path = Path(report_row["minio_object_key"])
            if not local_path.exists():
                raise HTTPException(status_code=404, detail="Fichier local du rapport introuvable.")
            return {
                "report": report_row,
                "local_path": str(local_path),
                "object_response": None,
            }

        try:
            object_response = MinioService.get_object(
                report_row["minio_bucket"],
                report_row["minio_object_key"],
            )
        except Exception as exc:
            logger.exception(
                "Echec recuperation rapport depuis le stockage: report_id=%s bucket=%s object_key=%s",
                report_id,
                report_row["minio_bucket"],
                report_row["minio_object_key"],
            )
            raise HTTPException(
                status_code=500,
                detail={
                    "error_type": "REPORT_DOWNLOAD_ERROR",
                    "step": "report_storage_read",
                    "message": "Impossible de recuperer le rapport depuis le stockage.",
                    "cause": str(exc),
                },
            ) from exc

        return {
            "report": report_row,
            "local_path": None,
            "object_response": object_response,
        }

    @staticmethod
    def update_report_status(
        *,
        report_id: str,
        new_status: str,
        actor: AuthenticatedUser,
        comment: str | None,
    ) -> ReportResponse:
        normalized_status = (new_status or "").strip().upper()
        if normalized_status not in ReportManagementService.ALLOWED_MANAGER_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Statut de validation non supporte.",
            )

        updated = ReportRepository.update_report_status(
            report_id=report_id,
            new_status=normalized_status,
            actor=actor,
            comment=comment,
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Rapport introuvable.")

        return ReportManagementService.get_report(report_id)
