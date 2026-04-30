import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Scan } from 'lucide-react';
import { Stepper } from './Stepper';
import { ToggleCard } from './ToggleCard';
import type {
  AnswerValue,
  AnswersMap,
  BaseInfo,
  Question,
  Questionnaire,
  QuestionnaireStep,
  AnalysisSubmitPayload,
} from '../types';

const API_BASE_URL = 'http://localhost:8000';

interface FormViewProps {
  onSubmit: (data: AnalysisSubmitPayload) => void;
}

export function FormView({ onSubmit }: Readonly<FormViewProps>) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [isLoadingQuestionnaire, setIsLoadingQuestionnaire] = useState(true);
  const [questionnaireError, setQuestionnaireError] = useState('');

  const [baseInfo, setBaseInfo] = useState<BaseInfo>({
    app_name: '',
    app_description: '',
    dev_name: '',
  });

  const [answers, setAnswers] = useState<AnswersMap>({});

  useEffect(() => {
    const loadQuestionnaire = async () => {
      try {
        setIsLoadingQuestionnaire(true);
        setQuestionnaireError('');

        const response = await fetch(`${API_BASE_URL}/questionnaires/active`);

        if (!response.ok) {
          throw new Error('Impossible de charger le questionnaire.');
        }

        const data: Questionnaire = await response.json();
        setQuestionnaire(data);
      } catch (error) {
        setQuestionnaireError(
          error instanceof Error ? error.message : 'Erreur de chargement.'
        );
      } finally {
        setIsLoadingQuestionnaire(false);
      }
    };

    loadQuestionnaire();
  }, []);

  const sortedSteps = useMemo(() => {
    if (!questionnaire) return [];
    return [...questionnaire.steps].sort((a, b) => a.step_order - b.step_order);
  }, [questionnaire]);

  const sortedQuestions = useMemo(() => {
    if (!questionnaire) return [];
    return [...questionnaire.questions].sort((a, b) => {
      if (a.step_id !== b.step_id) return a.step_id - b.step_id;
      return a.display_order - b.display_order;
    });
  }, [questionnaire]);

  const currentStep: QuestionnaireStep | null =
    sortedSteps[currentStepIndex] ?? null;

  const getQuestionById = (questionId: number) =>
    sortedQuestions.find((q) => q.id === questionId);

  const isYesNoQuestion = (question: Question) =>
    question.options?.length === 2 &&
    question.options.some((option) => option.value === 'YES') &&
    question.options.some((option) => option.value === 'NO');

  const normalizeExpectedValue = (value: string): AnswerValue => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  };
