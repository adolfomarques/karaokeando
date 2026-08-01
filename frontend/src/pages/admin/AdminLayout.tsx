import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Logo from "../../components/Logo";
import { useTranslation } from "react-i18next";

const ICONS: Record<string, React.ReactNode> = {
  dashboard: (
    <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  songs: (
    <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19a3 3 0 11-6 0 3 3 0 016 0zm12-3a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  playlists: (
    <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h10M4 18h10" />
    </svg>
  ),
  score: (
    <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  ),
  blocked: (
    <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  logins: (
    <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  ),
  site: (
    <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  ),
};

function MenuIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close the sidebar when navigating
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Lock body scroll while the mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  // Auto-redirect when auth state resolves
  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/login", { state: { redirectTo: location.pathname }, replace: true });
    }
  }, [loading, user, navigate, location.pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="flex items-center gap-3 text-[#00f5ff]">
          <div className="h-5 w-5 rounded-full border-2 border-[#00f5ff]/25 border-t-[#00f5ff] animate-spin"></div>
          <span className="font-mono text-xs uppercase tracking-widest">
            {t("admin.verifyingPermissions", "Verificando permissões...")}
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!user.isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] p-4 text-center text-white">
        <h2 className="mb-4 text-2xl font-black uppercase tracking-tight text-red-500">
          {t("admin.accessDenied", "Acesso Negado")}
        </h2>
        <p className="mb-2">{t("admin.noAdminPrivileges", { email: user.email })}</p>
        <p className="mb-4 text-gray-400">
          {t("admin.checkDeploy", "Verifique se o deploy do servidor já terminou ou tente sair e entrar novamente.")}
        </p>
        <p className="mb-6 rounded border border-yellow-400/20 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-400">
          ⚠️ Se você acabou de ser promovido a admin, faça logout e login novamente para atualizar seu token.
        </p>
        <button
          onClick={() => navigate("/")}
          className="rounded bg-white/10 px-6 py-2 font-bold"
        >
          {t("admin.backToHome", "Voltar para Home")}
        </button>
      </div>
    );
  }

  const handleSignOut = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const navItems = [
    { label: t("admin.dashboard", "Dashboard"), path: "/admin", icon: ICONS.dashboard },
    { label: t("admin.songs", "Músicas"), path: "/admin/songs", icon: ICONS.songs },
    { label: t("admin.playlists", "Playlists"), path: "/admin/playlists", icon: ICONS.playlists },
    { label: t("admin.scoreConfig", "Configuração de Score"), path: "/admin/score-config", icon: ICONS.score },
    { label: t("admin.blockedChannels", "Canais Bloqueados"), path: "/admin/blocked-channels", icon: ICONS.blocked },
    { label: t("admin.logins", "Logins"), path: "/admin/logins", icon: ICONS.logins },
  ];

  return (
    <div className="admin-layout min-h-screen bg-[#0a0a0a] font-sans text-white md:flex">
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-white/5 bg-[#0a0a0a]/95 px-4 backdrop-blur md:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Abrir menu de navegação"
          className="rounded p-2 text-white/70 transition-colors hover:text-[#00f5ff]"
        >
          <MenuIcon />
        </button>
        <div className="flex items-center gap-3">
          <Logo width={90} />
          <span className="bg-[#00f5ff] px-1.5 py-0.5 text-[10px] font-black uppercase tracking-tighter text-black">
            Admin
          </span>
        </div>
        <button
          onClick={handleSignOut}
          aria-label="Sair"
          className="rounded p-2 text-white/50 transition-colors hover:text-red-400"
        >
          <LogoutIcon />
        </button>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/5 bg-[#0d0d12] transition-transform duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-white/5 bg-[#0a0a0a] p-8">
          <div className="flex items-center gap-3">
            <Logo width={120} />
            <span className="bg-[#00f5ff] px-1.5 py-0.5 text-[10px] font-black uppercase tracking-tighter text-black">
              Admin
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500">
              {t("admin.systemControl", "System Control Center")}
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Fechar menu"
              className="rounded p-1 text-white/50 hover:text-white md:hidden"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6">
          <div className="mb-4 px-8 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600">
            {t("admin.mainMenu", "Menu Principal")}
          </div>
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`admin-sidebar-link flex items-center gap-4 px-8 py-3.5 text-sm font-medium transition-all ${
                    isActive ? "active" : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="mb-4 mt-10 px-8 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600">
            {t("admin.directManagement", "Gestão Direta")}
          </div>
          <Link
            to="/"
            className="flex items-center gap-4 px-8 py-3.5 text-sm font-medium text-gray-400 transition-all hover:bg-white/5 hover:text-white"
          >
            {ICONS.site}
            <span>{t("admin.goToSite", "Ir para o Site")}</span>
          </Link>
        </nav>

        {/* User Profile Area */}
        <div className="border-t border-white/5 bg-[#0a0a0a] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center bg-gradient-to-tr from-[#00f5ff] to-[#2dd4bf] text-xs font-bold text-black">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">{user.name}</div>
              <div className="truncate text-[10px] text-gray-500">{user.email}</div>
            </div>
            <button
              onClick={handleSignOut}
              title={t("admin.signOut", "Sair")}
              className="rounded p-2 text-white/60 transition-colors hover:bg-red-500/15 hover:text-red-300"
            >
              <LogoutIcon />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 hidden h-16 items-center justify-between border-b border-white/5 bg-[#0a0a0a]/90 px-10 backdrop-blur md:flex">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00f5ff] opacity-60"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00f5ff]"></span>
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
              {t("admin.systemOnline", "System Online")}
            </span>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 rounded border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-gray-400 transition-all hover:border-red-500/40 hover:text-red-400"
          >
            <LogoutIcon />
            {t("admin.signOut", "Sair")}
          </button>
        </header>

        <div className="p-6 pt-20 md:p-10 md:pt-10">{children}</div>
      </main>
    </div>
  );
}
