import { useState } from 'react';
import { ChevronDown, ChevronUp, Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import type { Threat, Severity } from '../types';

const severityConfig: Record<Severity, { color: string; bg: string; borderColor: string; shadow: string }> = {
  CRITIQUE: {
    color: 'text-accent-danger',
    bg: 'bg-accent-danger/10',
    borderColor: 'border-accent-danger',
    shadow: 'shadow-[0_0_20px_rgba(242,80,65,0.15)]',
  },
  ÉLEVÉ: {
    color: 'text-accent-primary',
    bg: 'bg-accent-primary/10',
    borderColor: 'border-accent-primary',
    shadow: '',
  },
  MOYEN: {
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500',
    shadow: '',
  },
  FAIBLE: {
    color: 'text-slate-500',
    bg: 'bg-slate-500/10',
    borderColor: 'border-slate-500',
    shadow: '',
  },
};

interface ThreatCardProps {
  threat: Threat;
  index: number;
}

export function ThreatCard({ threat, index }: ThreatCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = severityConfig[threat.severity];

  return (
    <div
      className={`bg-bg-card border-l-4 ${config.borderColor} rounded-lg overflow-hidden transition-all ${config.shadow}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div
        className="p-5 cursor-pointer hover:bg-bg-card-hover transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-mono ${config.bg} ${config.color} ${threat.severity === 'CRITIQUE' ? 'animate-pulse' : ''}`}>
              {threat.severity}
            </span>
            <h3 className="font-mono font-medium text-[15px] text-text-primary">
              {threat.name}
            </h3>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-text-secondary flex-shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-text-secondary flex-shrink-0" />
          )}
        </div>
        <p className="font-sans text-[13px] text-text-secondary leading-relaxed">
          {threat.justification}
        </p>
      </div>

      {isExpanded && (
        <div className="border-t border-border-subtle">
          <div className="p-5 bg-bg-page/30">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-accent-danger" />
                <h4 className="font-mono text-sm text-accent-danger/80">Attaques</h4>
              </div>
              <ul className="space-y-2">
                {threat.attacks.map((attack, i) => (
                  <li key={i} className="font-sans text-sm text-text-secondary pl-6 relative before:content-['•'] before:absolute before:left-2 before:text-accent-danger">
                    {attack}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-accent-primary" />
                <h4 className="font-mono text-sm text-accent-primary/80">Impacts</h4>
              </div>
              <ul className="space-y-2">
                {threat.impacts.map((impact, i) => (
                  <li key={i} className="font-sans text-sm text-text-secondary pl-6 relative before:content-['•'] before:absolute before:left-2 before:text-accent-primary">
                    {impact}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-success" />
                <h4 className="font-mono text-sm text-success/80">Contrôles</h4>
              </div>
              <ul className="space-y-2">
                {threat.controls.map((control, i) => (
                  <li key={i} className="font-sans text-sm text-text-secondary pl-6 relative before:content-['✓'] before:absolute before:left-2 before:text-success">
                    {control}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
