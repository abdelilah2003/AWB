import {
  Activity,
  CheckCircle2,
  Clock,
  Zap,
  TrendingUp,
  ArrowRight,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';

import type { ReportRecord } from '../types';

interface DashboardViewProps {
  history: ReportRecord[];
  isApiConnected: boolean;
  isDemoMode: boolean;
  onStartAnalysis: () => void;
  onViewHistory: () => void;
}

export function DashboardView({
  history,
  isApiConnected,
  isDemoMode,
  onStartAnalysis,
  onViewHistory,
}: DashboardViewProps) {
  const totalAnalyses = history.length;
  const recentAnalysis = history[0];
  const pendingReports = history.filter((item) => item.status === 'PENDING_MANAGER_VALIDATION').length;
  const approvedReports = history.filter((item) => item.status === 'APPROVED').length;

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 pt-32 pb-12">
      <div className="mb-10">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
          <ShieldCheck className="h-4 w-4 text-accent-primary" />
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            AWB Security Workspace
          </span>
        </div>

        <h1 className="mb-3 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
          Tableau de bord
        </h1>

        <p className="max-w-3xl text-base leading-relaxed text-slate-500 md:text-lg">
          Pilotez vos analyses d’architecture, suivez l’état de vos rapports et lancez
          rapidement une nouvelle évaluation de sécurité.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Activity className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
              Global
            </span>
          </div>

          <p className="mb-1 text-sm font-medium text-slate-500">Total des analyses</p>
          <p className="text-4xl font-bold text-slate-900">{totalAnalyses}</p>
          <p className="mt-2 text-sm text-slate-500">
            {totalAnalyses === 0
              ? 'Aucune analyse disponible'
              : totalAnalyses === 1
                ? '1 analyse effectuée'
                : `${totalAnalyses} analyses effectuées`}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
          <div className="mb-5 flex items-center justify-between">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl text-white ${
                isApiConnected ? 'bg-emerald-600' : 'bg-red-600'
              }`}
            >
              <Zap className="h-5 w-5" />
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                isDemoMode
                  ? 'bg-amber-100 text-amber-700'
                  : isApiConnected
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
              }`}
            >
              {isDemoMode ? 'Démo' : isApiConnected ? 'Online' : 'Offline'}
            </span>
          </div>

          <p className="mb-1 text-sm font-medium text-slate-500">État API</p>
          <p className="text-3xl font-bold text-slate-900">
            {isDemoMode ? 'Mode démo' : isApiConnected ? 'Connectée' : 'Hors ligne'}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {isDemoMode
              ? 'Tests en environnement simulé'
              : isApiConnected
                ? 'Prêt pour l’analyse'
                : 'Connexion à vérifier'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-800">
              <Clock className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
              Récent
            </span>
          </div>

          <p className="mb-1 text-sm font-medium text-slate-500">Dernière analyse</p>
          <p className="truncate text-2xl font-bold text-slate-900">
            {recentAnalysis ? recentAnalysis.app_name : 'Aucune'}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {recentAnalysis
              ? new Date(recentAnalysis.generated_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : 'Lancez votre première analyse'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
              Workflow
            </span>
          </div>

          <p className="mb-1 text-sm font-medium text-slate-500">Validation manager</p>
          <p className="text-3xl font-bold text-slate-900">{pendingReports}</p>
          <p className="mt-2 text-sm text-slate-500">
            {approvedReports} rapport{approvedReports > 1 ? 's' : ''} approuve{approvedReports > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="p-7 md:p-8">
            <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <span className="mb-3 inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                  Rapports en cours
                </span>

                <h2 className="mb-2 text-2xl font-bold text-slate-900 md:text-3xl">
                  Suivi des analyses
                </h2>

                <p className="max-w-2xl leading-relaxed text-slate-500">
                  Consultez les rapports récemment générés, les analyses en attente et les
                  travaux de threat modeling en cours.
                </p>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-primary text-white shadow-lg">
                <TrendingUp className="h-7 w-7" />
              </div>
            </div>

            {history.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                  <AlertTriangle className="h-7 w-7" />
                </div>

                <h3 className="mb-2 text-lg font-bold text-slate-900">
                  Aucun rapport en cours
                </h3>

                <p className="mx-auto mb-6 max-w-md text-sm text-slate-500">
                  Vous n’avez pas encore lancé d’analyse. Commencez une nouvelle analyse
                  pour générer votre premier rapport de sécurité.
                </p>

                <button
                  onClick={onStartAnalysis}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl"
                >
                  Commencer une analyse
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {history.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-white hover:shadow-sm md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white text-accent-primary shadow-sm">
                        <ShieldCheck className="h-5 w-5" />
                      </div>

                      <div>
                        <h3 className="font-bold text-slate-900">{item.app_name}</h3>

                        <p className="text-sm text-slate-500">
                          Créé le{' '}
                          {new Date(item.generated_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>

                    <a
                      href={item.report_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-accent-primary hover:text-accent-primary"
                    >
                      Ouvrir
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-bold text-slate-900">Actions rapides</h2>

          <div className="space-y-3">
            <button
              onClick={onStartAnalysis}
              className="group w-full rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <Zap className="h-5 w-5" />
                  </div>
                  <span className="font-semibold text-slate-800">Nouvelle analyse</span>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1" />
              </div>
            </button>

            <button
              onClick={onViewHistory}
              className="group w-full rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-800">
                    <Clock className="h-5 w-5" />
                  </div>
                  <span className="font-semibold text-slate-800">
                    Historique ({totalAnalyses})
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1" />
              </div>
            </button>
          </div>

          {recentAnalysis && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Dernier rapport
              </p>

              <p className="mb-4 line-clamp-2 font-bold text-slate-900">
                {recentAnalysis.app_name}
              </p>

              <a
                href={recentAnalysis.report_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-accent-primary transition hover:opacity-80"
              >
                Ouvrir le rapport
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
