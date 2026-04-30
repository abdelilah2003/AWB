export type Severity = 'CRITIQUE' | 'ÉLEVÉ' | 'MOYEN' | 'FAIBLE';

export interface AnalysisSubmitPayload {
  app_name: string;
  app_description: string;
  questionnaire_code: string;
  answers: AnswersMap;
  dev_name?: string;
}


export type QuestionType =
  | 'boolean'
  | 'select'
  | 'text'
  | 'textarea'
  | 'multiselect';

export type AnswerValue = string | boolean | string[] | null;
export type AnswersMap = Record<string, AnswerValue>;

export interface BaseInfo {
  app_name: string;
  app_description: string;
  dev_name?: string;
}

export interface QuestionnaireStep {
  id: number;
  questionnaire_id?: number;
  code: string;
  title: string;
  step_order: number;
  questions?: Question[];
}

export interface QuestionOption {
  id: number;
  question_id: number;
  label: string;
  value: string;
  display_order: number;
}

export interface QuestionVisibilityRule {
  id: number;
  question_id: number;
  depends_on_question_id: number;
  operator: 'equals' | 'not_equals';
  expected_value: string;
  question_code?: string;
  depends_on_question_code?: string;
}

export interface Question {
  id: number;
  step_id: number;
  step_code?: string;
  code: string;
  label: string;
  help_text?: string | null;
  question_type: QuestionType;
  is_required: boolean;
  display_order: number;
  default_value?: string | null;
  is_active: boolean;
  backend_key: string;
  send_if_true_only: boolean;
  options?: QuestionOption[];
  visibility_rules?: QuestionVisibilityRule[];
}

export interface Questionnaire {
  id: number;
  code: string;
  name: string;
  version: number;
  status: string;
  is_active: boolean;
  steps: QuestionnaireStep[];
  questions: Question[];
}

export interface QuestionnaireListItem {
  id: number;
  code: string;
  name: string;
  version: number;
  status: string;
  is_active: boolean;
}

export interface QuestionnaireOptionInput {
  label: string;
  value: string;
  display_order: number;
}

export interface QuestionnaireVisibilityRuleInput {
  question_code: string;
  depends_on_question_code: string;
  operator: 'equals' | 'not_equals';
  expected_value: string;
}

export interface QuestionnaireQuestionInput {
  code: string;
  label: string;
  help_text?: string | null;
  question_type: QuestionType;
  is_required: boolean;
  display_order: number;
  default_value?: string | null;
  is_active: boolean;
  backend_key?: string | null;
  send_if_true_only: boolean;
  options: QuestionnaireOptionInput[];
  visibility_rules: QuestionnaireVisibilityRuleInput[];
}

export interface QuestionnaireStepInput {
  code: string;
  title: string;
  step_order: number;
  questions: QuestionnaireQuestionInput[];
}

export interface QuestionnaireUpsertPayload {
  code: string;
  name: string;
  version: number;
  status: string;
  is_active: boolean;
  steps: QuestionnaireStepInput[];
}

export interface CatalogMitigation {
  id_mitigation: number;
  id_menace: number;
  description_mitigation: string;
  conditions_mitigation?: string | null;
}

export interface CatalogScenario {
  id_scenario: number;
  id_menace: number;
  description_scenario: string;
  conditions_scenario?: string | null;
}

export interface CatalogReference {
  id_reference: number;
  reference_menace: string;
  nom_reference: string;
  lien?: string | null;
}

export interface CatalogThreat {
  id_menace: number;
  nom_menace: string;
  description?: string | null;
  reference_menace?: string | null;
  mitigations: CatalogMitigation[];
  scenarios: CatalogScenario[];
  references: CatalogReference[];
}

export interface CatalogThreatListItem {
  id_menace: number;
  nom_menace: string;
  description?: string | null;
  reference_menace?: string | null;
  mitigation_count: number;
  scenario_count: number;
  reference_count: number;
}

export interface CatalogMitigationInput {
  description_mitigation: string;
  conditions_mitigation?: string | null;
}

export interface CatalogScenarioInput {
  description_scenario: string;
  conditions_scenario?: string | null;
}

export interface CatalogReferenceInput {
  id_reference?: number | null;
  reference_menace: string;
  nom_reference: string;
  lien?: string | null;
}

export interface CatalogThreatUpsertPayload {
  nom_menace: string;
  description?: string | null;
  reference_menace?: string | null;
  mitigations: CatalogMitigationInput[];
  scenarios: CatalogScenarioInput[];
  references: CatalogReferenceInput[];
}

export interface AnalysisSubmitPayload {
  app_name: string;
  app_description: string;
  questionnaire_code: string;
  answers: AnswersMap;
  dev_name?: string;
}

export interface AnalysisHistoryItem {
  id: string;
  appName: string;
  developerName: string;
  createdAt: string;
  summary: string;
  reportUrl: string;
  status?: ReportStatus;
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

export interface SecOpsReport {
  id: string;
  appName: string;
  analystName: string;
  submittedAt: string;
  status: ReportStatus;
  reportUrl: string;
  summary: string;
  validatedBy?: string;
  validatedAt?: string;
  managerComment?: string;
  annotations?: string[];
}

export type ReportStatus =
  | 'DRAFT'
  | 'GENERATED'
  | 'PENDING_MANAGER_VALIDATION'
  | 'APPROVED'
  | 'REJECTED'
  | 'NEEDS_CHANGES';

export interface ReportAnnotation {
  id: string;
  annotation: string;
  created_by_username?: string | null;
  created_by_email?: string | null;
  created_at: string;
}

export interface ReportStatusHistoryEntry {
  id: string;
  old_status?: string | null;
  new_status: ReportStatus;
  changed_by_username?: string | null;
  changed_by_email?: string | null;
  comment?: string | null;
  changed_at: string;
}

export interface ReportRecord {
  id: string;
  title: string;
  app_name: string;
  description?: string | null;
  summary: string;
  file_name: string;
  file_type: string;
  file_size?: number | null;
  status: ReportStatus;
  report_url: string;
  generated_by: string;
  generated_by_username?: string | null;
  generated_by_email?: string | null;
  generated_at: string;
  validated_by?: string | null;
  validated_by_username?: string | null;
  validated_by_email?: string | null;
  validated_at?: string | null;
  annotations: ReportAnnotation[];
  status_history: ReportStatusHistoryEntry[];
}
