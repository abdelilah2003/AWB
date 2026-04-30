import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  Filter,
  History,
  LayoutDashboard,
  MessageSquare,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { fetchAllReports, toAbsoluteReportUrl, updateReportStatus } from '../../api/reports';
import { HistoryView } from '../../components/HistoryView';
import type { ReportRecord, ReportStatus } from '../../types';

type ManagerSection = 'dashboard' | 'validation' | 'history';
type FilterStatus = 'all' | ReportStatus;
type DecisionAction = 'approve' | 'reject' | 'needs_changes';

interface ManagerPageProps {
  currentUserName: string;
  onLogout: () => void;
}

interface ValidationModal {
  open: boolean;
  reportId: string;
  action: DecisionAction;
}

const STATUS_CONFIG = {
  PENDING_MANAGER_VALIDATION: {
    label: 'En attente',
    icon: Clock,
    badgeClass: 'bg-amber-100 text-amber-700 border border-amber-200',
  },
  APPROVED: {
    label: 'Approuve',
    icon: CheckCircle,
    badgeClass: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  },
  REJECTED: {
    label: 'Rejete',
    icon: XCircle,
    badgeClass: 'bg-red-100 text-red-700 border border-red-200',
  },
  NEEDS_CHANGES: {
    label: 'A corriger',
    icon: AlertTriangle,
    badgeClass: 'bg-orange-100 text-orange-700 border border-orange-200',
  },
  DRAFT: {
    label: 'Brouillon',
    icon: FileText,
    badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200',
  },
  GENERATED: {
    label: 'Genere',
    icon: FileText,
    badgeClass: 'bg-blue-100 text-blue-700 border border-blue-200',
  },
} as const;

function toDecisionStatus(
  action: DecisionAction
): Extract<ReportStatus, 'APPROVED' | 'REJECTED' | 'NEEDS_CHANGES'> {
  if (action === 'approve') return 'APPROVED';
  if (action === 'reject') return 'REJECTED';
  return 'NEEDS_CHANGES';
}

function decisionTitle(action: DecisionAction): string {
  if (action === 'approve') return 'Confirmer la validation';
  if (action === 'reject') return 'Confirmer le rejet';
  return 'Demander des corrections';
}

