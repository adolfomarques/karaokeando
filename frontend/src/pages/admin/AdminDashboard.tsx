import { useState, useEffect } from "react";
import AdminLayout from "./AdminLayout";
import { getAdminStats, getAdminUsers, AdminUser } from "../../api";
import { useTranslation } from "react-i18next";

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, usersData] = await Promise.all([
          getAdminStats(),
          getAdminUsers()
        ]);
        setStats(statsData);
        setUsers(usersData);
      } catch (err: any) {
        setError(t("admin.invalidKey", "Chave inválida ou erro ao carregar dados"));
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [t]);

  if (loading) return <AdminLayout><div className="text-[#00f5ff] font-mono animate-pulse uppercase tracking-widest text-xs">Loading_System_Metrics...</div></AdminLayout>;
  if (error) return <AdminLayout><div className="text-red-500 font-mono text-xs border border-red-500/20 p-4 bg-red-500/5">{error}</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="max-w-7xl">
        <header className="mb-12">
          <h1 className="text-4xl font-black mb-2 tracking-tighter uppercase neon-glow-cyan text-white">
            {t("admin.dashboard", "Dashboard")} <span className="text-white/20">/</span> Central
          </h1>
          <p className="text-gray-500 text-sm font-mono tracking-widest uppercase">
             {t("admin.comingSoon", "📊 Dashboard simplificado • Analytics detalhado em breve")}
          </p>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 mb-16 stagger-in border border-white/5 bg-white/[0.02]">
          <div className="admin-card p-10 border-r border-white/5 relative group">
            <div className="absolute top-4 right-4 text-[10px] font-mono text-gray-700 uppercase group-hover:text-[#00f5ff] transition-colors">USR_MNG</div>
            <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-4">Total de Usuários</div>
            <div className="text-6xl font-black neon-text-cyan admin-stat-value text-[#00f5ff]">{stats?.userCount}</div>
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
        <div className="admin-card border border-white/5 bg-[#0d0d12]">
          <div className="px-10 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
            <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-gray-400">{t("admin.activeRooms", "Salas Ativas Agora")}</h2>
            <div className="text-[10px] font-mono text-gray-600">LIVE_FEED v1.0</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="admin-table-header text-gray-500 text-[10px] font-bold uppercase tracking-widest bg-black/50">
                  <th className="px-10 py-5">{t("admin.identifier", "Identificador")}</th>
                  <th className="px-10 py-5">{t("admin.owner", "Proprietário")}</th>
                  <th className="px-10 py-5">{t("admin.traffic", "Tráfego")}</th>
                  <th className="px-10 py-5 text-right">{t("admin.createdAt", "Data de Criação")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {stats?.recentRooms?.map((room: any) => (
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
                          <div className="h-full bg-[#00f5ff]" style={{ width: `${Math.min((room.visitors || 0) * 10, 100)}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-5 text-gray-500 text-right font-mono text-xs">
                      {new Date(room.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {(!stats?.recentRooms || stats.recentRooms.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-10 py-20 text-center text-gray-600 font-mono text-xs uppercase tracking-widest italic">
                      {t("admin.noData", "--- Sem Dados de Transmissão ---")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Users Table */}
        <div className="admin-card border border-white/5 bg-[#0d0d12] mt-8">
          <div className="px-10 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
            <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-gray-400">{t("admin.allUsers", "Todos os Usuários")}</h2>
            <div className="text-[10px] font-mono text-gray-600">USER_DB v1.0</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="admin-table-header text-gray-500 text-[10px] font-bold uppercase tracking-widest bg-black/50">
                  <th className="px-6 py-4">{t("admin.user.name", "Nome")}</th>
                  <th className="px-6 py-4">{t("admin.user.email", "Email")}</th>
                  <th className="px-6 py-4">{t("admin.user.phone", "Telefone")}</th>
                  <th className="px-6 py-4">{t("admin.user.city", "Cidade")}</th>
                  <th className="px-6 py-4">{t("admin.user.birthDate", "Nascimento")}</th>
                  <th className="px-6 py-4">{t("admin.user.gender", "Gênero")}</th>
                  <th className="px-6 py-4 text-center">{t("admin.user.canHost", "Anfitrião")}</th>
                  <th className="px-6 py-4 text-center">{t("admin.user.isAdmin", "Admin")}</th>
                  <th className="px-6 py-4 text-center">{t("admin.user.rooms", "Salas")}</th>
                  <th className="px-6 py-4 text-right">{t("admin.user.createdAt", "Criado em")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-[#00f5ff]/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-medium text-white">{user.name}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 font-mono text-xs">{user.email}</td>
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">{user.phone || "-"}</td>
                    <td className="px-6 py-4 text-gray-400">{user.city || "-"}</td>
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                      {user.birthDate ? new Date(user.birthDate).toLocaleDateString("pt-BR") : "-"}
                    </td>
                    <td className="px-6 py-4 text-gray-400">{user.gender || "-"}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-xs px-2 py-1 rounded ${user.canHost ? "bg-[#00f5ff]/20 text-[#00f5ff]" : "bg-white/5 text-gray-600"}`}>
                        {user.canHost ? "Sim" : "Não"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-xs px-2 py-1 rounded ${user.isAdmin ? "bg-red-500/20 text-red-400" : "bg-white/5 text-gray-600"}`}>
                        {user.isAdmin ? "Sim" : "Não"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-mono text-white">{user.roomsCreated}</span>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-500 font-mono text-xs">
                      {new Date(user.createdAt).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-10 py-20 text-center text-gray-600 font-mono text-xs uppercase tracking-widest italic">
                      --- Nenhum usuário encontrado ---
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
