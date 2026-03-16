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
    <div className="min-h-screen bg-[#0a0a0c] text-white flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-[#121216] border-r border-white/10 p-6 flex flex-col">
        <div className="mb-10 flex justify-center md:justify-start">
          <Logo width={140} />
          <span className="ml-2 text-xs bg-red-600 px-1.5 py-0.5 rounded font-bold self-start mt-1">ADMIN</span>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`block px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-white/10">
          <Link to="/" className="text-sm text-gray-500 hover:text-white transition-colors">
            ← Voltar para o Site
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
