import { ShieldCheck, LogIn } from 'lucide-react';
import logoAttijari from '../../assets/logoAttijari.png';

interface AuthViewProps {
  onLogin: () => void;
}

export function AuthView({ onLogin }: AuthViewProps) {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 py-8 bg-gradient-to-br from-accent-light via-white to-stone-50 animate-fadeIn overflow-hidden">
      <div className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-accent-soft/70 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-14 h-64 w-64 rounded-full bg-accent-soft/60 blur-3xl" />

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-7 lg:gap-12 items-center">
        <div className="hidden lg:flex justify-center animate-slideInLeft">
          <div className="w-full max-w-[430px] rounded-[28px] border border-accent-primary/20 bg-white/80 p-8 shadow-elevated backdrop-blur-sm">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-accent-primary/25 bg-accent-soft px-4 py-2 mb-5">
              <ShieldCheck className="h-5 w-5 text-accent-primary" />
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-accent-primary font-sans">
                Internal Access
              </span>
            </div>

            <h2 className="font-sans text-[2.25rem] leading-[1.05] font-extrabold tracking-tight text-accent-primary">
              Threat Modeling Workspace
            </h2>

            <div className="mt-5 h-1.5 w-24 rounded-full bg-gradient-to-r from-accent-primary to-accent-secondary" />

            <p className="mt-5 text-[0.95rem] leading-relaxed font-sans font-semibold text-text-secondary">
              Espace d'analyse sécurisé pour vos architectures et vos flux applicatifs.
            </p>
          </div>
        </div>

        <div className="w-full max-w-[640px] mx-auto animate-slideInDown">
          <div className="rounded-3xl border border-border-subtle bg-white/95 shadow-elevated overflow-hidden backdrop-blur-sm">
            <div className="h-1.5 bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-primary" />

            <div className="px-8 pt-8 pb-6 text-center bg-[radial-gradient(circle_at_top,rgba(242,80,65,0.16),rgba(255,255,255,0.98)_50%)]">
              <div className="mb-4 animate-fadeIn" style={{ animationDelay: '0.25s' }}>
                <img
                  src={logoAttijari}
                  alt="Logo interne"
                  className="h-10 w-auto object-contain mx-auto opacity-95"
                />
              </div>

              <h1
                className="font-sans text-2xl font-extrabold text-accent-primary tracking-tight animate-slideInDown"
                style={{ animationDelay: '0.35s' }}
              >
                Accès Sécurisé
              </h1>

              <p
                className="text-sm text-text-secondary mt-2 font-sans font-medium animate-fadeIn"
                style={{ animationDelay: '0.45s' }}
              >
                Connectez-vous via l’authentification centralisée pour accéder à votre espace interne d’analyse.
              </p>
            </div>

            <div className="px-8 py-7 flex flex-col gap-5 bg-white">
              <div className="rounded-2xl border border-accent-primary/10 bg-accent-soft/40 px-5 py-4 text-sm text-text-secondary font-sans">
                Pour des raisons de sécurité, l’authentification est gérée par Keycloak.
              </div>

              <button
                type="button"
                onClick={onLogin}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-primary to-accent-secondary text-white py-3.5 font-bold hover:shadow-lg transition-all shadow-elevated font-sans text-[0.92rem] tracking-wide animate-slideInDown hover:-translate-y-0.5"
                style={{ animationDelay: '0.8s' }}
              >
                <LogIn className="h-4.5 w-4.5" />
                Se connecter avec Keycloak
              </button>

              <p
                className="text-xs text-text-muted text-center leading-relaxed font-sans animate-fadeIn"
                style={{ animationDelay: '0.9s' }}
              >
                Vous serez redirigé vers le portail d’authentification sécurisé.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}