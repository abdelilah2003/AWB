from fastapi import APIRouter, HTTPException

from app.schemas.catalog import (
    CatalogRefreshResponse,
    CatalogThreatListItemResponse,
    CatalogThreatResponse,
    CatalogThreatUpsertRequest,
)
from app.services.catalog_service import CatalogService

router = APIRouter(prefix="/admin/catalog/threats", tags=["admin-catalog"])
THREAT_NOT_FOUND = "Menace non trouvee"


@router.get("", response_model=list[CatalogThreatListItemResponse])
def list_threats():
    return CatalogService.list_threats()


@router.post("/refresh", response_model=CatalogRefreshResponse)
def refresh_threat_catalog():
    return CatalogService.trigger_catalog_refresh()


@router.get(
    "/{threat_id}",
    response_model=CatalogThreatResponse,
    responses={404: {"description": THREAT_NOT_FOUND}},
)
def get_threat(threat_id: int):
    threat = CatalogService.get_threat_by_id(threat_id)
    if not threat:
        raise HTTPException(status_code=404, detail=THREAT_NOT_FOUND)
    return threat


@router.post("", response_model=CatalogThreatResponse)
def create_threat(payload: CatalogThreatUpsertRequest):
    return CatalogService.create_threat(payload.dict())


@router.put(
    "/{threat_id}",
    response_model=CatalogThreatResponse,
    responses={404: {"description": THREAT_NOT_FOUND}},
)
def update_threat(threat_id: int, payload: CatalogThreatUpsertRequest):
    threat = CatalogService.update_threat(threat_id, payload.dict())
    if not threat:
        raise HTTPException(status_code=404, detail=THREAT_NOT_FOUND)
    return threat


@router.delete(
    "/{threat_id}",
    responses={404: {"description": THREAT_NOT_FOUND}},
)
def delete_threat(threat_id: int):
    deleted = CatalogService.delete_threat(threat_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=THREAT_NOT_FOUND)
    return {"deleted": True}
