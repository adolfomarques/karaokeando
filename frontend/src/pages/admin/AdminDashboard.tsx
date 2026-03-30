import { useState, useEffect } from "react";
import AdminLayout from "./AdminLayout";
import { getAdminStats, getAdminUsers, deleteAdminUser, bulkDeleteAdminUsers, AdminUser, runAdminPrewarm } from "../../api";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";

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

  const [prewarming, setPrewarming] = useState(false);
  const [prewarmQty, setPrewarmQty] = useState<number | "">("");
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const selectableUsers = users.filter((user) => !user.isAdmin);
  const selectableUserIds = selectableUsers.map((user) => user.id);
  const allSelectableChecked = selectableUserIds.length > 0 && selectableUserIds.every((id) => selectedUserIds.includes(id));

  const toggleUserSelection = (user: AdminUser) => {
    if (user.isAdmin) return;
    setSelectedUserIds((prev) => prev.includes(user.id) ? prev.filter((id) => id !== user.id) : [...prev, user.id]);
  };

  const toggleSelectAllUsers = () => {
    if (allSelectableChecked) {
      setSelectedUserIds([]);
      return;
    }
    setSelectedUserIds(selectableUserIds);
  };

  const handleDeleteUser = async (user: AdminUser) => {
    if (user.isAdmin) {
      toast.error("Não é permitido excluir outro administrador.");
      return;
    }

    const confirmed = window.confirm(`Excluir o usuário ${user.name} (${user.email})? Esta ação não pode ser desfeita.`);
    if (!confirmed) return;

    setDeletingUserId(user.id);
    try {
      const res = await deleteAdminUser(user.id);
      if (res.success) {
        setUsers((prev) => prev.filter((u) => u.id !== user.id));
        setSelectedUserIds((prev) => prev.filter((id) => id !== user.id));
        setStats((prev: any) => prev ? { ...prev, userCount: Math.max((prev.userCount || 1) - 1, 0) } : prev);
        toast.success("Usuário excluído com sucesso.");
      } else {
        const msg = res.error === "cannot_delete_admin"
          ? "Não é permitido excluir administrador."
          : res.error === "cannot_delete_self"
            ? "Você não pode excluir seu próprio usuário."
            : "Erro ao excluir usuário.";
        toast.error(msg);
      }
    } catch {
      toast.error("Erro ao excluir usuário.");
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleBulkDeleteUsers = async () => {
    if (selectedUserIds.length === 0) {
      toast.error("Selecione pelo menos um usuário.");
      return;
    }

    const confirmed = window.confirm(`Excluir ${selectedUserIds.length} usuários selecionados? Esta ação não pode ser desfeita.`);
    if (!confirmed) return;

    setBulkDeleting(true);
    try {
      const res = await bulkDeleteAdminUsers(selectedUserIds);
      if (!res.success) {
        const fallbackResults = await Promise.all(selectedUserIds.map((id) => deleteAdminUser(id)));
        const deletedIdsFallback = selectedUserIds.filter((_, index) => fallbackResults[index]?.success);
        const failedFallback = selectedUserIds.length - deletedIdsFallback.length;

        if (deletedIdsFallback.length > 0) {
          setUsers((prev) => prev.filter((user) => !deletedIdsFallback.includes(user.id)));
          setSelectedUserIds([]);
          setStats((prev: any) => prev ? { ...prev, userCount: Math.max((prev.userCount || 0) - deletedIdsFallback.length, 0) } : prev);
          toast.success(`${deletedIdsFallback.length} usuário(s) excluído(s). ${failedFallback} falha(s).`);
        } else {
          toast.error("Erro ao excluir usuários em lote.");
        }
        return;
      }

      const failedIds = res.skipped?.failedIds || [];
      const deletedIds = selectedUserIds.filter(
        (id) =>
          !(res.skipped?.adminIds || []).includes(id) &&
          !(res.skipped?.selfIds || []).includes(id) &&
          !(res.skipped?.notFoundIds || []).includes(id) &&
          !failedIds.includes(id)
      );
      setUsers((prev) => prev.filter((user) => !deletedIds.includes(user.id)));
      setSelectedUserIds([]);
      setStats((prev: any) => prev ? { ...prev, userCount: Math.max((prev.userCount || 0) - (res.deletedCount || 0), 0) } : prev);

      const skippedCount = (res.skipped?.adminIds?.length || 0) + (res.skipped?.selfIds?.length || 0) + (res.skipped?.notFoundIds?.length || 0) + failedIds.length;
      if ((res.deletedCount || 0) > 0) {
        toast.success(`${res.deletedCount} usuário(s) excluído(s) com sucesso.${skippedCount > 0 ? ` ${skippedCount} item(ns) ignorado(s).` : ""}`);
      } else {
        toast.error("Nenhum usuário elegível para exclusão em lote.");
      }
    } catch {
      toast.error("Erro ao excluir usuários em lote.");
    } finally {
      setBulkDeleting(false);
    }
  };

  const handlePrewarm = async () => {
    const qty = prewarmQty === "" ? undefined : Number(prewarmQty);
    const confirmMsg = qty 
      ? `Deseja aquecer o cache com ${qty} músicas? Isso pode levar alguns minutos.`
      : "Deseja iniciar o aquecimento automático do cache? Isso pode levar alguns minutos.";
    
    if (!window.confirm(confirmMsg)) return;
    setPrewarming(true);
    try {
      const res = await runAdminPrewarm(qty);
      if (res.success) {
        const message = res.message || `Aquecimento concluído! ${res.count} músicas adicionadas ao cache.`;
        toast.success(message);
        
        // Show detailed result in console for admin review
        if (res.addedSongs && res.addedSongs.length > 0) {
          console.log('🎵 Músicas adicionadas ao cache:', res.addedSongs);
        }
        if (res.skippedSongs && res.skippedSongs.length > 0) {
          console.log('⏭️ Músicas já estavam em cache:', res.skippedSongs);
        }
        
        // Refresh stats
        const statsData = await getAdminStats();
        setStats(statsData);
      } else {
        toast.error(res.error || t("admin.prewarmError", "Erro ao realizar aquecimento"));
      }
    } catch (err) {
      toast.error(t("admin.prewarmError", "Erro ao realizar aquecimento"));
    } finally {
      setPrewarming(false);
    }
  };

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 stagger-in">
          <div className="admin-card admin-stat-card p-10 relative group">
            <div className="absolute top-4 right-4 text-[10px] font-mono text-gray-700 uppercase group-hover:text-[#00f5ff] transition-colors">USR_MNG</div>
            <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Total de Usuários</div>
            <div className="text-6xl font-black neon-text-cyan admin-stat-value text-[#00f5ff]">{stats?.userCount}</div>
            <div className="mt-4 h-1 w-12 bg-[#00f5ff]/20"></div>
          </div>
          <div className="admin-card admin-stat-card p-10 relative group">
            <div className="absolute top-4 right-4 text-[10px] font-mono text-gray-700 uppercase group-hover:text-[#00f5ff] transition-colors">RM_CTRL</div>
            <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Salas Criadas</div>
            <div className="text-6xl font-black text-white admin-stat-value">{stats?.roomCount}</div>
            <div className="mt-4 h-1 w-12 bg-white/10"></div>
          </div>
          <div className="admin-card admin-stat-card p-10 relative group">
            <div className="absolute top-4 right-4 text-[10px] font-mono text-gray-700 uppercase group-hover:text-[#00f5ff] transition-colors">LIB_INF</div>
            <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Músicas no Cache</div>
            <div className="text-6xl font-black text-white admin-stat-value">{stats?.cacheCount ?? stats?.songCount}</div>
            <div className="mt-4 h-1 w-12 bg-white/10"></div>
          </div>
        </div>

        {/* Pre-warm Control */}
        <div className="admin-card border border-[#00f5ff]/20 bg-[#00f5ff]/5 p-8 mb-8 flex flex-col md:flex-row items-center justify-between gap-6 stagger-in">
          <div className="flex-1">
            <h2 className="text-[#00f5ff] font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
              🔥 {t("admin.prewarmTitle", "Aquecimento de Cache (Pre-warm)")}
            </h2>
            <p className="text-gray-400 text-sm">
              {t("admin.prewarmDesc", "Faz a busca automática das músicas mais populares para deixar o sistema rápido antes do evento.")}
            </p>
            <p className="text-gray-500 text-xs mt-1">
              Total configurado no sistema: 100+ músicas
            </p>
          </div>
          <div className="flex items-end gap-4">
            <div className="flex flex-col">
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Qtd Novas</label>
              <input
                type="number"
                min="1"
                max="100"
                value={prewarmQty}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") {
                    setPrewarmQty("");
                  } else {
                    const num = parseInt(val);
                    if (num >= 1 && num <= 100) {
                      setPrewarmQty(num);
                    }
                  }
                }}
                placeholder="50"
                className="w-20 px-3 py-2 bg-black/50 border border-white/10 rounded text-white text-sm focus:border-[#00f5ff] focus:outline-none"
              />
            </div>
            <button
              onClick={handlePrewarm}
              disabled={prewarming}
              className={`px-8 py-3 rounded font-bold uppercase tracking-widest text-xs transition-all ${
                prewarming 
                  ? "bg-gray-800 text-gray-500 cursor-not-allowed" 
                  : "bg-[#00f5ff] text-black hover:bg-white shadow-[0_0_20px_rgba(0,245,255,0.3)]"
              }`}
            >
              {prewarming ? "WARMING_UP..." : t("admin.prewarmStart", "Começar")}
            </button>
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
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-gray-500">{selectedUserIds.length} selecionado(s)</span>
              <button
                onClick={handleBulkDeleteUsers}
                disabled={bulkDeleting || selectedUserIds.length === 0}
                className={`px-3 py-2 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
                  bulkDeleting || selectedUserIds.length === 0
                    ? "bg-red-900/20 text-red-400/50 cursor-not-allowed"
                    : "bg-red-500/20 text-red-300 hover:bg-red-500/30"
                }`}
              >
                {bulkDeleting ? "Excluindo..." : "Excluir Selecionados"}
              </button>
              <div className="text-[10px] font-mono text-gray-600">USER_DB v1.1</div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="admin-table-header text-gray-500 text-[10px] font-bold uppercase tracking-widest bg-black/50">
                  <th className="px-4 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={allSelectableChecked}
                      onChange={toggleSelectAllUsers}
                      className="h-4 w-4 rounded border-white/20 bg-black/50 accent-[#00f5ff]"
                      title="Selecionar todos os usuários não-admin"
                    />
                  </th>
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
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-[#00f5ff]/[0.02] transition-colors group">
                    <td className="px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user.id)}
                        onChange={() => toggleUserSelection(user)}
                        disabled={user.isAdmin || bulkDeleting}
                        className="h-4 w-4 rounded border-white/20 bg-black/50 accent-[#00f5ff] disabled:opacity-40"
                        title={user.isAdmin ? "Administrador não pode ser selecionado" : "Selecionar usuário"}
                      />
                    </td>
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
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteUser(user)}
                        disabled={deletingUserId === user.id || user.isAdmin || bulkDeleting}
                        className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
                          user.isAdmin
                            ? "bg-white/5 text-gray-600 cursor-not-allowed"
                            : deletingUserId === user.id
                              ? "bg-red-900/30 text-red-300 cursor-not-allowed"
                              : "bg-red-500/20 text-red-300 hover:bg-red-500/30"
                        }`}
                        title={user.isAdmin ? "Administrador não pode ser excluído" : "Excluir usuário"}
                      >
                        {deletingUserId === user.id ? "Excluindo..." : "Excluir"}
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-10 py-20 text-center text-gray-600 font-mono text-xs uppercase tracking-widest italic">
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
