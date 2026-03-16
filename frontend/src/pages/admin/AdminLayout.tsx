import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Logo from "../../components/Logo";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0c]">
        <div className="text-white">Verificando permissões...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0c] text-white p-4 text-center">
        <h1 className="text-2xl font-bold mb-4 text-red-500">Acesso Restrito</h1>
        <p className="mb-6">Você precisa estar logado para acessar esta área.</p>
        <button 
          onClick={() => navigate("/login")}
          className="bg-red-600 px-6 py-2 rounded-xl font-bold"
        >
          Fazer Login
        </button>
      </div>
    );
  }

  if (!user.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0c] text-white p-4 text-center">
        <h1 className="text-2xl font-bold mb-4 text-red-500">Acesso Negado</h1>
        <p className="mb-2">Sua conta ({user.email}) não tem privilégios de administrador.</p>
        <p className="mb-6 text-gray-400">Verifique se o deploy do servidor já terminou ou tente sair e entrar novamente.</p>
        <button 
          onClick={() => navigate("/")}
          className="bg-white/10 px-6 py-2 rounded-xl font-bold"
        >
          Voltar para Home
        </button>
      </div>
    );
  }

  const navItems = [
    { label: "Dashboard", path: "/admin" },
    { label: "Músicas", path: "/admin/songs" },
    { label: "Playlists", path: "/admin/playlists" },
    { label: "Configuração de Score", path: "/admin/score-config" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-[#0d0d12] border-r border-white/5 flex flex-col">
        <div className="p-8 border-b border-white/5 bg-[#0a0a0c]">
          <div className="flex items-center gap-3 mb-2">
            <Logo width={120} />
            <div className="bg-[#00f5ff] text-black text-[10px] px-1.5 py-0.5 font-black uppercase tracking-tighter">
              Admin
            </div>
          </div>
          <div className="text-[10px] text-gray-500 font-mono tracking-widest uppercase mt-4">
            System Control Center
          </div>
        </div>

        <nav className="flex-1 py-6">
          <div className="px-6 mb-4 text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em]">
            Menu Principal
          </div>
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`admin-sidebar-link flex items-center px-8 py-4 text-sm font-medium transition-all ${
                    isActive ? "active" : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="mt-10 px-6 mb-4 text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em]">
            Gestão Direta
          </div>
          <Link
            to="/"
            className="flex items-center px-8 py-4 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            Ir para o Site →
          </Link>
        </nav>

        {/* User Profile Area */}
        <div className="p-6 bg-[#0a0a0c] border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-tr from-[#00f5ff] to-[#2dd4bf] flex items-center justify-center text-black font-bold text-xs">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate">{user.name}</div>
              <div className="text-[10px] text-gray-500 truncate">{user.email}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[#0a0a0c]">
        {/* Top Header */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-10 bg-[#0a0a0c] sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00f5ff] animate-pulse"></div>
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">System Online</span>
          </div>
          <div className="flex items-center gap-6">
            <button className="text-xs text-gray-500 hover:text-white transition-colors uppercase tracking-widest font-bold">
              Logs
            </button>
            <button
              onClick={() => {}} // Could add logout here
              className="text-xs text-red-500 hover:text-red-400 transition-colors uppercase tracking-widest font-bold"
            >
              Sign Out
            </button>
          </div>
        </header>

        <div className="p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
