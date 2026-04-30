import { useEffect, useState } from 'react';
import { AuthView } from './components/AuthView';
import { ErrorView } from './components/ErrorView';
import keycloak from './auth/keycloak';
import { resolveUserRole, type UserRole } from './auth/roles';
import { SecOpsPage } from './pages/secops/SecOpsPage';
import { ManagerPage } from './pages/manager/ManagerPage';
import { AdminPage } from './pages/admin/AdminPage';

let authInitPromise: Promise<boolean> | null = null;

function App() {
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserName, setCurrentUserName] = useState('Utilisateur');
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        setIsAuthLoading(true);

        authInitPromise ??= keycloak.init({
          onLoad: 'check-sso',
          pkceMethod: 'S256',
          checkLoginIframe: false,
        });

        const authenticated = await authInitPromise;

        setIsAuthenticated(authenticated);

        if (authenticated) {
          const displayName =
            keycloak.tokenParsed?.name ||
            keycloak.tokenParsed?.preferred_username ||
            'Utilisateur';

          setCurrentUserName(displayName);
          setUserRole(resolveUserRole(keycloak));

          const refreshToken = async () => {
            try {
              await keycloak.updateToken(30);
            } catch {
              keycloak.login();
            }
          };

          keycloak.onTokenExpired = () => {
            void refreshToken();
          };
        } else {
          setUserRole(null);
        }
      } catch (error) {
        console.error('Erreur initialisation Keycloak :', error);
        setIsAuthenticated(false);
        setUserRole(null);
        authInitPromise = null;
      } finally {
        setIsAuthLoading(false);
      }
    };

    initAuth();
  }, []);

  const handleLogin = async () => {
    try {
      await keycloak.login();
    } catch (error) {
      console.error('Erreur login Keycloak :', error);
    }
  };

  const handleLogout = async () => {
    try {
      setCurrentUserName('Utilisateur');
      setUserRole(null);
      await keycloak.logout({
        redirectUri: globalThis.location.origin,
      });
    } catch (error) {
      console.error('Erreur logout Keycloak :', error);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-bg-page font-sans flex items-center justify-center">
        <div className="rounded-2xl border border-border-subtle bg-white px-8 py-6 shadow-card">
          <p className="text-sm font-semibold text-text-secondary">
            Initialisation de la session...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthView onLogin={handleLogin} />;
  }

  if (!userRole) {
    return (
      <ErrorView
        message="Votre compte ne dispose d'aucun role autorise dans l'application."
        onRetry={handleLogout}
      />
    );
  }

  if (userRole === 'secops_engineer') {
    return <SecOpsPage currentUserName={currentUserName} onLogout={handleLogout} />;
  }

  if (userRole === 'manager') {
    return <ManagerPage currentUserName={currentUserName} onLogout={handleLogout} />;
  }

  return <AdminPage currentUserName={currentUserName} onLogout={handleLogout} />;
}

export default App;