const isQuestionVisible = (question: Question): boolean => {
  if (!question.visibility_rules || question.visibility_rules.length === 0) {
    return true;
  }

  const groups = new Map<number, typeof question.visibility_rules>();

  question.visibility_rules.forEach((rule) => {
    const key = rule.depends_on_question_id;
    groups.set(key, [...(groups.get(key) ?? []), rule]);
  });

  return Array.from(groups.entries()).every(([dependsOnQuestionId, rules]) => {
    const dependsOnQuestion = getQuestionById(dependsOnQuestionId);
    if (!dependsOnQuestion) return true;

    let actualValue = answers[dependsOnQuestion.code];

    if (isYesNoQuestion(dependsOnQuestion) && actualValue === undefined) {
      actualValue = 'NO';
    }

    return rules.some((rule) => {
      const expectedValue = normalizeExpectedValue(rule.expected_value);
      const operator = rule.operator.toLowerCase();

      if (operator === 'equals') return actualValue === expectedValue;
      if (operator === 'not_equals') return actualValue !== expectedValue;

      if (operator === 'contains') {
        if (Array.isArray(actualValue)) return actualValue.includes(expectedValue);
        return actualValue === expectedValue;
      }

      return false;
    });
  });
};
  const visibleQuestionsForCurrentStep = useMemo(() => {
    if (!currentStep) return [];

    return sortedQuestions.filter(
      (question) =>
        question.step_id === currentStep.id &&
        question.is_active &&
        isQuestionVisible(question)
    );
  }, [sortedQuestions, currentStep, answers]);

  const updateBaseInfo = (field: keyof BaseInfo, value: string) => {
    setBaseInfo((prev) => ({ ...prev, [field]: value }));
  };

  const updateAnswer = (questionCode: string, value: AnswerValue) => {
    setAnswers((prev) => ({
      ...prev,
      [questionCode]: value,
    }));
  };

  const buildAnswersWithDefaultNo = () => {
    const nextAnswers = { ...answers };

    visibleQuestionsForCurrentStep.forEach((question) => {
      if (isYesNoQuestion(question) && nextAnswers[question.code] === undefined) {
        nextAnswers[question.code] = 'NO';
      }
    });

    return nextAnswers;
  };

  const canProceed = () => {
    if (currentStepIndex === 0) {
      return (
        baseInfo.app_name.trim() !== '' &&
        baseInfo.app_description.trim() !== ''
      );
    }

    return visibleQuestionsForCurrentStep.some((question) => {
      if (!question.is_required) return true;

      if (isYesNoQuestion(question)) {
        return true;
      }

      const value = answers[question.code];

      if (question.question_type === 'boolean') {
        return typeof value === 'boolean';
      }

      if (question.question_type === 'multiselect') {
        return Array.isArray(value) && value.length > 0;
      }

      return value !== null && value !== undefined && value !== '';
    });
  };

  const handleNext = () => {
    if (!canProceed()) return;

    setAnswers(buildAnswersWithDefaultNo());

    if (currentStepIndex < sortedSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = () => {
    if (!questionnaire || !canProceed()) return;

    const finalAnswers = buildAnswersWithDefaultNo();

    const payload: AnalysisSubmitPayload = {
      app_name: baseInfo.app_name,
      app_description: baseInfo.app_description,
      dev_name: baseInfo.dev_name,
      questionnaire_code: questionnaire.code,
      answers: finalAnswers,
    };

    console.log("🚀 PAYLOAD ENVOYÉ :", payload);

    onSubmit(payload);
  };

  const renderQuestion = (question: Question) => {
    const value = answers[question.code];

    switch (question.question_type) {
      case 'boolean':
        return (
          <ToggleCard
            label={question.label}
            description={question.help_text ?? ''}
            checked={Boolean(value)}
            onChange={(checked) => updateAnswer(question.code, checked)}
          />
        );

      case 'select': {
        if (isYesNoQuestion(question)) {
          return (
            <ToggleCard
              label={question.label}
              description={question.help_text ?? ''}
              checked={value === 'YES'}
              onChange={(checked) =>
                updateAnswer(question.code, checked ? 'YES' : 'NO')
              }
            />
          );
        }

        return (
          <div className="space-y-3">
            <div>
              <label className="block font-sans text-sm font-semibold text-text-primary">
                {question.label}
              </label>
              {question.help_text && (
                <p className="font-sans text-xs text-text-secondary mt-1">
                  {question.help_text}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {question.options?.map((option) => {
                const selected = value === option.value;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => updateAnswer(question.code, option.value)}
                    className={[
                      'flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all',
                      'bg-white hover:border-accent-primary hover:shadow-sm',
                      selected
                        ? 'border-accent-primary ring-2 ring-accent-primary/20'
                        : 'border-border-subtle',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                        selected
                          ? 'border-accent-primary bg-accent-primary'
                          : 'border-border-subtle bg-white',
                      ].join(' ')}
                    >
                      {selected && (
                        <span className="h-2 w-2 rounded-sm bg-white" />
                      )}
                    </span>

                    <span className="font-sans text-sm font-semibold text-text-primary">
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      }

      case 'multiselect': {
        const selectedValues = Array.isArray(value) ? value : [];

        return (
          <div className="space-y-3">
            <div>
              <label className="block font-sans text-sm font-semibold text-text-primary">
                {question.label}
              </label>
              {question.help_text && (
                <p className="font-sans text-xs text-text-secondary mt-1">
                  {question.help_text}
                </p>
              )}
              <p className="font-sans text-xs text-text-secondary mt-1">
                Sélection multiple possible
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {question.options?.map((option) => {
                const selected = selectedValues.includes(option.value);

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      const nextValues = selected
                        ? selectedValues.filter((item) => item !== option.value)
                        : [...selectedValues, option.value];

                      updateAnswer(question.code, nextValues);
                    }}
                    className={[
                      'flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all',
                      'bg-white hover:border-accent-primary hover:shadow-sm',
                      selected
                        ? 'border-accent-primary ring-2 ring-accent-primary/20'
                        : 'border-border-subtle',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                        selected
                          ? 'border-accent-primary bg-accent-primary'
                          : 'border-border-subtle bg-white',
                      ].join(' ')}
                    >
                      {selected && (
                        <span className="h-2 w-2 rounded-sm bg-white" />
                      )}
                    </span>

                    <span className="font-sans text-sm font-semibold text-text-primary">
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      }

      case 'text':
        return (
          <div className="space-y-2">
            <label className="block font-sans text-sm font-semibold text-text-primary">
              {question.label}
            </label>
            {question.help_text && (
              <p className="font-sans text-xs text-text-secondary">
                {question.help_text}
              </p>
            )}
            <input
              type="text"
              value={typeof value === 'string' ? value : ''}
              onChange={(e) => updateAnswer(question.code, e.target.value)}
              className="w-full bg-bg-card border border-border-subtle rounded-lg px-4 py-2.5 text-text-primary text-sm font-sans placeholder-text-secondary focus:outline-none focus:border-accent-primary transition-colors"
            />
          </div>
        );

      case 'textarea':
        return (
          <div className="space-y-2">
            <label className="block font-sans text-sm font-semibold text-text-primary">
              {question.label}
            </label>
            {question.help_text && (
              <p className="font-sans text-xs text-text-secondary">
                {question.help_text}
              </p>
            )}
            <textarea
              rows={4}
              value={typeof value === 'string' ? value : ''}
              onChange={(e) => updateAnswer(question.code, e.target.value)}
              className="w-full bg-bg-card border border-border-subtle rounded-lg px-4 py-2.5 text-text-primary text-sm font-sans placeholder-text-secondary focus:outline-none focus:border-accent-primary transition-colors resize-none"
            />
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoadingQuestionnaire) {
    return (
      <div className="max-w-[760px] mx-auto px-5 pt-28 pb-10">
        <div className="rounded-2xl border border-border-subtle bg-white p-6">
          Chargement du questionnaire...
        </div>
      </div>
    );
  }

  if (questionnaireError || !questionnaire || !currentStep) {
    return (
      <div className="max-w-[760px] mx-auto px-5 pt-28 pb-10">
        <div className="rounded-2xl border border-red-200 bg-white p-6 text-red-600">
          {questionnaireError || 'Questionnaire introuvable.'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[960px] mx-auto px-5 pt-28 pb-10">
      <div className="mb-10 rounded-3xl bg-gradient-to-br from-white to-orange-50/40 border border-orange-100 px-8 py-7 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <div className="flex items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold tracking-wide text-orange-700 mb-4">
              Threat Modeling Workspace
            </div>

            <h1 className="font-sans text-4xl font-bold tracking-tight text-slate-900 mb-3">
              {questionnaire.name}
            </h1>

            <p className="font-sans text-[15px] leading-7 text-slate-600">
              Décrivez l’architecture, les flux de données et les composants de
              votre application pour générer une analyse claire, structurée et
              exploitable.
            </p>
          </div>

          <div className="hidden md:flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-orange-100">
            <Scan className="h-6 w-6 text-orange-500" />
          </div>
        </div>
      </div>

      <Stepper
        currentStep={currentStepIndex + 1}
        steps={sortedSteps.map((step) => step.title)}
      />

      {currentStepIndex === 0 ? (
        <div className="space-y-5">
          <div>
            <label
              htmlFor="app-name"
              className="block font-sans text-sm font-semibold text-text-primary mb-1.5"
            >
              Nom de l application
            </label>
            <input
              id="app-name"
              type="text"
              value={baseInfo.app_name}
              onChange={(e) => updateBaseInfo('app_name', e.target.value)}
              placeholder="Ex: Assistant RH Intelligence"
              className="w-full bg-bg-card border border-border-subtle rounded-lg px-4 py-2.5 text-text-primary text-sm font-sans placeholder-text-secondary focus:outline-none focus:border-accent-primary transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="app-description"
              className="block font-sans text-sm font-semibold text-text-primary mb-1.5"
            >
              Description de l application
            </label>
            <textarea
              id="app-description"
              value={baseInfo.app_description}
              onChange={(e) => updateBaseInfo('app_description', e.target.value)}
              placeholder="Décrivez toute l application, ses fonctionnalités, son architecture, les flux de données, les composants utilisés, les interactions avec les utilisateurs et tout autre détail pertinent."
              rows={4}
              className="w-full bg-bg-card border border-border-subtle rounded-lg px-4 py-2.5 text-text-primary text-sm font-sans placeholder-text-secondary focus:outline-none focus:border-accent-primary transition-colors resize-none"
            />
          </div>

          <div>
            <label
              htmlFor="dev-name"
              className="block font-sans text-sm font-semibold text-text-primary mb-1.5"
            >
              Nom du chef de projet / développeur (Optionnel)
            </label>
            <input
              id="dev-name"
              type="text"
              value={baseInfo.dev_name ?? ''}
              onChange={(e) => updateBaseInfo('dev_name', e.target.value)}
              placeholder="Nom et prénom du chef de projet ou du développeur principal"
              className="w-full bg-bg-card border border-border-subtle rounded-lg px-4 py-2.5 text-text-primary text-sm font-sans placeholder-text-secondary focus:outline-none focus:border-accent-primary transition-colors"
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {visibleQuestionsForCurrentStep.map((question) => (
            <div key={question.id}>{renderQuestion(question)}</div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-9">
        <button
          onClick={handleBack}
          disabled={currentStepIndex === 0}
          className="flex items-center gap-2 px-5 py-2.5 bg-transparent border border-border-subtle text-text-secondary rounded-lg font-sans font-semibold text-sm hover:border-accent-primary hover:text-text-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
          Retour
        </button>

        {currentStepIndex < sortedSteps.length - 1 ? (
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent-primary text-white rounded-lg font-sans text-sm font-semibold hover:brightness-110 hover:scale-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Suivant
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!canProceed()}
            className="flex items-center gap-2 px-6 py-2.5 bg-accent-primary text-white rounded-lg font-sans font-semibold text-sm hover:bg-accent-danger transition-colors duration-300 disabled:opacity-40 disabled:cursor-not-allowed h-[44px]"
          >
            <Scan
              className="w-5 h-5 animate-spin"
              style={{ animationDuration: '3s' }}
            />
            Lancer l analyse
          </button>
        )}
      </div>
    </div>
  );
}