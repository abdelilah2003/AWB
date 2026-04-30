import { useEffect, useState, type ReactNode } from 'react';
import { History, Layers3, LayoutDashboard } from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { FormView } from '../../components/FormView';
import { ErrorView } from '../../components/ErrorView';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { ReportView } from '../../components/ReportView';
import { ValidationView } from '../../components/ValidationView';
import { HistoryView } from '../../components/HistoryView';
import { DashboardView } from '../../components/DashboardView';
import { API_BASE_URL } from '../../config';
import { fetchMyReports, toAbsoluteReportUrl } from '../../api/reports';
import type { AnalysisSubmitPayload, ReportRecord } from '../../types';
import keycloak from '../../auth/keycloak';

type ViewState = 'form' | 'loading' | 'error' | 'report';
type LoadingStep = 'starting' | 'sent' | 'processing' | 'waiting';
type SecOpsSection = 'analysis' | 'history' | 'dashboard';

interface SecOpsPageProps {
  currentUserName: string;
  onLogout: () => void;
}

export function SecOpsPage({ currentUserName, onLogout }: Readonly<SecOpsPageProps>) {
  const [activeSection, setActiveSection] = useState<SecOpsSection>('dashboard');
  const [viewState, setViewState] = useState<ViewState>('form');
  const [isDemoMode] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState(false);
  const [formData, setFormData] = useState<AnalysisSubmitPayload | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [loadingStep, setLoadingStep] = useState<LoadingStep>('starting');
  const [reportUrl, setReportUrl] = useState('');
  const [history, setHistory] = useState<ReportRecord[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    checkApiConnection();
    void loadMyReports();
  }, []);

  const checkApiConnection = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
      });
      setIsApiConnected(response.ok);
    } catch {
      setIsApiConnected(false);
    }
  };

  const loadMyReports = async () => {
    try {
      const reports = await fetchMyReports();
      setHistory(
        reports.map((report) => ({
          ...report,
          report_url: toAbsoluteReportUrl(report.report_url),
        }))
      );
    } catch (error) {
      console.error('Erreur chargement rapports secops :', error);
      setHistory([]);
    }
  };

  const handleFormSubmit = async (data: AnalysisSubmitPayload) => {
    setFormData(data);
    setErrorMessage('');
    setLoadingStep('starting');
    setReportUrl('');
    setViewState('loading');

    if (isDemoMode) {
      setTimeout(() => setLoadingStep('sent'), 700);
      setTimeout(() => setLoadingStep('processing'), 1500);
      setTimeout(() => setLoadingStep('waiting'), 2500);

      setTimeout(() => {
        const demoReportUrl = `${API_BASE_URL}/download-report`;
        setReportUrl(demoReportUrl);
        setIsValidating(true);
        setViewState('report');
      }, 3500);

      return;
    }

    let processingTimer: number | undefined;
    let waitingTimer: number | undefined;

    try {
      setLoadingStep('sent');

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (keycloak.authenticated && keycloak.token) {
        headers.Authorization = `Bearer ${keycloak.token}`;
      }

      const fetchPromise = fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      processingTimer = globalThis.setTimeout(() => {
        setLoadingStep('processing');
      }, 500);

      waitingTimer = globalThis.setTimeout(() => {
        setLoadingStep('waiting');
      }, 2000);

      const response = await fetchPromise;
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || `Erreur API: ${response.status} ${response.statusText}`);
      }

      if (!result.report_url) {
        throw new Error("Le backend n'a pas renvoye report_url.");
      }

      const nextReportUrl = toAbsoluteReportUrl(result.report_url);
      setReportUrl(nextReportUrl);
      await loadMyReports();
      setIsValidating(true);
      setViewState('report');
    } catch (error) {
      console.error('Erreur lors de l analyse :', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Impossible de se connecter au backend.'
      );
      setViewState('error');
    } finally {
      if (processingTimer) clearTimeout(processingTimer);
      if (waitingTimer) clearTimeout(waitingTimer);
    }
  };

  const handleNewAnalysis = () => {
    setViewState('form');
    setActiveSection('analysis');
    setFormData(null);
    setErrorMessage('');
    setReportUrl('');
    setIsValidating(false);
  };

  const handleOpenHistoryReport = (url: string) => {
    setReportUrl(toAbsoluteReportUrl(url));
    setViewState('report');
    setActiveSection('analysis');
  };

  const handleRetry = () => {
    if (formData) {
      void handleFormSubmit(formData);
    } else {
      handleNewAnalysis();
    }
  };

  let content: ReactNode;

  if (activeSection === 'dashboard') {
    content = (
      <DashboardView
        history={history}
        isApiConnected={isDemoMode || isApiConnected}
        isDemoMode={isDemoMode}
        onStartAnalysis={() => setActiveSection('analysis')}
        onViewHistory={() => setActiveSection('history')}
      />
    );
  } else if (activeSection === 'history') {
    content = (
      <HistoryView
        history={history}
        onOpenReport={handleOpenHistoryReport}
        onNewAnalysis={handleNewAnalysis}
      />
    );
  } else {
    content = (
      <>
        {viewState === 'form' && <FormView onSubmit={handleFormSubmit} />}

        {viewState === 'error' && <ErrorView message={errorMessage} onRetry={handleRetry} />}

        {viewState === 'report' && reportUrl !== '' &&
          (isValidating ? (
            <ValidationView
              reportUrl={reportUrl}
              appName={formData?.app_name || 'Application'}
              onDownload={() => {
                const link = document.createElement('a');
                link.href = reportUrl;
                link.download = `rapport-${formData?.app_name || 'analyse'}.pdf`;
                link.click();
              }}
              onBack={handleNewAnalysis}
            />
          ) : (
            <ReportView reportUrl={reportUrl} onNewAnalysis={handleNewAnalysis} />
          ))}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-bg-page font-sans">
      <Navbar
        activeSection={activeSection}
        onNavigate={setActiveSection}
        onLogout={onLogout}
        isDemoMode={isDemoMode}
        isApiConnected={isDemoMode || isApiConnected}
        currentUserName={currentUserName}
        navItems={[
          { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { key: 'analysis', label: 'Nouvelle analyse', icon: Layers3 },
          { key: 'history', label: 'Historique', icon: History },
        ]}
      />

      {viewState === 'loading' && <LoadingOverlay step={loadingStep} />}

      {content}
    </div>
  );
}
