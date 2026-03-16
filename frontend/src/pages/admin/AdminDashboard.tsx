import { useState, useEffect } from "react";
import AdminLayout from "./AdminLayout";
import { getAdminStats, AdminStats } from "../../api";

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getAdminStats()
      .then(setStats)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <AdminLayout><div>Carregando estatísticas...</div></AdminLayout>;
  if (error) return <AdminLayout><div className="text-red-500">Erro: {error}</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="max-w-7xl">
        <header className="mb-12">
          <h1 className="text-4xl font-black mb-2 tracking-tighter uppercase neon-glow-cyan">
            Dashboard <span className="text-white/20">/</span> Central
          </h1>
          <p className="text-gray-500 text-sm font-mono tracking-widest uppercase">
            Visão Geral do Ecossistema KaraokeFactory
          </p>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 mb-16 stagger-in border border-white/5 bg-white/[0.02]">
          <div className="admin-card p-10 border-r border-white/5 relative group">
            <div className="absolute top-4 right-4 text-[10px] font-mono text-gray-700 uppercase group-hover:text-[#00f5ff] transition-colors">USR_MNG</div>
            <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-4">Total de Usuários</div>
            <div className="text-6xl font-black neon-text-cyan admin-stat-value">{stats?.userCount}</div>
            <div className="mt-4 h-1 w-12 bg-[#00f5ff]/20"></div>
          </div>
          <div className="admin-card p-10 border-r border-white/5 relative group">
            <div className="absolute top-4 right-4 text-[10px] font-mono text-gray-700 uppercase group-hover:text-[#00f5ff] transition-colors">RM_CTRL</div>
            <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-4">Salas Criadas</div>
            <div className="text-6xl font-black text-white admin-stat-value">{stats?.roomCount}</div>
            <div className="mt-4 h-1 w-12 bg-white/10"></div>
          </div>
          <div className="admin-card p-10 relative group">
            <div className="absolute top-4 right-4 text-[10px] font-mono text-gray-700 uppercase group-hover:text-[#00f5ff] transition-colors">LIB_INF</div>
            <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-4">Músicas no Cache</div>
            <div className="text-6xl font-black text-white admin-stat-value">{stats?.songCount}</div>
            <div className="mt-4 h-1 w-12 bg-white/10"></div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="admin-card border border-white/5">
          <div className="px-10 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
            <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-gray-400">Salas Ativas Recentemente</h2>
            <div className="text-[10px] font-mono text-gray-600">LIVE_FEED v1.0</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="admin-table-header text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                  <th className="px-10 py-5">Identificador</th>
                  <th className="px-10 py-5">Proprietário</th>
                  <th className="px-10 py-5">Trafego</th>
                  <th className="px-10 py-5 text-right">Data de Criação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {stats?.recentRooms.map((room) => (
                  <tr key={room.code} className="hover:bg-[#00f5ff]/[0.02] transition-colors group">
                    <td className="px-10 py-5">
                      <span className="font-mono font-bold text-[#00f5ff] bg-[#00f5ff]/10 px-2 py-1 tracking-tighter group-hover:bg-[#00f5ff] group-hover:text-black transition-colors">
                        {room.code}
                      </span>
                    </td>
                    <td className="px-10 py-5 text-gray-300 font-medium">{room.owner}</td>
                    <td className="px-10 py-5">
                      <div className="flex items-center gap-2">
                        <span className="text-white">{room.visitors}</span>
                        <div className="flex-1 h-[2px] w-12 bg-white/5 overflow-hidden">
                          <div className="h-full bg-[#00f5ff]" style={{ width: `${Math.min(room.visitors * 10, 100)}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-5 text-gray-500 text-right font-mono text-xs">
                      {new Date(room.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {stats?.recentRooms && stats.recentRooms.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-10 py-20 text-center text-gray-600 font-mono text-xs uppercase tracking-widest italic">
                      --- Sem Dados de Transmissão ---
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