export function ManagerPage({ currentUserName, onLogout }: Readonly<ManagerPageProps>) {
  const [activeSection, setActiveSection] = useState<ManagerSection>('dashboard');
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [validationModal, setValidationModal] = useState<ValidationModal>({
    open: false,
    reportId: '',
    action: 'approve',
  });

  useEffect(() => {
    void loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const nextReports = await fetchAllReports();
      setReports(
        nextReports.map((report) => ({
          ...report,
          report_url: toAbsoluteReportUrl(report.report_url),
        }))
      );
    } catch (error) {
      console.error('Erreur chargement rapports manager :', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Impossible de charger les rapports.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const filteredReports = useMemo(() => {
    if (filter === 'all') return reports;
    return reports.filter((report) => report.status === filter);
  }, [filter, reports]);

  const counts = useMemo(
    () => ({
      all: reports.length,
      PENDING_MANAGER_VALIDATION: reports.filter((report) => report.status === 'PENDING_MANAGER_VALIDATION').length,
      APPROVED: reports.filter((report) => report.status === 'APPROVED').length,
      REJECTED: reports.filter((report) => report.status === 'REJECTED').length,
      NEEDS_CHANGES: reports.filter((report) => report.status === 'NEEDS_CHANGES').length,
    }),
    [reports]
  );

  const pendingReports = useMemo(
    () => reports.filter((report) => report.status === 'PENDING_MANAGER_VALIDATION').slice(0, 3),
    [reports]
  );

  const historyItems = useMemo(() => reports.slice(), [reports]);

  const openValidation = (reportId: string, action: DecisionAction) => {
    setComment('');
    setValidationModal({ open: true, reportId, action });
  };

  const submitValidation = async () => {
    const isCommentRequired =
      validationModal.action === 'reject' || validationModal.action === 'needs_changes';

    if (isCommentRequired && comment.trim() === '') return;

    try {
      const updatedReport = await updateReportStatus(
        validationModal.reportId,
        toDecisionStatus(validationModal.action),
        comment
      );

      setReports((currentReports) =>
        currentReports.map((report) =>
          report.id === updatedReport.id
            ? {
                ...updatedReport,
                report_url: toAbsoluteReportUrl(updatedReport.report_url),
              }
            : report
        )
      );
      setValidationModal({ open: false, reportId: '', action: 'approve' });
      setComment('');
    } catch (error) {
      console.error('Erreur validation manager :', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Impossible de mettre a jour le statut.'
      );
    }
  };

  let sectionContent: ReactNode;

  if (activeSection === 'dashboard') {
    sectionContent = (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-xl font-bold text-slate-900">Rapports a traiter</h2>

        {isLoading ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            Chargement des rapports...
          </div>
        ) : pendingReports.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            Aucun rapport en attente pour le moment.
          </div>
        ) : (
          <div className="space-y-4">
            {pendingReports.map((report) => (
              <article
                key={report.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:bg-white hover:shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{report.app_name}</p>
                    <p className="text-sm text-slate-500 mt-1">{report.summary}</p>
                    <p className="text-xs text-slate-500 mt-2">
                      Analyste: {report.generated_by_username || 'N/A'} · Soumis le{' '}
                      {new Date(report.generated_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewUrl(report.report_url)}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-accent-primary hover:text-accent-primary"
                    >
                      <Eye className="h-4 w-4" />
                      Voir
                    </button>
                    <button
                      onClick={() => openValidation(report.id, 'approve')}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      <Check className="h-4 w-4" />
                      Valider
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    );
  } else if (activeSection === 'validation') {
    sectionContent = (
      <>
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          {([
            ['all', 'Tous'],
            ['PENDING_MANAGER_VALIDATION', 'En attente'],
            ['APPROVED', 'Approuves'],
            ['REJECTED', 'Rejetes'],
            ['NEEDS_CHANGES', 'A corriger'],
          ] as Array<[FilterStatus, string]>).map(([statusKey, label]) => {
            const isActive = filter === statusKey;
            return (
              <button
                key={statusKey}
                onClick={() => setFilter(statusKey)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-accent-primary text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-accent-primary hover:text-accent-primary'
                }`}
              >
                {label} ({statusKey === 'all' ? counts.all : counts[statusKey]})
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            Chargement des rapports...
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            Aucun rapport pour ce filtre.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => {
              const status = STATUS_CONFIG[report.status];
              const StatusIcon = status.icon;
              const latestComment = report.status_history.find((entry) => Boolean(entry.comment))?.comment;

              return (
                <article
                  key={report.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-900">{report.app_name}</h3>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${status.badgeClass}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {status.label}
                        </span>
                      </div>

                      <p className="text-sm text-slate-600">{report.summary}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        Analyste: {report.generated_by_username || 'N/A'} · Genere le{' '}
                        {new Date(report.generated_at).toLocaleDateString('fr-FR')}
                      </p>

                      {report.validated_at && (
                        <p className="mt-1 text-xs text-slate-500">
                          Decision manager: {new Date(report.validated_at).toLocaleDateString('fr-FR')} par{' '}
                          {report.validated_by_username || currentUserName}
                        </p>
                      )}

                      {latestComment && (
                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                          <span className="font-semibold">Dernier commentaire:</span> {latestComment}
                        </div>
                      )}

                      {report.annotations.length > 0 && (
                        <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                          <p className="mb-2 text-xs font-semibold text-slate-700">Annotations</p>
                          <ul className="space-y-1">
                            {report.annotations.map((annotation) => (
                              <li key={annotation.id} className="text-xs text-slate-600">
                                - {annotation.annotation}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:flex-col lg:items-stretch">
                      <button
                        onClick={() => setPreviewUrl(report.report_url)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-accent-primary hover:text-accent-primary"
                      >
                        <Eye className="h-4 w-4" />
                        Voir rapport
                      </button>

                      {report.status === 'PENDING_MANAGER_VALIDATION' && (
                        <>
                          <button
                            onClick={() => openValidation(report.id, 'approve')}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                          >
                            <Check className="h-4 w-4" />
                            Valider
                          </button>
                          <button
                            onClick={() => openValidation(report.id, 'needs_changes')}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
                          >
                            <MessageSquare className="h-4 w-4" />
                            Demander corrections
                          </button>
                          <button
                            onClick={() => openValidation(report.id, 'reject')}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                          >
                            <X className="h-4 w-4" />
                            Rejeter
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </>
    );
  } else {
    sectionContent = (
      <HistoryView
        history={historyItems}
        onOpenReport={(url) => globalThis.open(toAbsoluteReportUrl(url), '_blank', 'noopener,noreferrer')}
        showNewAnalysisButton={false}
        title="Historique des rapports"
        subtitle="Consultez tous les rapports soumis par les secops engineers, y compris les anciennes versions et validations précédentes."
      />
    );
  }

  return (
    <div className="min-h-screen bg-bg-page font-sans">
      <Navbar
        activeSection={activeSection}
        onNavigate={setActiveSection}
        onLogout={onLogout}
        isApiConnected
        isDemoMode={false}
        currentUserName={currentUserName}
        navItems={[
          { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { key: 'validation', label: 'Validation', icon: History },
          { key: 'history', label: 'Historique', icon: FileText },
        ]}
      />

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 pt-32 pb-12">
        <div className="mb-10">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
            <ShieldCheck className="h-4 w-4 text-accent-primary" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Manager Workspace
            </span>
          </div>

          <h1 className="mb-3 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Validation des rapports
          </h1>

          <p className="max-w-3xl text-base leading-relaxed text-slate-500 md:text-lg">
            Consultez les rapports generes par les secops engineers, ajoutez des annotations et decidez leur statut final.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Total" value={counts.all} icon={FileText} colorClass="bg-slate-900 text-white" />
          <StatCard label="En attente" value={counts.PENDING_MANAGER_VALIDATION} icon={Clock} colorClass="bg-amber-100 text-amber-700" />
          <StatCard label="Approuves" value={counts.APPROVED} icon={CheckCircle} colorClass="bg-emerald-100 text-emerald-700" />
          <StatCard label="Rejetes" value={counts.REJECTED} icon={XCircle} colorClass="bg-red-100 text-red-700" />
          <StatCard label="A corriger" value={counts.NEEDS_CHANGES} icon={AlertTriangle} colorClass="bg-orange-100 text-orange-700" />
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {sectionContent}
      </div>

      {validationModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            className="absolute inset-0 bg-black/50"
            onClick={() => setValidationModal({ open: false, reportId: '', action: 'approve' })}
            aria-label="Fermer"
          />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">
              {decisionTitle(validationModal.action)}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Ajoutez une annotation pour tracer la decision manager.
            </p>

            <label htmlFor="manager-comment" className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Annotation
            </label>
            <textarea
              id="manager-comment"
              rows={4}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-accent-primary focus:outline-none"
              placeholder="Saisir une note pour le secops engineer..."
            />

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setValidationModal({ open: false, reportId: '', action: 'approve' })}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={() => void submitValidation()}
                disabled={
                  (validationModal.action === 'reject' ||
                    validationModal.action === 'needs_changes') &&
                  comment.trim() === ''
                }
                className="flex-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {previewUrl && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3">
            <h2 className="text-base font-bold text-slate-900">Apercu du rapport</h2>
            <button
              onClick={() => setPreviewUrl(null)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-accent-primary hover:text-accent-primary"
            >
              <X className="h-4 w-4" />
              Fermer
            </button>
          </div>
          <iframe src={previewUrl} className="h-full w-full border-none" title="Apercu du rapport" />
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  colorClass,
}: Readonly<{
  label: string;
  value: number;
  icon: typeof FileText;
  colorClass: string;
}>) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${colorClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mb-1 text-sm font-medium text-slate-500">{label}</p>
      <p className="text-4xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
