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
      <div className="max-w-6xl">
        <h1 className="text-3xl font-bold mb-8">Dashboard Administrativo</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-[#121216] p-6 rounded-2xl border border-white/5">
            <div className="text-gray-400 text-sm mb-1">Total de Usuários</div>
            <div className="text-4xl font-bold text-red-500">{stats?.userCount}</div>
          </div>
          <div className="bg-[#121216] p-6 rounded-2xl border border-white/5">
            <div className="text-gray-400 text-sm mb-1">Salas Criadas</div>
            <div className="text-4xl font-bold text-red-500">{stats?.roomCount}</div>
          </div>
          <div className="bg-[#121216] p-6 rounded-2xl border border-white/5">
            <div className="text-gray-400 text-sm mb-1">Músicas no Cache</div>
            <div className="text-4xl font-bold text-red-500">{stats?.songCount}</div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-[#121216] rounded-2xl border border-white/5 overflow-hidden">
          <div className="p-6 border-b border-white/5">
            <h2 className="text-xl font-semibold">Salas Recentes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 text-gray-400 text-sm">
                  <th className="px-6 py-4">Código</th>
                  <th className="px-6 py-4">Dono</th>
                  <th className="px-6 py-4">Visitantes</th>
                  <th className="px-6 py-4">Criada em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {stats?.recentRooms.map((room) => (
                  <tr key={room.code} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-red-400">{room.code}</td>
                    <td className="px-6 py-4">{room.owner}</td>
                    <td className="px-6 py-4 text-gray-400">{room.visitors}</td>
                    <td className="px-6 py-4 text-gray-500 text-sm">
                      {new Date(room.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {stats?.recentRooms && stats.recentRooms.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-gray-500">Nenhuma sala ativa no momento.</td>
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
