import { CalendarClock, FileSearch, RefreshCcw } from 'lucide-react';
import type { ReportRecord, ReportStatus } from '../types';

interface HistoryViewProps {
  history: ReportRecord[];
  onOpenReport: (url: string) => void;
  onNewAnalysis?: () => void;
  showNewAnalysisButton?: boolean;
  title?: string;
  subtitle?: string;
}

const STATUS_LABELS: Record<ReportStatus, string> = {
  DRAFT: 'Brouillon',
  GENERATED: 'Genere',
  PENDING_MANAGER_VALIDATION: 'En attente manager',
  APPROVED: 'Approuve',
  REJECTED: 'Rejete',
  NEEDS_CHANGES: 'A corriger',
};

export function HistoryView({
  history,
  onOpenReport,
  onNewAnalysis,
  showNewAnalysisButton = true,
  title = 'Versions precedentes',
  subtitle = 'Consultez les anciennes analyses et reutilisez leurs rapports.',
}: Readonly<HistoryViewProps>) {
  return (
    <div className="max-w-[980px] mx-auto px-6 pt-28 pb-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-sans font-extrabold text-[30px] text-text-primary">{title}</h1>
          <p className="text-text-secondary text-sm mt-1">
            {subtitle}
          </p>
        </div>

        {showNewAnalysisButton && onNewAnalysis && (
          <button
            onClick={onNewAnalysis}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-accent-primary text-white font-semibold hover:brightness-105 transition"
          >
            <RefreshCcw className="w-4 h-4" />
            Nouvelle analyse
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="rounded-2xl border border-border-subtle bg-white p-8 text-center">
          <FileSearch className="w-10 h-10 mx-auto text-text-muted mb-3" />
          <h2 className="font-sans font-bold text-xl text-text-primary mb-2">Aucune version enregistree</h2>
          <p className="text-sm text-text-secondary">
            Lancez votre premiere analyse pour alimenter cet historique.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {history.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-border-subtle bg-white p-5 hover:shadow-[0_12px_40px_rgba(217,119,6,0.16)] transition"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-sans font-bold text-lg text-text-primary">{item.app_name}</h3>
                    <span className="rounded-full bg-bg-panel px-3 py-1 text-[11px] font-semibold text-text-secondary">
                      {STATUS_LABELS[item.status]}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary mt-1">{item.summary}</p>
                  <p className="text-xs text-text-muted mt-2">
                    Analyste: {item.generated_by_username || 'Non renseigne'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-panel px-3 py-1.5 text-xs text-text-secondary">
                    <CalendarClock className="w-3.5 h-3.5" />
                    {new Date(item.generated_at).toLocaleString('fr-FR')}
                  </span>
                  <button
                    onClick={() => onOpenReport(item.report_url)}
                    className="px-4 py-2 rounded-lg border border-accent-primary text-accent-primary hover:bg-accent-soft transition"
                  >
                    Ouvrir rapport
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
