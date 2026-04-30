import { useState } from 'react';
import { FileText, RotateCcw } from 'lucide-react';
import { ThreatCard } from './ThreatCard';
import type { AnalysisResult, FormData, Severity } from '../types';

interface ResultsViewProps {
  result: AnalysisResult;
  formData: FormData;
  onNewAnalysis: () => void;
  onGenerateReport: () => void;
}

export function ResultsView({ result, formData, onNewAnalysis, onGenerateReport }: ResultsViewProps) {
  const [activeTab, setActiveTab] = useState<Severity | 'Toutes'>('Toutes');

  const filteredThreats =
    activeTab === 'Toutes'
      ? result.threats
      : result.threats.filter((t) => t.severity === activeTab);

  const getRiskScoreColor = (score: number) => {
    if (score <= 40) return 'text-success';
    if (score <= 70) return 'text-accent-primary';
    return 'text-accent-danger';
  };

  const getArchitectureBadges = () => {
    const badges = [];
    if (formData.has_llm) badges.push({ label: 'LLM', color: 'bg-blue-500/20 text-blue-400' });
    if (formData.has_rag) badges.push({ label: 'RAG', color: 'bg-purple-500/20 text-purple-400' });
    if (formData.free_prompt) badges.push({ label: 'PROMPT', color: 'bg-accent-primary/20 text-accent-primary' });
    if (formData.has_personal_data) badges.push({ label: 'DATA', color: 'bg-green-500/20 text-green-400' });
    if (formData.has_tools) badges.push({ label: 'AGENT', color: 'bg-pink-500/20 text-pink-400' });
    if (formData.publicly_exposed) badges.push({ label: 'PUBLIC', color: 'bg-accent-danger/20 text-accent-danger' });
    return badges;
  };

  const tabs: (Severity | 'Toutes')[] = ['Toutes', 'CRITIQUE', 'ÉLEVÉ', 'MOYEN', 'FAIBLE'];

  const threatCountBySeverity = (severity: Severity) =>
    result.threats.filter((t) => t.severity === severity).length;

  return (
    <div className="pt-24 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 pb-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-mono text-2xl text-text-primary mb-2">
              Analyse terminée{' '}
              <span className="text-accent-primary">· {formData.app_name}</span>
            </h1>
            <p className="font-sans text-sm text-text-secondary">
              {result.threats.length} menaces identifiées · Score de risque :{' '}
              <span className={getRiskScoreColor(result.risk_score)}>
                {result.risk_score}/100
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onNewAnalysis}
              className="flex items-center gap-2 px-4 py-2 border border-border-subtle text-text-primary rounded-lg font-sans text-sm hover:border-accent-primary transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Nouvelle analyse
            </button>
            <button
              onClick={onGenerateReport}
              className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-bg-page rounded-lg font-sans text-sm font-medium hover:brightness-110 transition-all"
            >
              <FileText className="w-4 h-4" />
              Générer rapport DOCX
            </button>
          </div>
        </div>

        <div className="flex gap-6">
          <aside className="w-[280px] flex-shrink-0 space-y-4">
            <div className="bg-bg-card border-l-3 border-l-accent-primary rounded-lg p-5">
              <h3 className="font-mono text-sm text-text-primary mb-3">
                Profil applicatif
              </h3>
              <div className="mb-3">
                <p className="font-mono text-xs text-accent-primary mb-1">
                  {formData.app_name}
                </p>
                <p className="font-sans text-xs text-text-secondary mb-1">
                  {formData.app_type}
                </p>
                <p className="font-sans text-xs text-text-secondary line-clamp-3">
                  {formData.description}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {getArchitectureBadges().map((badge) => (
                  <span
                    key={badge.label}
                    className={`px-2 py-1 rounded text-[10px] font-mono ${badge.color}`}
                  >
                    {badge.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-bg-card rounded-lg p-5">
              <h3 className="font-mono text-sm text-text-primary mb-4">
                Score de risque
              </h3>
              <div className="flex flex-col items-center">
                <div className={`font-mono text-5xl mb-2 ${getRiskScoreColor(result.risk_score)}`}>
                  {result.risk_score}
                </div>
                <div className="text-xs font-sans text-text-secondary mb-4">/100</div>
                <div className="w-full h-2 bg-border-subtle rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      result.risk_score <= 40
                        ? 'bg-success'
                        : result.risk_score <= 70
                        ? 'bg-accent-primary'
                        : 'bg-accent-danger'
                    }`}
                    style={{ width: `${result.risk_score}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-bg-card rounded-lg p-5">
              <h3 className="font-mono text-sm text-text-primary mb-4">
                Surfaces d'attaque
              </h3>
              <div className="space-y-3">
                {result.attack_surfaces.map((surface) => {
                  const count = result.threats.filter((t) =>
                    t.name.toLowerCase().includes(surface.toLowerCase())
                  ).length;
                  const percentage = (count / result.threats.length) * 100;

                  return (
                    <div key={surface}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-sans text-xs text-text-primary">
                          {surface}
                        </span>
                        <span className="font-mono text-xs text-text-secondary">
                          {count}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-border-subtle rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent-danger"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>

          <main className="flex-1">
            <div className="flex items-center gap-4 mb-6 border-b border-border-subtle">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 font-sans text-sm transition-colors relative ${
                    activeTab === tab
                      ? 'text-accent-primary'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {tab}
                  {tab !== 'Toutes' && (
                    <span className="ml-1 text-xs">({threatCountBySeverity(tab)})</span>
                  )}
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-primary" />
                  )}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {filteredThreats.map((threat, index) => (
                <ThreatCard key={threat.id} threat={threat} index={index} />
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
