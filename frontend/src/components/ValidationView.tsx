import { CheckCircle, Download, Share2, ArrowLeft } from 'lucide-react';

interface ValidationViewProps {
  reportUrl: string;
  appName: string;
  onDownload: () => void;
  onBack: () => void;
}

export function ValidationView({
  reportUrl,
  appName,
  onDownload,
  onBack,
}: ValidationViewProps) {
  return (
    <div className="max-w-[1000px] mx-auto px-6 pt-32 pb-12">
      <div className="mb-12">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-accent-primary hover:text-accent-primary/80 font-medium mb-8 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>

        <div className="rounded-3xl border border-border-subtle bg-white p-8 shadow-[0_24px_60px_rgba(31,41,55,0.1)]">
          <div className="flex items-start gap-6 mb-8">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <div>
              <h1 className="font-sans text-3xl font-bold text-text-primary mb-2">
                Rapport généré avec succès
              </h1>
              <p className="text-lg text-text-secondary">
                Votre analyse d'architecture AWB pour <span className="font-semibold">{appName}</span> est prête à être consultée.
              </p>
            </div>
          </div>

          <div className="space-y-6 mb-8">
            <div className="p-6 rounded-2xl bg-bg-card border border-border-subtle">
              <h2 className="font-sans font-semibold text-text-primary mb-3">
                Contenu du rapport
              </h2>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
                  Analyse détaillée de l'architecture
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
                  Évaluation des flux de données
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
                  Recommandations de sécurisation
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
                  Plan d'action priorisé
                </li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl bg-accent-soft/30 border border-accent-primary/20">
              <h3 className="font-sans font-semibold text-accent-primary mb-2">
                Prochaines étapes
              </h3>
              <p className="text-sm text-text-secondary">
                Consultez le rapport, partagez-le avec votre équipe de sécurité, et lancez une nouvelle analyse
                après implémentation des recommandations.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href={reportUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white border-2 border-border-subtle hover:border-accent-primary transition font-semibold text-text-primary"
            >
              <Share2 className="w-5 h-5" />
              Consulter le rapport
            </a>

            <button
              onClick={onDownload}
              className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-accent-primary text-white hover:brightness-105 transition font-semibold shadow-[0_8px_20px_rgba(217,119,6,0.2)]"
            >
              <Download className="w-5 h-5" />
              Télécharger le rapport
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
