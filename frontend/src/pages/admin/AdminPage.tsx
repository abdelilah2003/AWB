import {
  BookOpen,
  Database,
  Edit3,
  LayoutDashboard,
  Link2,
  Plus,
  RefreshCw,
  Save,
  Settings2,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navbar } from '../../components/Navbar';
import { API_BASE_URL } from '../../config';
import type {
  CatalogMitigation,
  CatalogReference,
  CatalogScenario,
  CatalogThreat,
  CatalogThreatListItem,
  CatalogThreatUpsertPayload,
  Question,
  QuestionnaireListItem,
  Questionnaire,
  QuestionnaireStep,
  QuestionnaireUpsertPayload,
} from '../../types';

type AdminSection = 'dashboard' | 'catalog' | 'questionnaire' | 'connections';

interface AdminPageProps {
  currentUserName: string;
  onLogout: () => void;
}

type EditableStep = Omit<QuestionnaireStep, 'questions'> & {
  questions: Question[];
};

type EditableQuestionnaire = Omit<Questionnaire, 'steps' | 'questions'> & {
  steps: EditableStep[];
  questions: Question[];
};

type EditableCatalogThreat = CatalogThreat;

let tempEntityId = -1;

function createTempId() {
  tempEntityId -= 1;
  return tempEntityId;
}

function createEmptyOption(displayOrder: number) {
  return {
    id: createTempId(),
    question_id: createTempId(),
    label: `Option ${displayOrder}`,
    value: `option_${displayOrder}`,
    display_order: displayOrder,
  };
}

function createEmptyQuestion(stepId: number, displayOrder: number): Question {
  return {
    id: createTempId(),
    step_id: stepId,
    code: `question_${displayOrder}`,
    label: 'Nouvelle question',
    help_text: '',
    question_type: 'boolean',
    is_required: false,
    display_order: displayOrder,
    default_value: '',
    is_active: true,
    backend_key: '',
    send_if_true_only: false,
    options: [],
    visibility_rules: [],
  };
}

function createEmptyStep(stepOrder: number): EditableStep {
  return {
    id: createTempId(),
    questionnaire_id: undefined,
    code: `step_${stepOrder}`,
    title: `Étape ${stepOrder}`,
    step_order: stepOrder,
    questions: [],
  };
}

function createEmptyCatalogMitigation(threatId: number): CatalogMitigation {
  return {
    id_mitigation: createTempId(),
    id_menace: threatId,
    description_mitigation: 'Nouvelle mitigation',
    conditions_mitigation: '',
  };
}

function createEmptyCatalogScenario(threatId: number): CatalogScenario {
  return {
    id_scenario: createTempId(),
    id_menace: threatId,
    description_scenario: 'Nouveau scenario',
    conditions_scenario: '',
  };
}

function createEmptyCatalogReference(): CatalogReference {
  return {
    id_reference: createTempId(),
    reference_menace: '',
    nom_reference: '',
    lien: '',
  };
}

function createEmptyCatalogThreat(): EditableCatalogThreat {
  const threatId = createTempId();
  return {
    id_menace: threatId,
    nom_menace: 'Nouvelle menace',
    description: '',
    reference_menace: '',
    mitigations: [],
    scenarios: [],
    references: [],
  };
}

function decorateQuestionnaire(questionnaire: Questionnaire): EditableQuestionnaire {
  const questionsByStep = questionnaire.questions.reduce<Record<number, Question[]>>(
    (accumulator, question) => {
      if (!accumulator[question.step_id]) {
        accumulator[question.step_id] = [];
      }

      accumulator[question.step_id].push(question);
      return accumulator;
    },
    {}
  );

  return {
    ...questionnaire,
    steps: questionnaire.steps.map((step) => ({
      ...step,
      questions: [...(questionsByStep[step.id] ?? [])].sort(
        (left, right) => left.display_order - right.display_order
      ),
    })),
    questions: questionnaire.questions,
  };
}

function buildQuestionnairePayload(questionnaire: EditableQuestionnaire): QuestionnaireUpsertPayload {
  return {
    code: questionnaire.code,
    name: questionnaire.name,
    version: questionnaire.version,
    status: questionnaire.status,
    is_active: questionnaire.is_active,
    steps: questionnaire.steps
      .slice()
      .sort((left, right) => left.step_order - right.step_order)
      .map((step) => ({
        code: step.code,
        title: step.title,
        step_order: step.step_order,
        questions: (step.questions ?? [])
          .slice()
          .sort((left, right) => left.display_order - right.display_order)
          .map((question) => ({
            code: question.code,
            label: question.label,
            help_text: question.help_text ?? '',
            question_type: question.question_type,
            is_required: question.is_required,
            display_order: question.display_order,
            default_value: question.default_value ?? '',
            is_active: question.is_active,
            backend_key: question.backend_key ?? '',
            send_if_true_only: question.send_if_true_only,
            options: (question.options ?? [])
              .slice()
              .sort((left, right) => left.display_order - right.display_order)
              .map((option) => ({
                label: option.label,
                value: option.value,
                display_order: option.display_order,
              })),
            visibility_rules: (question.visibility_rules ?? []).map((rule) => ({
              question_code: rule.question_code ?? question.code,
              depends_on_question_code: rule.depends_on_question_code ?? '',
              operator: rule.operator,
              expected_value: rule.expected_value,
            })),
          })),
      })),
  };
}

function buildCatalogThreatPayload(threat: EditableCatalogThreat): CatalogThreatUpsertPayload {
  return {
    nom_menace: threat.nom_menace,
    description: threat.description ?? '',
    reference_menace: threat.reference_menace ?? '',
    mitigations: threat.mitigations
      .filter((mitigation) => mitigation.description_mitigation.trim().length > 0)
      .map((mitigation) => ({
        description_mitigation: mitigation.description_mitigation,
        conditions_mitigation: mitigation.conditions_mitigation ?? '',
      })),
    scenarios: threat.scenarios
      .filter((scenario) => scenario.description_scenario.trim().length > 0)
      .map((scenario) => ({
        description_scenario: scenario.description_scenario,
        conditions_scenario: scenario.conditions_scenario ?? '',
      })),
    references: threat.references
      .filter(
        (reference) =>
          reference.reference_menace.trim().length > 0 || reference.nom_reference.trim().length > 0
      )
      .map((reference) => ({
        id_reference: reference.id_reference,
        reference_menace: reference.reference_menace,
        nom_reference: reference.nom_reference,
        lien: reference.lien ?? '',
      })),
  };
}

function updateOptionInQuestion(question: Question, optionId: number, field: 'label' | 'value', value: string) {
  return {
    ...question,
    options: (question.options ?? []).map((option) =>
      option.id === optionId ? { ...option, [field]: value } : option
    ),
  };
}

