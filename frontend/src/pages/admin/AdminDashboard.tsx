import { useState, useEffect } from "react";
import AdminLayout from "./AdminLayout";
import { getAdminStats, getAdminUsers, deleteAdminUser, bulkDeleteAdminUsers, AdminUser, runAdminPrewarm } from "../../api";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import AdminStatCard from "../../components/admin/AdminStatCard";
import AdminButton from "../../components/admin/AdminButton";
import AdminEmpty from "../../components/admin/AdminEmpty";
import ConfirmDialog from "../../components/admin/ConfirmDialog";

interface ConfirmState {
  title: string;
  message: string;
  confirmLabel: string;
  loading?: boolean;
  onConfirm: () => void;
}

function adminBadgeClass(user: AdminUser): string {
  return user.isAdmin ? "bg-red-500/15 text-red-400" : "bg-[#0a0a0a] text-white/40";
}

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
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [userSearch, setUserSearch] = useState("");

  const filteredUsers = users.filter((user) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      user.name.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q) ||
      (user.phone || "").toLowerCase().includes(q)
    );
  });

  const selectableUsers = filteredUsers.filter((user) => !user.isAdmin);
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

    setDeletingUserId(user.id);
    setConfirm((prev) => prev ? { ...prev, loading: true } : prev);
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
      setConfirm(null);
    }
  };

  const handleBulkDeleteUsers = async () => {
    if (selectedUserIds.length === 0) {
      toast.error("Selecione pelo menos um usuário.");
      return;
    }

    setBulkDeleting(true);
    setConfirm((prev) => prev ? { ...prev, loading: true } : prev);
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
        setConfirm(null);
        setBulkDeleting(false);
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
      setConfirm(null);
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

        if (res.addedSongs && res.addedSongs.length > 0) {
          console.log('🎵 Músicas adicionadas ao cache:', res.addedSongs);
        }
        if (res.skippedSongs && res.skippedSongs.length > 0) {
          console.log('⏭️ Músicas já estavam em cache:', res.skippedSongs);
        }

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

  if (loading) {
    return (
      <AdminLayout>
        <div className="max-w-7xl">
          <div className="mb-10 h-10 w-56 admin-skeleton"></div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="admin-card h-44 admin-skeleton"></div>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) return <AdminLayout><AdminEmpty title={error} /></AdminLayout>;

  return (
    <AdminLayout>
      <div className="max-w-7xl">
        <AdminPageHeader
          title={t("admin.dashboard", "Dashboard")}
          subtitle="Visão geral da plataforma em tempo real: usuários, salas ativas e o estado do cache de músicas."
        />

        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <AdminStatCard label="Usuários Cadastrados" value={stats?.userCount ?? 0} accent hint="user_count" />
          <AdminStatCard label="Salas Criadas" value={stats?.roomCount ?? 0} hint="rooms_total" />
          <AdminStatCard label="Músicas no Cache" value={stats?.cacheCount ?? stats?.songCount ?? 0} hint="cache_entries" />
        </div>

        {/* Pre-warm Control */}
        <div className="admin-card mb-8 border border-[#00f5ff]/20 bg-[#00f5ff]/[0.04] p-8">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="flex-1">
              <h2 className="mb-2 flex items-center gap-2 font-bold uppercase tracking-wider text-[#00f5ff]">
                🔥 {t("admin.prewarmTitle", "Aquecimento de Cache")}
              </h2>
              <p className="text-sm text-gray-400">
                {t("admin.prewarmDesc", "Busca automaticamente as músicas mais populares para deixar o sistema rápido antes do evento.")}
              </p>
            </div>
            <div className="flex items-end gap-4">
              <div className="flex flex-col">
                <label className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Quantidade
                </label>
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
                  className="admin-input w-24 font-mono"
                />
              </div>
              <AdminButton onClick={handlePrewarm} disabled={prewarming} size="lg">
                {prewarming ? "Aquecendo..." : t("admin.prewarmStart", "Aquecer Cache")}
              </AdminButton>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="admin-card border border-white/5 bg-[#0d0d12]">
          <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.01] px-8 py-5">
            <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-gray-400">
              {t("admin.activeRooms", "Salas Ativas")}
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-widest text-gray-600">
              {stats?.recentRooms?.length ?? 0} ao vivo
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="admin-th">{t("admin.identifier", "Código")}</th>
                  <th className="admin-th">{t("admin.owner", "Proprietário")}</th>
                  <th className="admin-th">{t("admin.traffic", "Visitantes")}</th>
                  <th className="admin-th" align="right">{t("admin.createdAt", "Criada em")}</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recentRooms?.map((room: any) => (
                  <tr key={room.code} className="admin-tr">
                    <td className="admin-td">
                      <span className="bg-[#00f5ff]/10 px-2 py-1 font-mono font-bold tracking-tighter text-[#00f5ff]">
                        {room.code}
                      </span>
                    </td>
                    <td className="admin-td font-medium text-gray-300">{room.owner}</td>
                    <td className="admin-td">
                      <div className="flex items-center gap-3">
                        <span className="text-white">{room.visitors}</span>
                        <div className="h-[2px] w-16 overflow-hidden bg-white/5">
                          <div className="h-full bg-[#00f5ff]" style={{ width: `${Math.min((room.visitors || 0) * 10, 100)}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="admin-td text-right font-mono text-xs text-gray-500">
                      {new Date(room.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {!stats?.recentRooms?.length && (
                  <tr>
                    <td colSpan={4} className="admin-td">
                      <AdminEmpty
                        title="Nenhuma sala ativa agora"
                        hint="As salas aparecem aqui em tempo real enquanto estão em uso."
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Users Table */}
        <div className="admin-card mt-8 border border-white/5 bg-[#0d0d12]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 bg-white/[0.01] px-8 py-5">
            <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-gray-400">
              {t("admin.allUsers", "Usuários Cadastrados")}
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Filtrar por nome, email ou telefone..."
                  className="admin-input w-64 py-2 pl-9 text-xs"
                />
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {userSearch && (
                <button
                  onClick={() => setUserSearch("")}
                  className="font-mono text-[10px] uppercase tracking-widest text-gray-500 transition-colors hover:text-[#00f5ff]"
                >
                  Limpar filtro ✕
                </button>
              )}
              <span className="font-mono text-[10px] uppercase tracking-widest text-gray-500">
                {userSearch ? `${filteredUsers.length}/${users.length}` : users.length} usuário(s)
              </span>
              {selectedUserIds.length > 0 && (
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#00f5ff]">
                  {selectedUserIds.length} selecionado(s)
                </span>
              )}
              <AdminButton
                variant="danger"
                size="sm"
                onClick={() =>
                  setConfirm({
                    title: "Excluir usuários selecionados",
                    message: `Excluir ${selectedUserIds.length} usuários selecionados? Esta ação não pode ser desfeita.`,
                    confirmLabel: "Excluir",
                    loading: bulkDeleting,
                    onConfirm: handleBulkDeleteUsers,
                  })
                }
                disabled={bulkDeleting || selectedUserIds.length === 0}
              >
                Excluir Selecionados
              </AdminButton>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="admin-th" align="center">
                    <input
                      type="checkbox"
                      checked={allSelectableChecked}
                      onChange={toggleSelectAllUsers}
                      className="h-4 w-4 rounded border-white/20 bg-black/50 accent-[#00f5ff]"
                      title="Selecionar todos os usuários não-admin"
                    />
                  </th>
                  <th className="admin-th">{t("admin.user.name", "Nome")}</th>
                  <th className="admin-th">{t("admin.user.email", "Email")}</th>
                  <th className="admin-th">{t("admin.user.phone", "Telefone")}</th>
                  <th className="admin-th">{t("admin.user.city", "Cidade")}</th>
                  <th className="admin-th">{t("admin.user.birthDate", "Nascimento")}</th>
                  <th className="admin-th">{t("admin.user.gender", "Gênero")}</th>
                  <th className="admin-th" align="center">{t("admin.user.canHost", "Anfitrião")}</th>
                  <th className="admin-th" align="center">{t("admin.user.isAdmin", "Admin")}</th>
                  <th className="admin-th" align="center">{t("admin.user.rooms", "Salas")}</th>
                  <th className="admin-th" align="right">Último acesso</th>
                  <th className="admin-th" align="right">{t("admin.user.createdAt", "Criado em")}</th>
                  <th className="admin-th" align="right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="admin-tr">
                    <td className="admin-td" align="center">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user.id)}
                        onChange={() => toggleUserSelection(user)}
                        disabled={user.isAdmin || bulkDeleting}
                        className="h-4 w-4 rounded border-white/20 bg-black/50 accent-[#00f5ff] disabled:opacity-40"
                        title={user.isAdmin ? "Administrador não pode ser selecionado" : "Selecionar usuário"}
                      />
                    </td>
                    <td className="admin-td font-medium text-white">{user.name}</td>
                    <td className="admin-td font-mono text-xs text-gray-400">{user.email}</td>
                    <td className="admin-td font-mono text-xs text-gray-500">{user.phone || "-"}</td>
                    <td className="admin-td text-gray-400">{user.city || "-"}</td>
                    <td className="admin-td font-mono text-xs text-gray-500">
                      {user.birthDate ? new Date(user.birthDate).toLocaleDateString("pt-BR") : "-"}
                    </td>
                    <td className="admin-td text-gray-400">{user.gender || "-"}</td>
                    <td className="admin-td" align="center">
                      <span className={`rounded px-2 py-1 text-xs ${user.canHost ? "bg-[#00f5ff]/15 text-[#00f5ff]" : "bg-white/5 text-gray-600"}`}>
                        {user.canHost ? "Sim" : "Não"}
                      </span>
                    </td>
                    <td className="admin-td" align="center">
                      <span className={`rounded px-2 py-1 text-xs ${adminBadgeClass(user)}`}>
                        {user.isAdmin ? "Sim" : "Não"}
                      </span>
                    </td>
                    <td className="admin-td" align="center">
                      <span className="font-mono text-white">{user.roomsCreated}</span>
                    </td>
                    <td className="admin-td text-right font-mono text-xs text-gray-500">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("pt-BR") : <span className="text-gray-700">nunca</span>}
                    </td>
                    <td className="admin-td text-right font-mono text-xs text-gray-500">
                      {new Date(user.createdAt).toLocaleString("pt-BR")}
                    </td>
                    <td className="admin-td text-right">
                      <AdminButton
                        variant="danger"
                        size="sm"
                        disabled={deletingUserId === user.id || user.isAdmin || bulkDeleting}
                        onClick={() =>
                          setConfirm({
                            title: "Excluir usuário",
                            message: `Excluir o usuário ${user.name} (${user.email})? Esta ação não pode ser desfeita.`,
                            confirmLabel: "Excluir",
                            loading: deletingUserId === user.id,
                            onConfirm: () => handleDeleteUser(user),
                          })
                        }
                      >
                        {deletingUserId === user.id ? "Excluindo..." : "Excluir"}
                      </AdminButton>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={13} className="admin-td">
                      <AdminEmpty
                        title={userSearch ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}
                        hint={userSearch ? `Não encontramos ninguém para "${userSearch}".` : undefined}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title || ""}
        message={confirm?.message || ""}
        confirmLabel={confirm?.confirmLabel}
        loading={confirm?.loading}
        onConfirm={() => confirm?.onConfirm()}
        onCancel={() => setConfirm(null)}
      />
    </AdminLayout>
  );
}
