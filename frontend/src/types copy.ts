export type Severity = 'CRITIQUE' | 'ÉLEVÉ' | 'MOYEN' | 'FAIBLE';

export interface FormData {
  app_name: string;
  description: string; 
  dev_name?: string;
  model_mode: 'service' | 'in_house';
  has_llm: boolean;
  has_ML: boolean;
  has_rag: boolean;
  model_hosted: boolean;
  uses_external_ai_components: boolean;
  free_prompt: boolean;
  has_tools: boolean;
  has_personal_data: boolean;
  has_sensitive_docs: boolean;
  automated_decisions: boolean;
  publicly_exposed: boolean;
  has_external_api: boolean;
  has_llm_actions: boolean;
  trains_llm: boolean;
  trains_ml: boolean;
}

export interface AnalysisHistoryItem {
  id: string;
  appName: string;
  developerName: string;
  createdAt: string;
  summary: string;
  reportUrl: string;
}

export interface Threat {
  id: string;
  name: string;
  severity: Severity;
  justification: string;
  attacks: string[];
  impacts: string[];
  controls: string[];
}

export interface AnalysisResult {
  context_summary: string;
  attack_surfaces: string[];
  risk_score: number;
  threats: Threat[];
}