function summarizeText(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim();
  if (!normalized) return fallback;
  if (normalized.length <= 72) return normalized;
  return `${normalized.slice(0, 69)}...`;
}

function updateVisibilityRuleInQuestion(
  question: Question,
  ruleIndex: number,
  field: 'depends_on_question_code' | 'operator' | 'expected_value',
  value: string
) {
  return {
    ...question,
    visibility_rules: (question.visibility_rules ?? []).map((rule, index) =>
      index === ruleIndex ? { ...rule, [field]: value } : rule
    ),
  };
}

export function AdminPage({ currentUserName, onLogout }: Readonly<AdminPageProps>) {
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [questionnaires, setQuestionnaires] = useState<QuestionnaireListItem[]>([]);
  const [catalogThreats, setCatalogThreats] = useState<CatalogThreatListItem[]>([]);
  const [selectedQuestionnaireId, setSelectedQuestionnaireId] = useState<number | null>(null);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<EditableQuestionnaire | null>(null);
  const [selectedCatalogThreatId, setSelectedCatalogThreatId] = useState<number | null>(null);
  const [selectedCatalogThreat, setSelectedCatalogThreat] = useState<EditableCatalogThreat | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<number | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);
  const [isLoadingQuestionnaires, setIsLoadingQuestionnaires] = useState(false);
  const [isLoadingQuestionnaire, setIsLoadingQuestionnaire] = useState(false);
  const [isLoadingCatalogThreats, setIsLoadingCatalogThreats] = useState(false);
  const [isLoadingCatalogThreat, setIsLoadingCatalogThreat] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingCatalogThreat, setIsSavingCatalogThreat] = useState(false);
  const [catalogStatusMessage, setCatalogStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const refreshQuestionnaires = async (preferredQuestionnaireId?: number | null) => {
    try {
      setIsLoadingQuestionnaires(true);
      setErrorMessage('');

      const response = await fetch(`${API_BASE_URL}/admin/questionnaires`);
      if (!response.ok) {
        throw new Error('Impossible de charger les questionnaires.');
      }

      const data = (await response.json()) as QuestionnaireListItem[];
      setQuestionnaires(data);
      if (typeof preferredQuestionnaireId === 'number') {
        setSelectedQuestionnaireId(preferredQuestionnaireId);
      } else if (data.length > 0 && selectedQuestionnaireId === null) {
        setSelectedQuestionnaireId(data[0].id);
      }
      if (data.length === 0) {
        setSelectedQuestionnaireId(null);
        setSelectedQuestionnaire(null);
        setSelectedStepId(null);
        setSelectedQuestionId(null);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Erreur de chargement.');
    } finally {
      setIsLoadingQuestionnaires(false);
    }
  };

  const refreshCatalogThreats = async (preferredThreatId?: number | null) => {
    try {
      setIsLoadingCatalogThreats(true);
      setErrorMessage('');

      const response = await fetch(`${API_BASE_URL}/admin/catalog/threats`);
      if (!response.ok) {
        throw new Error('Impossible de charger le catalogue des menaces.');
      }

      const data = (await response.json()) as CatalogThreatListItem[];
      setCatalogThreats(data);
      if (typeof preferredThreatId === 'number') {
        setSelectedCatalogThreatId(preferredThreatId);
      } else if (data.length > 0 && selectedCatalogThreatId === null) {
        setSelectedCatalogThreatId(data[0].id_menace);
      }

      if (data.length === 0) {
        setSelectedCatalogThreatId(null);
        setSelectedCatalogThreat(null);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Erreur de chargement.');
    } finally {
      setIsLoadingCatalogThreats(false);
    }
  };

  useEffect(() => {
    void refreshQuestionnaires();
    void refreshCatalogThreats();
  }, []);

  useEffect(() => {
    const loadQuestionnaire = async () => {
      if (selectedQuestionnaireId === null) {
        setSelectedQuestionnaire(null);
        setSelectedStepId(null);
        setSelectedQuestionId(null);
        return;
      }

      try {
        setIsLoadingQuestionnaire(true);
        setErrorMessage('');

        const response = await fetch(`${API_BASE_URL}/admin/questionnaires/${selectedQuestionnaireId}`);
        if (!response.ok) {
          throw new Error('Impossible de charger le questionnaire sélectionné.');
        }

        const data = (await response.json()) as Questionnaire;
        const decorated = decorateQuestionnaire(data);
        setSelectedQuestionnaire(decorated);
        setSelectedStepId(decorated.steps[0]?.id ?? null);
        setSelectedQuestionId(decorated.steps[0]?.questions[0]?.id ?? null);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Erreur de chargement.');
      } finally {
        setIsLoadingQuestionnaire(false);
      }
    };

    void loadQuestionnaire();
  }, [selectedQuestionnaireId]);

  useEffect(() => {
    const loadCatalogThreat = async () => {
      if (selectedCatalogThreatId === null) {
        setSelectedCatalogThreat(null);
        return;
      }

      try {
        setIsLoadingCatalogThreat(true);
        setErrorMessage('');

        const response = await fetch(`${API_BASE_URL}/admin/catalog/threats/${selectedCatalogThreatId}`);
        if (!response.ok) {
          throw new Error('Impossible de charger la menace selectionnee.');
        }

        const data = (await response.json()) as CatalogThreat;
        setSelectedCatalogThreat(data);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Erreur de chargement.');
      } finally {
        setIsLoadingCatalogThreat(false);
      }
    };

    void loadCatalogThreat();
  }, [selectedCatalogThreatId]);

  const selectedStep = useMemo(() => {
    if (!selectedQuestionnaire || selectedStepId === null) return null;
    return selectedQuestionnaire.steps.find((step) => step.id === selectedStepId) ?? null;
  }, [selectedQuestionnaire, selectedStepId]);

  const selectedQuestion = useMemo(() => {
    if (!selectedStep || selectedQuestionId === null) return null;
    return selectedStep.questions.find((question) => question.id === selectedQuestionId) ?? null;
  }, [selectedStep, selectedQuestionId]);

  const dashboardStats = useMemo(() => {
    const totalSteps = selectedQuestionnaire?.steps?.length ?? 0;
    const totalQuestions =
      selectedQuestionnaire?.questions?.filter((question) => question.is_active).length ?? 0;
    const activeQuestionnaires = questionnaires.filter((questionnaire) => questionnaire.is_active).length;

    return { totalSteps, totalQuestions, activeQuestionnaires };
  }, [questionnaires, selectedQuestionnaire]);

  const catalogDashboardStats = useMemo(() => {
    const totalThreats = catalogThreats.length;
    const totalScenarios = catalogThreats.reduce(
      (sum, threat) => sum + threat.scenario_count,
      0
    );
    const totalMitigations = catalogThreats.reduce(
      (sum, threat) => sum + threat.mitigation_count,
      0
    );
    const totalReferences = catalogThreats.reduce(
      (sum, threat) => sum + threat.reference_count,
      0
    );

    return { totalThreats, totalScenarios, totalMitigations, totalReferences };
  }, [catalogThreats]);

  const updateQuestionnaireField = <K extends keyof EditableQuestionnaire>(
    field: K,
    value: EditableQuestionnaire[K]
  ) => {
    setSelectedQuestionnaire((previous) =>
      previous ? { ...previous, [field]: value } : previous
    );
  };

  const updateCatalogThreatField = <K extends keyof EditableCatalogThreat>(
    field: K,
    value: EditableCatalogThreat[K]
  ) => {
    setSelectedCatalogThreat((previous) =>
      previous ? { ...previous, [field]: value } : previous
    );
  };

  const updateStep = (
    stepId: number,
    updater: (step: EditableStep) => EditableStep
  ) => {
    setSelectedQuestionnaire((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        steps: previous.steps.map((step) => (step.id === stepId ? updater(step) : step)),
      };
    });
  };

  const updateQuestion = (
    stepId: number,
    questionId: number,
    updater: (question: Question) => Question
  ) => {
    updateStep(stepId, (step) => ({
      ...step,
      questions: step.questions.map((question) => (question.id === questionId ? updater(question) : question)),
    }));
  };

  const updateCatalogMitigation = (
    mitigationId: number,
    updater: (mitigation: CatalogMitigation) => CatalogMitigation
  ) => {
    setSelectedCatalogThreat((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        mitigations: previous.mitigations.map((mitigation) =>
          mitigation.id_mitigation === mitigationId ? updater(mitigation) : mitigation
        ),
      };
    });
  };

  const updateCatalogScenario = (
    scenarioId: number,
    updater: (scenario: CatalogScenario) => CatalogScenario
  ) => {
    setSelectedCatalogThreat((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        scenarios: previous.scenarios.map((scenario) =>
          scenario.id_scenario === scenarioId ? updater(scenario) : scenario
        ),
      };
    });
  };

  const updateCatalogReference = (
    referenceId: number,
    updater: (reference: CatalogReference) => CatalogReference
  ) => {
    setSelectedCatalogThreat((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        references: previous.references.map((reference) =>
          reference.id_reference === referenceId ? updater(reference) : reference
        ),
      };
    });
  };

  const handleCreateQuestionnaire = () => {
    const draft: EditableQuestionnaire = {
      id: createTempId(),
      code: 'nouveau-questionnaire',
      name: 'Nouveau questionnaire',
      version: 1,
      status: 'draft',
      is_active: false,
      steps: [],
      questions: [],
    };

    setSelectedQuestionnaire(draft);
    setSelectedQuestionnaireId(null);
    setSelectedStepId(null);
    setSelectedQuestionId(null);
    setActiveSection('questionnaire');
  };

  const handleCreateCatalogThreat = () => {
    setSelectedCatalogThreat(createEmptyCatalogThreat());
    setSelectedCatalogThreatId(null);
    setCatalogStatusMessage('');
    setActiveSection('catalog');
  };

  const handleSelectQuestionnaire = async (questionnaireId: number) => {
    setSelectedQuestionnaireId(questionnaireId);
    setActiveSection('questionnaire');
  };

  const handleSelectCatalogThreat = (threatId: number) => {
    setSelectedCatalogThreatId(threatId);
    setCatalogStatusMessage('');
    setActiveSection('catalog');
  };

  const handleAddStep = () => {
    if (!selectedQuestionnaire) return;

    const nextOrder = selectedQuestionnaire.steps.length + 1;
    const newStep = createEmptyStep(nextOrder);
    const newQuestion = createEmptyQuestion(newStep.id, 1);
    newStep.questions.push(newQuestion);

    setSelectedQuestionnaire((previous) =>
      previous
        ? {
            ...previous,
            steps: [...previous.steps, newStep],
          }
        : previous
    );
    setSelectedStepId(newStep.id);
    setSelectedQuestionId(newQuestion.id);
  };

  const handleDeleteStep = (stepId: number) => {
    if (!selectedQuestionnaire) return;

    const nextSteps = selectedQuestionnaire.steps.filter((step) => step.id !== stepId);
    setSelectedQuestionnaire({
      ...selectedQuestionnaire,
      steps: nextSteps.map((step, index) => ({
        ...step,
        step_order: index + 1,
      })),
    });

    if (selectedStepId === stepId) {
      setSelectedStepId(nextSteps[0]?.id ?? null);
      setSelectedQuestionId(nextSteps[0]?.questions?.[0]?.id ?? null);
    }
  };

  const handleAddQuestion = () => {
    if (!selectedStep) return;

    const newQuestion = createEmptyQuestion(selectedStep.id, selectedStep.questions.length + 1);
    updateStep(selectedStep.id, (step) => ({
      ...step,
      questions: [...step.questions, newQuestion],
    }));
    setSelectedQuestionId(newQuestion.id);
  };

  const handleDeleteQuestion = (questionId: number) => {
    if (!selectedStep) return;

    const remainingQuestions = selectedStep.questions.filter((question) => question.id !== questionId);
    updateStep(selectedStep.id, (step) => ({
      ...step,
      questions: remainingQuestions.map((question, index) => ({
        ...question,
        display_order: index + 1,
      })),
    }));

    if (selectedQuestionId === questionId) {
      setSelectedQuestionId(remainingQuestions[0]?.id ?? null);
    }
  };

  const handleAddOption = () => {
    if (!selectedStep || !selectedQuestion) return;

    const nextOrder = (selectedQuestion.options?.length ?? 0) + 1;
    updateQuestion(selectedStep.id, selectedQuestion.id, (question) => ({
      ...question,
      options: [...(question.options ?? []), createEmptyOption(nextOrder)],
    }));
  };

  const handleDeleteOption = (optionId: number) => {
    if (!selectedStep || !selectedQuestion) return;

    updateQuestion(selectedStep.id, selectedQuestion.id, (question) => ({
      ...question,
      options: (question.options ?? [])
        .filter((option) => option.id !== optionId)
        .map((option, index) => ({
          ...option,
          display_order: index + 1,
        })),
    }));
  };

  const handleAddVisibilityRule = () => {
    if (!selectedStep || !selectedQuestion) return;

    const firstQuestionCode = selectedStep.questions[0]?.code ?? selectedQuestion.code;
    updateQuestion(selectedStep.id, selectedQuestion.id, (question) => ({
      ...question,
      visibility_rules: [
        ...(question.visibility_rules ?? []),
        {
          id: createTempId(),
          question_id: question.id,
          depends_on_question_id: createTempId(),
          operator: 'equals',
          expected_value: 'true',
          question_code: question.code,
          depends_on_question_code: firstQuestionCode,
        },
      ],
    }));
  };

  const handleAddCatalogMitigation = () => {
    if (!selectedCatalogThreat) return;

    setSelectedCatalogThreat((previous) =>
      previous
        ? {
            ...previous,
            mitigations: [...previous.mitigations, createEmptyCatalogMitigation(previous.id_menace)],
          }
        : previous
    );
  };

  const handleDeleteCatalogMitigation = (mitigationId: number) => {
    setSelectedCatalogThreat((previous) =>
      previous
        ? {
            ...previous,
            mitigations: previous.mitigations.filter((mitigation) => mitigation.id_mitigation !== mitigationId),
          }
        : previous
    );
  };

  const handleAddCatalogScenario = () => {
    if (!selectedCatalogThreat) return;

    setSelectedCatalogThreat((previous) =>
      previous
        ? {
            ...previous,
            scenarios: [...previous.scenarios, createEmptyCatalogScenario(previous.id_menace)],
          }
        : previous
    );
  };

  const handleDeleteCatalogScenario = (scenarioId: number) => {
    setSelectedCatalogThreat((previous) =>
      previous
        ? {
            ...previous,
            scenarios: previous.scenarios.filter((scenario) => scenario.id_scenario !== scenarioId),
          }
        : previous
    );
  };

  const handleAddCatalogReference = () => {
    setSelectedCatalogThreat((previous) =>
      previous
        ? {
            ...previous,
            references: [...previous.references, createEmptyCatalogReference()],
          }
        : previous
    );
  };

  const handleDeleteCatalogReference = (referenceId: number) => {
    setSelectedCatalogThreat((previous) =>
      previous
        ? {
            ...previous,
            references: previous.references.filter((reference) => reference.id_reference !== referenceId),
          }
        : previous
    );
  };

  const handleSave = async () => {
    if (!selectedQuestionnaire) return;

    try {
      setIsSaving(true);
      setErrorMessage('');

      const selectedStepCode = selectedStep?.code ?? null;
      const selectedQuestionCode = selectedQuestion?.code ?? null;
      const payload = buildQuestionnairePayload(selectedQuestionnaire);
      const isCreating = selectedQuestionnaireId === null;
      const response = await fetch(
        isCreating
          ? `${API_BASE_URL}/admin/questionnaires`
          : `${API_BASE_URL}/admin/questionnaires/${selectedQuestionnaireId}`,
        {
          method: isCreating ? 'POST' : 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.detail || 'Impossible d’enregistrer le questionnaire.');
      }

      const saved = decorateQuestionnaire((await response.json()) as Questionnaire);
      const savedSelectedStep =
        saved.steps.find((step) => step.code === selectedStepCode) ?? saved.steps[0] ?? null;
      const savedSelectedQuestion =
        savedSelectedStep?.questions?.find((question) => question.code === selectedQuestionCode) ??
        savedSelectedStep?.questions?.[0] ??
        null;

      setSelectedQuestionnaire(saved);
      setSelectedQuestionnaireId(saved.id);
      await refreshQuestionnaires(saved.id);
      setSelectedStepId(savedSelectedStep?.id ?? null);
      setSelectedQuestionId(savedSelectedQuestion?.id ?? null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteQuestionnaire = async () => {
    if (!selectedQuestionnaire || selectedQuestionnaireId === null) return;

    const confirmed = globalThis.confirm(`Supprimer le questionnaire ${selectedQuestionnaire.name} ?`);
    if (!confirmed) return;

    try {
      setIsSaving(true);
      const response = await fetch(`${API_BASE_URL}/admin/questionnaires/${selectedQuestionnaireId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Impossible de supprimer le questionnaire.');
      }

      setSelectedQuestionnaire(null);
      setSelectedQuestionnaireId(null);
      setSelectedStepId(null);
      setSelectedQuestionId(null);

      const nextQuestionnaireId = questionnaires.find(
        (questionnaire) => questionnaire.id !== selectedQuestionnaireId
      )?.id;
      await refreshQuestionnaires(nextQuestionnaireId ?? null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Erreur lors de la suppression.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCatalogThreat = async () => {
    if (!selectedCatalogThreat) return;

    try {
      setIsSavingCatalogThreat(true);
      setErrorMessage('');
      setCatalogStatusMessage('');

      const payload = buildCatalogThreatPayload(selectedCatalogThreat);
      const isCreating = selectedCatalogThreatId === null;
      const response = await fetch(
        isCreating
          ? `${API_BASE_URL}/admin/catalog/threats`
          : `${API_BASE_URL}/admin/catalog/threats/${selectedCatalogThreatId}`,
        {
          method: isCreating ? 'POST' : 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.detail || 'Impossible d’enregistrer la menace.');
      }

      const saved = (await response.json()) as CatalogThreat;
      setSelectedCatalogThreat(saved);
      setSelectedCatalogThreatId(saved.id_menace);
      await refreshCatalogThreats(saved.id_menace);
      setCatalogStatusMessage('Menace enregistree avec succes.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde.');
    } finally {
      setIsSavingCatalogThreat(false);
    }
  };

  const handleDeleteCatalogThreat = async () => {
    if (!selectedCatalogThreat || selectedCatalogThreatId === null) return;

    const confirmed = globalThis.confirm(`Supprimer la menace ${selectedCatalogThreat.nom_menace} ?`);
    if (!confirmed) return;

    try {
      setIsSavingCatalogThreat(true);
      setErrorMessage('');
      setCatalogStatusMessage('');

      const response = await fetch(`${API_BASE_URL}/admin/catalog/threats/${selectedCatalogThreatId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Impossible de supprimer la menace.');
      }

      const nextThreatId = catalogThreats.find((threat) => threat.id_menace !== selectedCatalogThreatId)?.id_menace;
      setSelectedCatalogThreat(null);
      setSelectedCatalogThreatId(null);
      await refreshCatalogThreats(nextThreatId ?? null);
      setCatalogStatusMessage('Menace supprimee.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Erreur lors de la suppression.');
    } finally {
      setIsSavingCatalogThreat(false);
    }
  };

  const handleTriggerCatalogRefresh = async () => {
    try {
      setIsSavingCatalogThreat(true);
      setErrorMessage('');
      setCatalogStatusMessage('');

      const response = await fetch(`${API_BASE_URL}/admin/catalog/threats/refresh`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Impossible de lancer la mise a jour du catalogue.');
      }

      const data = (await response.json()) as { message?: string };
      setCatalogStatusMessage(
        data.message ?? 'Le processus de mise a jour du catalogue a ete lance.'
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Erreur lors du lancement.');
    } finally {
      setIsSavingCatalogThreat(false);
    }
  };

  const questionnaireCount = questionnaires.length;
  const catalogThreatCount = catalogThreats.length;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar
        activeSection={activeSection}
        onNavigate={setActiveSection}
        onLogout={onLogout}
        isApiConnected
        isDemoMode={false}
        currentUserName={currentUserName}
        navItems={[
          { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { key: 'catalog', label: 'Catalogue', icon: Database },
          { key: 'questionnaire', label: 'Questionnaires', icon: BookOpen },
          { key: 'connections', label: 'Connexions', icon: Link2 },
        ]}
      />

      <main className="mx-auto max-w-[1400px] px-4 pb-12 pt-28 sm:px-6 lg:px-8">
        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm text-red-600 shadow-sm">
            {errorMessage}
          </div>
        )}

        {activeSection === 'dashboard' && (
          <>
            <AdminHeader
              eyebrow="Admin Workspace"
              title="Dashboard admin"
              description="Vue d’ensemble des questionnaires, étapes et questions gérées depuis PostgreSQL."
            />

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4 mb-6">
              <StatCard
                label="Questionnaires"
                value={String(questionnaireCount)}
                icon={<BookOpen />}
                tone="orange"
              />
              <StatCard
                label="Questions actives"
                value={String(dashboardStats.totalQuestions)}
                icon={<Database />}
                tone="slate"
              />
              <StatCard
                label="Questionnaires actifs"
                value={String(dashboardStats.activeQuestionnaires)}
                icon={<ShieldAlert />}
                tone="emerald"
              />
              <StatCard
                label="Menaces catalogue"
                value={String(catalogDashboardStats.totalThreats)}
                icon={<ShieldAlert />}
                tone="slate"
              />
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3 xl:grid-cols-4">
              <StatCard
                label="Total scenarios"
                value={String(catalogDashboardStats.totalScenarios)}
                icon={<Database />}
                tone="orange"
              />
              <StatCard
                label="Total mitigations"
                value={String(catalogDashboardStats.totalMitigations)}
                icon={<Settings2 />}
                tone="emerald"
              />
              <StatCard
                label="Total references"
                value={String(catalogDashboardStats.totalReferences)}
                icon={<Link2 />}
                tone="slate"
              />
              <StatCard
                label="Total etapes"
                value={String(dashboardStats.totalSteps)}
                icon={<BookOpen />}
                tone="orange"
              />
            </div>
          </>
        )}

        {activeSection === 'catalog' && (
          <>
            <AdminHeader
              eyebrow="Threat Catalog"
              title="Gestion du catalogue"
              description="Parcourez, corrigez et enrichissez le catalogue des menaces depuis PostgreSQL, avec un espace prepare pour la mise a jour automatique."
            />

            {catalogStatusMessage && (
              <div className="mb-6 rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-700 shadow-sm">
                {catalogStatusMessage}
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
              <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Menaces</h2>
                    <p className="text-sm text-slate-500">
                      {isLoadingCatalogThreats ? 'Chargement...' : `${catalogThreatCount} menace(s)`}
                    </p>
                  </div>

                  <button
                    onClick={handleCreateCatalogThreat}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white transition hover:bg-orange-600"
                    title="Ajouter une menace"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  {catalogThreats.map((threat) => (
                    <button
                      key={threat.id_menace}
                      onClick={() => handleSelectCatalogThreat(threat.id_menace)}
                      className={`w-full rounded-2xl px-4 py-3 text-left transition-all ${
                        selectedCatalogThreatId === threat.id_menace
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{threat.nom_menace}</p>
                          <p
                            className={`mt-1 text-xs ${
                              selectedCatalogThreatId === threat.id_menace ? 'text-slate-300' : 'text-slate-400'
                            }`}
                          >
                            {threat.reference_menace || 'Reference non definie'}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            selectedCatalogThreatId === threat.id_menace
                              ? 'bg-white/10 text-white'
                              : 'bg-white text-slate-500'
                          }`}
                        >
                          {threat.mitigation_count + threat.scenario_count + threat.reference_count}
                        </span>
                      </div>

                      <p
                        className={`mt-3 text-xs ${
                          selectedCatalogThreatId === threat.id_menace ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {summarizeText(threat.description, 'Aucune description pour cette menace.')}
                      </p>
                    </button>
                  ))}

                  {!isLoadingCatalogThreats && catalogThreats.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                      Aucune menace dans le catalogue.
                    </div>
                  )}
                </div>
              </aside>

              <section className="space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">
                        {selectedCatalogThreat?.nom_menace ?? 'Selectionnez une menace'}
                      </h2>
                      <p className="text-sm text-slate-500">
                        Gerez les descriptions, scenarios, mitigations et references associees.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={handleCreateCatalogThreat}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Plus className="h-4 w-4" />
                        Nouvelle menace
                      </button>

                      <button
                        onClick={handleTriggerCatalogRefresh}
                        disabled={isSavingCatalogThreat}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Lancer mise a jour
                      </button>

                      <button
                        onClick={handleSaveCatalogThreat}
                        disabled={!selectedCatalogThreat || isSavingCatalogThreat}
                        className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Save className="h-4 w-4" />
                        {isSavingCatalogThreat ? 'Enregistrement...' : 'Enregistrer'}
                      </button>

                      <button
                        onClick={handleDeleteCatalogThreat}
                        disabled={!selectedCatalogThreat || selectedCatalogThreatId === null || isSavingCatalogThreat}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>

                {isLoadingCatalogThreat && (
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
                    Chargement de la menace selectionnee...
                  </div>
                )}

                {selectedCatalogThreat && !isLoadingCatalogThreat && (
                  <>
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4">
                        <h3 className="text-xl font-bold text-slate-900">Fiche menace</h3>
                        <p className="text-sm text-slate-500">
                          Corrigez les metadonnees principales avant d’ajouter les details techniques.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Field
                          label="Nom de la menace"
                          value={selectedCatalogThreat.nom_menace}
                          onChange={(value) => updateCatalogThreatField('nom_menace', value)}
                        />
                        <Field
                          label="Reference principale"
                          value={selectedCatalogThreat.reference_menace ?? ''}
                          onChange={(value) => updateCatalogThreatField('reference_menace', value)}
                        />
                      </div>

                      <div className="mt-4">
                        <TextAreaField
                          label="Description"
                          value={selectedCatalogThreat.description ?? ''}
                          onChange={(value) => updateCatalogThreatField('description', value)}
                          rows={5}
                        />
                      </div>

                      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                        <MetricPill label="Mitigations" value={String(selectedCatalogThreat.mitigations.length)} />
                        <MetricPill label="Scenarios" value={String(selectedCatalogThreat.scenarios.length)} />
                        <MetricPill label="References" value={String(selectedCatalogThreat.references.length)} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-bold text-slate-900">Scenarios d’attaque</h3>
                            <p className="text-sm text-slate-500">
                              Decrivez comment la menace peut se materialiser.
                            </p>
                          </div>

                          <button
                            onClick={handleAddCatalogScenario}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            <Plus className="h-4 w-4" />
                            Ajouter
                          </button>
                        </div>

                        <div className="space-y-4">
                          {selectedCatalogThreat.scenarios.map((scenario) => (
                            <div key={scenario.id_scenario} className="rounded-2xl border border-slate-200 p-4">
                              <div className="grid grid-cols-1 gap-4">
                                <TextAreaField
                                  label="Description"
                                  value={scenario.description_scenario}
                                  onChange={(value) =>
                                    updateCatalogScenario(scenario.id_scenario, (current) => ({
                                      ...current,
                                      description_scenario: value,
                                    }))
                                  }
                                  rows={3}
                                />
                                <TextAreaField
                                  label="Conditions"
                                  value={scenario.conditions_scenario ?? ''}
                                  onChange={(value) =>
                                    updateCatalogScenario(scenario.id_scenario, (current) => ({
                                      ...current,
                                      conditions_scenario: value,
                                    }))
                                  }
                                  rows={2}
                                />
                              </div>

                              <div className="mt-3 flex justify-end">
                                <button
                                  onClick={() => handleDeleteCatalogScenario(scenario.id_scenario)}
                                  className="rounded-lg p-2 text-red-500 transition hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}

                          {selectedCatalogThreat.scenarios.length === 0 && (
                            <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                              Aucun scenario defini.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-bold text-slate-900">Mesures de mitigation</h3>
                            <p className="text-sm text-slate-500">
                              Ajoutez les controles ou actions de reduction du risque.
                            </p>
                          </div>

                          <button
                            onClick={handleAddCatalogMitigation}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            <Plus className="h-4 w-4" />
                            Ajouter
                          </button>
                        </div>

                        <div className="space-y-4">
                          {selectedCatalogThreat.mitigations.map((mitigation) => (
                            <div key={mitigation.id_mitigation} className="rounded-2xl border border-slate-200 p-4">
                              <div className="grid grid-cols-1 gap-4">
                                <TextAreaField
                                  label="Description"
                                  value={mitigation.description_mitigation}
                                  onChange={(value) =>
                                    updateCatalogMitigation(mitigation.id_mitigation, (current) => ({
                                      ...current,
                                      description_mitigation: value,
                                    }))
                                  }
                                  rows={3}
                                />
                                <TextAreaField
                                  label="Conditions"
                                  value={mitigation.conditions_mitigation ?? ''}
                                  onChange={(value) =>
                                    updateCatalogMitigation(mitigation.id_mitigation, (current) => ({
                                      ...current,
                                      conditions_mitigation: value,
                                    }))
                                  }
                                  rows={2}
                                />
                              </div>

                              <div className="mt-3 flex justify-end">
                                <button
                                  onClick={() => handleDeleteCatalogMitigation(mitigation.id_mitigation)}
                                  className="rounded-lg p-2 text-red-500 transition hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}

                          {selectedCatalogThreat.mitigations.length === 0 && (
                            <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                              Aucune mitigation definie.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">References associees</h3>
                          <p className="text-sm text-slate-500">
                            Liez des sources comme CWE, OWASP ou d’autres bases documentaires.
                          </p>
                        </div>

                        <button
                          onClick={handleAddCatalogReference}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <Plus className="h-4 w-4" />
                          Ajouter reference
                        </button>
                      </div>

                      <div className="space-y-4">
                        {selectedCatalogThreat.references.map((reference) => (
                          <div key={reference.id_reference} className="rounded-2xl border border-slate-200 p-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              <Field
                                label="Code reference"
                                value={reference.reference_menace}
                                onChange={(value) =>
                                  updateCatalogReference(reference.id_reference, (current) => ({
                                    ...current,
                                    reference_menace: value,
                                  }))
                                }
                              />
                              <Field
                                label="Nom de la source"
                                value={reference.nom_reference}
                                onChange={(value) =>
                                  updateCatalogReference(reference.id_reference, (current) => ({
                                    ...current,
                                    nom_reference: value,
                                  }))
                                }
                              />
                              <div className="md:col-span-2">
                                <Field
                                  label="Lien"
                                  value={reference.lien ?? ''}
                                  onChange={(value) =>
                                    updateCatalogReference(reference.id_reference, (current) => ({
                                      ...current,
                                      lien: value,
                                    }))
                                  }
                                />
                              </div>
                            </div>

                            <div className="mt-3 flex justify-end">
                              <button
                                onClick={() => handleDeleteCatalogReference(reference.id_reference)}
                                className="rounded-lg p-2 text-red-500 transition hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}

                        {selectedCatalogThreat.references.length === 0 && (
                          <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                            Aucune reference associee.
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </section>
            </div>
          </>
        )}

        {activeSection === 'questionnaire' && (
          <>
            <AdminHeader
              eyebrow="Questionnaire Builder"
              title="Gestion du questionnaire"
              description="Le contenu est chargé depuis la base PostgreSQL et modifiable sans mock local."
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
              <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Questionnaires</h2>
                    <p className="text-sm text-slate-500">
                      {isLoadingQuestionnaires ? 'Chargement...' : `${questionnaireCount} élément(s)`}
                    </p>
                  </div>

                  <button
                    onClick={handleCreateQuestionnaire}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white transition hover:bg-slate-700"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  {questionnaires.map((questionnaire) => (
                    <button
                      key={questionnaire.id}
                      onClick={() => void handleSelectQuestionnaire(questionnaire.id)}
                      className={`w-full rounded-2xl border p-4 text-left transition-all ${
                        selectedQuestionnaireId === questionnaire.id
                          ? 'border-orange-300 bg-orange-50'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="font-semibold text-slate-900">{questionnaire.name}</span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            questionnaire.is_active
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {questionnaire.is_active ? 'Actif' : 'Brouillon'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500">
                        {questionnaire.code} · v{questionnaire.version} · {questionnaire.status}
                      </p>
                    </button>
                  ))}

                  {!isLoadingQuestionnaires && questionnaires.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                      Aucun questionnaire trouvé.
                    </div>
                  )}
                </div>
              </aside>

              <section className="space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div className="max-w-3xl">
                      <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                        <BookOpen className="h-3.5 w-3.5" />
                        Questionnaire PostgreSQL
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Field
                          label="Code"
                          value={selectedQuestionnaire?.code ?? ''}
                          onChange={(value) => updateQuestionnaireField('code', value)}
                          disabled={!selectedQuestionnaire}
                        />
                        <Field
                          label="Nom"
                          value={selectedQuestionnaire?.name ?? ''}
                          onChange={(value) => updateQuestionnaireField('name', value)}
                          disabled={!selectedQuestionnaire}
                        />
                        <Field
                          label="Version"
                          value={selectedQuestionnaire ? String(selectedQuestionnaire.version) : ''}
                          onChange={(value) =>
                            updateQuestionnaireField('version', Number.parseInt(value || '0', 10) || 1)
                          }
                          disabled={!selectedQuestionnaire}
                        />
                        <Field
                          label="Statut"
                          value={selectedQuestionnaire?.status ?? ''}
                          onChange={(value) => updateQuestionnaireField('status', value)}
                          disabled={!selectedQuestionnaire}
                        />
                      </div>

                      <label className="mt-4 flex items-center gap-3 text-sm font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={selectedQuestionnaire?.is_active ?? false}
                          onChange={(event) => updateQuestionnaireField('is_active', event.target.checked)}
                          disabled={!selectedQuestionnaire}
                          className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                        />
                        {' '}
                        Questionnaire actif
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleSave}
                        disabled={!selectedQuestionnaire || isSaving}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Save className="h-4 w-4" />
                        {isSaving ? 'Sauvegarde...' : 'Enregistrer'}
                      </button>

                      <button
                        onClick={handleDeleteQuestionnaire}
                        disabled={!selectedQuestionnaire || selectedQuestionnaireId === null || isSaving}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>

                {isLoadingQuestionnaire && (
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
                    Chargement du questionnaire sélectionné...
                  </div>
                )}

                {selectedQuestionnaire && !isLoadingQuestionnaire && (
                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-[280px_1fr]">
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="font-bold text-slate-900">Étapes</h3>
                        <button
                          onClick={handleAddStep}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="space-y-2">
                        {selectedQuestionnaire.steps.map((step) => (
                          <div key={step.id} className="flex gap-2">
                            <button
                              onClick={() => {
                                setSelectedStepId(step.id);
                                setSelectedQuestionId(step.questions?.[0]?.id ?? null);
                              }}
                              className={`flex-1 rounded-2xl px-4 py-3 text-left transition-all ${
                                selectedStepId === step.id
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <p className="text-sm font-semibold">{step.title}</p>
                              <p className={`mt-1 text-xs ${selectedStepId === step.id ? 'text-slate-300' : 'text-slate-400'}`}>
                                ordre {step.step_order}
                              </p>
                            </button>

                            <button
                              onClick={() => handleDeleteStep(step.id)}
                              className="rounded-2xl border border-slate-200 bg-white px-3 text-slate-500 transition hover:bg-slate-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}

                        {selectedQuestionnaire.steps.length === 0 && (
                          <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                            Aucune étape.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <h3 className="text-xl font-bold text-slate-900">
                              {selectedStep?.title ?? 'Sélectionnez une étape'}
                            </h3>
                            <p className="text-sm text-slate-500">Questions et options dynamiques.</p>
                          </div>

                          <button
                            onClick={handleAddQuestion}
                            disabled={!selectedStep}
                            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Plus className="h-4 w-4" />
                            Ajouter question
                          </button>
                        </div>

                        {selectedStep && (
                          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Field
                              label="Nom de l'étape"
                              value={selectedStep.title}
                              onChange={(value) =>
                                updateStep(selectedStep.id, (step) => ({
                                  ...step,
                                  title: value,
                                }))
                              }
                            />
                            <Field
                              label="Code étape"
                              value={selectedStep.code}
                              onChange={(value) =>
                                updateStep(selectedStep.id, (step) => ({
                                  ...step,
                                  code: value,
                                }))
                              }
                            />
                          </div>
                        )}

                        <div className="overflow-hidden rounded-2xl border border-slate-200">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                              <tr>
                                <th className="px-4 py-3">Ordre</th>
                                <th className="px-4 py-3">Question</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3">Required</th>
                                <th className="px-4 py-3">Options</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                              </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100 bg-white">
                              {(selectedStep?.questions ?? []).map((question) => (
                                <tr key={question.id} className="hover:bg-slate-50/70">
                                  <td className="px-4 py-4 font-mono text-slate-500">
                                    {question.display_order}
                                  </td>

                                  <td className="px-4 py-4">
                                    <button
                                      onClick={() => setSelectedQuestionId(question.id)}
                                      className="text-left"
                                    >
                                      <p className="font-semibold text-slate-900">{question.label}</p>
                                      <p className="mt-1 font-mono text-xs text-slate-400">
                                        {question.code}
                                      </p>
                                    </button>
                                  </td>

                                  <td className="px-4 py-4">
                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                      {question.question_type}
                                    </span>
                                  </td>

                                  <td className="px-4 py-4">
                                    {question.is_required ? (
                                      <span className="font-semibold text-emerald-600">Oui</span>
                                    ) : (
                                      <span className="text-slate-400">Non</span>
                                    )}
                                  </td>

                                  <td className="px-4 py-4 text-slate-500">
                                    {(question.options ?? []).length}
                                  </td>

                                  <td className="px-4 py-4">
                                    <div className="flex justify-end gap-2">
                                      <button
                                        onClick={() => setSelectedQuestionId(question.id)}
                                        className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
                                      >
                                        <Settings2 className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => setSelectedQuestionId(question.id)}
                                        className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
                                      >
                                        <Edit3 className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteQuestion(question.id)}
                                        className="rounded-lg p-2 text-red-500 transition hover:bg-red-50"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}

                              {(selectedStep?.questions ?? []).length === 0 && (
                                <tr>
                                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                                    Aucune question dans cette étape.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {selectedQuestion && selectedStep && (
                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                              <h3 className="text-xl font-bold text-slate-900">Éditeur de question</h3>
                              <p className="text-sm text-slate-500">
                                Modifiez le libellé, le type, les options et les règles de visibilité.
                              </p>
                            </div>

                            <button
                              onClick={handleAddVisibilityRule}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              <Plus className="h-4 w-4" />
                              Ajouter règle
                            </button>
                          </div>

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Field
                              label="Code"
                              value={selectedQuestion.code}
                              onChange={(value) =>
                                updateQuestion(selectedStep.id, selectedQuestion.id, (question) => ({
                                  ...question,
                                  code: value,
                                }))
                              }
                            />
                            <Field
                              label="Libellé"
                              value={selectedQuestion.label}
                              onChange={(value) =>
                                updateQuestion(selectedStep.id, selectedQuestion.id, (question) => ({
                                  ...question,
                                  label: value,
                                }))
                              }
                            />
                            <Field
                              label="Aide"
                              value={selectedQuestion.help_text ?? ''}
                              onChange={(value) =>
                                updateQuestion(selectedStep.id, selectedQuestion.id, (question) => ({
                                  ...question,
                                  help_text: value,
                                }))
                              }
                            />
                            <Field
                              label="Backend key"
                              value={selectedQuestion.backend_key ?? ''}
                              onChange={(value) =>
                                updateQuestion(selectedStep.id, selectedQuestion.id, (question) => ({
                                  ...question,
                                  backend_key: value,
                                }))
                              }
                            />
                            <Field
                              label="Type"
                              value={selectedQuestion.question_type}
                              onChange={(value) =>
                                updateQuestion(selectedStep.id, selectedQuestion.id, (question) => ({
                                  ...question,
                                  question_type: value as Question['question_type'],
                                }))
                              }
                              options={['boolean', 'select', 'text', 'textarea', 'multiselect']}
                            />
                            <Field
                              label="Ordre"
                              value={String(selectedQuestion.display_order)}
                              onChange={(value) =>
                                updateQuestion(selectedStep.id, selectedQuestion.id, (question) => ({
                                  ...question,
                                  display_order: Number.parseInt(value || '0', 10) || 1,
                                }))
                              }
                            />
                          </div>

                          <div className="mt-4 flex flex-wrap gap-4">
                            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                              <input
                                type="checkbox"
                                checked={selectedQuestion.is_required}
                                onChange={(event) =>
                                  updateQuestion(selectedStep.id, selectedQuestion.id, (question) => ({
                                    ...question,
                                    is_required: event.target.checked,
                                  }))
                                }
                                className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                              />
                              {' '}
                              Obligatoire
                            </label>

                            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                              <input
                                type="checkbox"
                                checked={selectedQuestion.is_active}
                                onChange={(event) =>
                                  updateQuestion(selectedStep.id, selectedQuestion.id, (question) => ({
                                    ...question,
                                    is_active: event.target.checked,
                                  }))
                                }
                                className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                              />
                              {' '}
                              Active
                            </label>

                            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                              <input
                                type="checkbox"
                                checked={selectedQuestion.send_if_true_only}
                                onChange={(event) =>
                                  updateQuestion(selectedStep.id, selectedQuestion.id, (question) => ({
                                    ...question,
                                    send_if_true_only: event.target.checked,
                                  }))
                                }
                                className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                              />
                              {' '}
                              Envoyer uniquement si vrai
                            </label>
                          </div>

                          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                            <div>
                              <div className="mb-3 flex items-center justify-between">
                                <h4 className="font-semibold text-slate-900">Options</h4>
                                <button
                                  onClick={handleAddOption}
                                  disabled={selectedQuestion.question_type === 'boolean'}
                                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Ajouter
                                </button>
                              </div>

                              <div className="space-y-3">
                                {(selectedQuestion.options ?? []).map((option) => (
                                  <div
                                    key={option.id}
                                    className="grid grid-cols-[1fr_1fr_auto] gap-2 rounded-2xl border border-slate-200 p-3"
                                  >
                                    <input
                                      value={option.label}
                                      onChange={(event) =>
                                        updateQuestion(selectedStep.id, selectedQuestion.id, (question) =>
                                          updateOptionInQuestion(question, option.id, 'label', event.target.value)
                                        )
                                      }
                                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                                      placeholder="Libellé"
                                    />
                                    <input
                                      value={option.value}
                                      onChange={(event) =>
                                        updateQuestion(selectedStep.id, selectedQuestion.id, (question) =>
                                          updateOptionInQuestion(question, option.id, 'value', event.target.value)
                                        )
                                      }
                                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                                      placeholder="Valeur"
                                    />
                                    <button
                                      onClick={() => handleDeleteOption(option.id)}
                                      className="rounded-lg px-2 text-red-500 transition hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                ))}

                                {(selectedQuestion.options ?? []).length === 0 && (
                                  <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                                    Aucune option définie.
                                  </p>
                                )}
                              </div>
                            </div>

                            <div>
                              <div className="mb-3 flex items-center justify-between">
                                <h4 className="font-semibold text-slate-900">Règles de visibilité</h4>
                              </div>

                              <div className="space-y-3">
                                {(selectedQuestion.visibility_rules ?? []).map((rule, index) => (
                                  <div key={rule.id ?? index} className="rounded-2xl border border-slate-200 p-3">
                                    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                                      <Field
                                        label="Question dépendante"
                                        value={rule.depends_on_question_code ?? ''}
                                        onChange={(value) =>
                                          updateQuestion(selectedStep.id, selectedQuestion.id, (question) =>
                                            updateVisibilityRuleInQuestion(
                                              question,
                                              index,
                                              'depends_on_question_code',
                                              value
                                            )
                                          )
                                        }
                                      />
                                      <Field
                                        label="Opérateur"
                                        value={rule.operator}
                                        onChange={(value) =>
                                          updateQuestion(selectedStep.id, selectedQuestion.id, (question) =>
                                            updateVisibilityRuleInQuestion(
                                              question,
                                              index,
                                              'operator',
                                              value
                                            )
                                          )
                                        }
                                        options={['equals', 'not_equals']}
                                      />
                                      <Field
                                        label="Valeur attendue"
                                        value={rule.expected_value}
                                        onChange={(value) =>
                                          updateQuestion(selectedStep.id, selectedQuestion.id, (question) =>
                                            updateVisibilityRuleInQuestion(
                                              question,
                                              index,
                                              'expected_value',
                                              value
                                            )
                                          )
                                        }
                                      />
                                    </div>
                                  </div>
                                ))}

                                {(selectedQuestion.visibility_rules ?? []).length === 0 && (
                                  <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                                    Aucune règle de visibilité.
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </div>
          </>
        )}

        {activeSection !== 'dashboard' && activeSection !== 'questionnaire' && activeSection !== 'catalog' && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-2xl font-bold text-slate-900">Section en construction</h2>
            <p className="text-slate-500">
              Cette section sera branchée dans une prochaine itération.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function AdminHeader({
  eyebrow,
  title,
  description,
}: Readonly<{
  eyebrow: string;
  title: string;
  description: string;
}>) {
  return (
    <div className="mb-10">
      <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
        <ShieldAlert className="h-4 w-4 text-orange-500" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {eyebrow}
        </span>
      </div>

      <h1 className="mb-3 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
        {title}
      </h1>

      <p className="max-w-3xl text-base leading-relaxed text-slate-500 md:text-lg">
        {description}
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: Readonly<{
  label: string;
  value: string;
  icon: ReactNode;
  tone: 'orange' | 'slate' | 'emerald';
}>) {
  const tones = {
    orange: 'bg-orange-100 text-orange-700',
    slate: 'bg-slate-900 text-white',
    emerald: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
      <div className="mb-6 flex items-center justify-between">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tones[tone]}`}>
          {icon}
        </div>
      </div>

      <p className="mb-1 text-sm font-medium text-slate-500">{label}</p>
      <p className="text-4xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  options,
  disabled,
}: Readonly<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  options?: string[];
  disabled?: boolean;
}>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {options ? (
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-orange-400 focus:outline-none disabled:bg-slate-50"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-orange-400 focus:outline-none disabled:bg-slate-50"
        />
      )}
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 4,
}: Readonly<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-orange-400 focus:outline-none"
      />
    </label>
  );
}

function MetricPill({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
