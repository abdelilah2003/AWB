import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export type LoadingStep = 'starting' | 'sent' | 'processing' | 'waiting';

interface LoadingOverlayProps {
  step: LoadingStep;
}

const loadingMessages: Record<LoadingStep, string> = {
  starting: '> la demande est en cours de traitement...',
  sent: '> le message est envoyé au backend...',
  processing: '> analyse du message par le backend en cours...',
  waiting: '> cela peut prendre quelques secondes...',
};

export function LoadingOverlay({ step }: LoadingOverlayProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95;
        return prev + 2;
      });
    }, 120);

    return () => {
      clearInterval(progressInterval);
    };
  }, [step]);

  return (
    <div className="fixed inset-0 bg-[#FFF7EA]/85 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white border-2 border-accent-primary/30 rounded-2xl p-8 max-w-md w-full mx-4 shadow-[0_20px_60px_rgba(217,119,6,0.18)]">
        <div className="flex items-center justify-center mb-6">
          <Loader2 className="w-12 h-12 text-accent-primary animate-spin" />
        </div>

        <div className="mb-6">
          <div className="h-2 bg-border-subtle rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <p className="font-sans font-semibold text-sm text-text-primary text-center">
          {loadingMessages[step]}
        </p>
      </div>
    </div>
  );
}