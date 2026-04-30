import { useEffect, useState } from 'react';
import {
  Menu,
  X,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import logo_attijari from '../../assets/logoAttijari.png';

export interface NavItem<TSection extends string = string> {
  key: TSection;
  label: string;
  icon: LucideIcon;
}

interface NavbarProps<TSection extends string = string> {
  isApiConnected: boolean;
  isDemoMode: boolean;
  activeSection: TSection;
  currentUserName: string;
  onNavigate: (section: TSection) => void;
  onLogout: () => void;
  navItems: NavItem<TSection>[];
}

export function Navbar<TSection extends string = string>({
  isApiConnected,
  isDemoMode,
  activeSection,
  currentUserName,
  onNavigate,
  onLogout,
  navItems,
}: Readonly<NavbarProps<TSection>>) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    globalThis.addEventListener('keydown', handleEscape);
    return () => globalThis.removeEventListener('keydown', handleEscape);
  }, []);

  const navigate = (section: TSection) => {
    onNavigate(section);
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    setIsMenuOpen(false);
    onLogout();
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className="mx-3 mt-3 md:mx-6">
          <div className="relative flex h-[74px] items-center justify-between rounded-2xl border border-white/60 bg-white/90 px-4 md:px-6 backdrop-blur-xl shadow-[0_10px_35px_rgba(15,23,42,0.08)]">
            <div className="flex items-center gap-3 md:gap-4">
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="group flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm active:scale-[0.98]"
                aria-label="Ouvrir le menu"
                aria-expanded={isMenuOpen}
              >
                {isMenuOpen ? (
                  <X className="h-5 w-5 transition-transform duration-200 group-hover:rotate-90" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>

              <div className="flex items-center">
                <img
                  src={logo_attijari}
                  alt="Attijari logo"
                  className="h-8 w-auto object-contain md:h-9"
                />
              </div>
            </div>

            <div className="absolute left-1/2 hidden -translate-x-1/2 lg:flex flex-col items-center">
              <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400">
                Security Platform
              </span>
              <h1 className="mt-0.5 text-sm font-semibold tracking-[0.01em] text-slate-800">
                Threat Modeling Workspace
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden xl:flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 px-3.5 py-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isApiConnected ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <span className="text-xs font-semibold text-slate-600">
                  {isApiConnected ? 'API connectée' : 'Mode local'}
                </span>
              </div>

              {isDemoMode && (
                <div className="hidden md:flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5">
                  <span className="text-xs font-semibold text-amber-700">
                    Demo mode
                  </span>
                </div>
              )}

              <div className="hidden md:flex items-center gap-3 rounded-full border border-slate-200 bg-white px-2 py-2 shadow-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-slate-900 to-slate-700 text-sm font-semibold text-white">
                  {currentUserName?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="pr-2">
                  <p className="text-xs text-slate-400 leading-none">Connecté en tant que</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800 leading-none">
                    {currentUserName}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {isMenuOpen && (
        <>
          <button
            type="button"
            onClick={() => setIsMenuOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[3px]"
            aria-label="Fermer le menu"
          />

          <aside className="fixed left-3 top-[96px] z-50 w-[min(92vw,380px)] overflow-hidden rounded-3xl border border-white/70 bg-white/95 shadow-[0_24px_70px_rgba(15,23,42,0.18)] backdrop-blur-2xl md:left-6 md:top-[102px]">
            <div className="h-1 w-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-400" />

            <div className="border-b border-slate-100 px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Navigation
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                Workspace Menu
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Accédez rapidement aux sections principales.
              </p>
            </div>

            <div className="p-4">
              <div className="space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.key;

                  return (
                    <button
                      key={item.key}
                      onClick={() => navigate(item.key)}
                      className={`group w-full rounded-2xl border px-4 py-3.5 text-left transition-all duration-200 ${
                        isActive
                          ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                          : 'border-transparent bg-slate-50/80 text-slate-700 hover:border-slate-200 hover:bg-white hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                              isActive
                                ? 'bg-white/12 text-white'
                                : 'bg-white text-slate-700 border border-slate-200'
                            }`}
                          >
                            <Icon className="h-4.5 w-4.5" />
                          </div>

                          <div>
                            <p
                              className={`text-sm font-semibold ${
                                isActive ? 'text-white' : 'text-slate-800'
                              }`}
                            >
                              {item.label}
                            </p>
                            <p
                              className={`text-xs ${
                                isActive ? 'text-slate-300' : 'text-slate-400'
                              }`}
                            >
                              Ouvrir la section
                            </p>
                          </div>
                        </div>

                        <ChevronRight
                          className={`h-4 w-4 transition-transform duration-200 ${
                            isActive
                              ? 'text-slate-300'
                              : 'text-slate-400 group-hover:translate-x-1'
                          }`}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="my-4 border-t border-slate-100" />

              <button
                onClick={handleLogout}
                className="group flex w-full items-center justify-between rounded-2xl border border-red-100 bg-red-50 px-4 py-3.5 text-left transition-all duration-200 hover:bg-red-100"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-red-100 text-red-600">
                    <LogOut className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-red-700">Déconnexion</p>
                    <p className="text-xs text-red-400">Quitter la session en cours</p>
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 text-red-400 transition-transform duration-200 group-hover:translate-x-1" />
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}