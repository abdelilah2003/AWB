interface ReportViewProps {
  reportUrl: string;
  onNewAnalysis: () => void;
}

export function ReportView({ reportUrl, onNewAnalysis }: ReportViewProps) {
  return (
    <div className="max-w-[1200px] mx-auto px-6 pt-32 pb-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-mono text-[30px] text-text-primary">
          Rapport final
        </h1>

        <div className="flex gap-3">
          <a
            href={reportUrl}
            target="_blank"
            rel="noreferrer"
            className="px-5 py-3 bg-accent-primary text-white rounded-lg font-mono hover:brightness-105 transition"
          >
            Télécharger
          </a>

          <button
            onClick={onNewAnalysis}
            className="px-5 py-3 border border-border-subtle bg-white text-text-primary rounded-lg font-mono hover:bg-bg-card-hover transition"
          >
            Nouvelle analyse
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden border border-border-subtle h-[80vh] shadow-[0_18px_50px_rgba(217,119,6,0.14)]">
        {reportUrl ? (
          <iframe title="Rapport analyse" src={reportUrl} className="w-full h-full" />
        ) : (
          <div className="p-8 text-text-secondary">Chargement du rapport...</div>
        )}
      </div>
    </div>
  );
}
