from typing import List, Optional

from pydantic import BaseModel


class CatalogMitigationPayload(BaseModel):
    description_mitigation: str
    conditions_mitigation: Optional[str] = None


class CatalogScenarioPayload(BaseModel):
    description_scenario: str
    conditions_scenario: Optional[str] = None


class CatalogReferencePayload(BaseModel):
    id_reference: Optional[int] = None
    reference_menace: str
    nom_reference: str
    lien: Optional[str] = None


class CatalogThreatUpsertRequest(BaseModel):
    nom_menace: str
    description: Optional[str] = None
    reference_menace: Optional[str] = None
    mitigations: List[CatalogMitigationPayload] = []
    scenarios: List[CatalogScenarioPayload] = []
    references: List[CatalogReferencePayload] = []


class CatalogMitigationResponse(BaseModel):
    id_mitigation: int
    id_menace: int
    description_mitigation: str
    conditions_mitigation: Optional[str] = None


class CatalogScenarioResponse(BaseModel):
    id_scenario: int
    id_menace: int
    description_scenario: str
    conditions_scenario: Optional[str] = None


class CatalogReferenceResponse(BaseModel):
    id_reference: int
    reference_menace: str
    nom_reference: str
    lien: Optional[str] = None


class CatalogThreatResponse(BaseModel):
    id_menace: int
    nom_menace: str
    description: Optional[str] = None
    reference_menace: Optional[str] = None
    mitigations: List[CatalogMitigationResponse] = []
    scenarios: List[CatalogScenarioResponse] = []
    references: List[CatalogReferenceResponse] = []


class CatalogThreatListItemResponse(BaseModel):
    id_menace: int
    nom_menace: str
    description: Optional[str] = None
    reference_menace: Optional[str] = None
    mitigation_count: int
    scenario_count: int
    reference_count: int


class CatalogRefreshResponse(BaseModel):
    status: str
    message: str
