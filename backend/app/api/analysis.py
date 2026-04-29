from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.exceptions import AnalysisStepError
from app.schemas.analysis import AnalysisCreateRequest, AnalysisCreateResponse
from app.services.analysis_service import AnalysisService

router = APIRouter(tags=["analyses"])


@router.post("/analyses", response_model=AnalysisCreateResponse)
@router.post("/analyze", response_model=AnalysisCreateResponse, include_in_schema=False)
def create_analysis(
    payload: AnalysisCreateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    try:
        result = AnalysisService.create_analysis(
            app_name=payload.app_name,
            app_description=payload.app_description,
            questionnaire_code=payload.questionnaire_code,
            answers=payload.answers,
            generated_by=current_user,
            dev_name=payload.dev_name or "",
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except AnalysisStepError as e:
        raise HTTPException(status_code=500, detail=e.to_detail())
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error_type": "UNEXPECTED_BACKEND_ERROR",
                "step": "api_analysis",
                "message": "Erreur inattendue pendant l'analyse.",
                "cause": str(e),
            },
        )


@router.get("/download-report", include_in_schema=False)
def download_report():
    report_path = AnalysisService.get_latest_report_path()
    if not report_path:
        raise HTTPException(status_code=404, detail="Aucun rapport disponible")

    report_file = Path(report_path)
    if not report_file.exists():
        raise HTTPException(status_code=404, detail="Fichier rapport introuvable")

    return FileResponse(
        path=str(report_file),
        media_type="application/pdf",
        filename=report_file.name,
        headers={"Content-Disposition": "inline"},
    )


@router.get("/download-dfd", include_in_schema=False)
def download_dfd():
    dfd_path = AnalysisService.get_latest_dfd_path()
    if not dfd_path:
        raise HTTPException(status_code=404, detail="Aucun DFD disponible")

    dfd_file = Path(dfd_path)
    if not dfd_file.exists():
        raise HTTPException(status_code=404, detail="Fichier DFD introuvable")

    return FileResponse(
        path=str(dfd_file),
        media_type="image/png",
        filename=dfd_file.name,
    )
