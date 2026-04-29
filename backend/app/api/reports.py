from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse, StreamingResponse

from app.core.auth import AuthenticatedUser, get_current_user
from app.schemas.report import ReportResponse, ReportStatusUpdateRequest
from app.services.report_management_service import ReportManagementService

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/me", response_model=list[ReportResponse])
def list_my_reports(current_user: AuthenticatedUser = Depends(get_current_user)):
    return ReportManagementService.list_my_reports(current_user)


@router.get("", response_model=list[ReportResponse])
def list_all_reports(_: AuthenticatedUser = Depends(get_current_user)):
    return ReportManagementService.list_all_reports()


@router.get("/{report_id}", response_model=ReportResponse)
def get_report(report_id: str, _: AuthenticatedUser = Depends(get_current_user)):
    return ReportManagementService.get_report(report_id)


@router.patch("/{report_id}/status", response_model=ReportResponse)
def update_report_status(
    report_id: str,
    payload: ReportStatusUpdateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    return ReportManagementService.update_report_status(
        report_id=report_id,
        new_status=payload.status,
        actor=current_user,
        comment=payload.comment,
    )


@router.get("/{report_id}/download", include_in_schema=False)
def download_report(report_id: str):
    payload = ReportManagementService.get_download_payload(report_id)
    report = payload["report"]
    local_path = payload.get("local_path")
    object_response = payload["object_response"]

    if local_path:
        return FileResponse(
            path=local_path,
            media_type=report["file_type"],
            filename=report["file_name"],
            headers={"Content-Disposition": "inline"},
        )

    def iterator():
        try:
            # MinIO python client returns an urllib3 HTTPResponse.
            for chunk in object_response.stream(64 * 1024):
                if not chunk:
                    continue
                yield chunk
        finally:
            try:
                object_response.close()
            finally:
                if hasattr(object_response, "release_conn"):
                    object_response.release_conn()

    return StreamingResponse(
        iterator(),
        media_type=report["file_type"],
        headers={
            "Content-Disposition": f'inline; filename="{report["file_name"]}"',
        },
    )
