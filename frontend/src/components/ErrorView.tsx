import { XCircle, RotateCcw } from 'lucide-react';

interface ErrorViewProps {
  message: string;
  onRetry: () => void;
}

export function ErrorView({ message, onRetry }: ErrorViewProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="bg-white border-2 border-accent-danger/40 rounded-2xl p-8 max-w-md w-full text-center shadow-[0_14px_40px_rgba(220,38,38,0.14)]">
        <div className="flex justify-center mb-6">
          <XCircle className="w-16 h-16 text-accent-danger" />
        </div>

        <h2 className="font-sans font-bold text-xl text-text-primary mb-3">
          Erreur de connexion
        </h2>

        <p className="font-sans text-sm text-text-secondary mb-6">
          {message}
        </p>

        <button
          onClick={onRetry}
          className="flex items-center gap-2 mx-auto px-6 py-3 bg-accent-primary text-white rounded-lg font-sans font-semibold hover:brightness-110 transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          Réessayer
        </button>
      </div>
    </div>
  );
}
