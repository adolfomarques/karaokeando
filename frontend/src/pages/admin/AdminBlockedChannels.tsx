import { useEffect, useState } from "react";
import { getAdminBlockedChannels, addAdminBlockedChannel, deleteAdminBlockedChannel, type AdminBlockedChannel } from "../../api";
import AdminLayout from "./AdminLayout";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import AdminButton from "../../components/admin/AdminButton";
import AdminEmpty from "../../components/admin/AdminEmpty";
import ConfirmDialog from "../../components/admin/ConfirmDialog";

export default function AdminBlockedChannels() {
  const { t } = useTranslation();
  const [channels, setChannels] = useState<AdminBlockedChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [newChannelId, setNewChannelId] = useState("");
  const [newChannelName, setNewChannelName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState<AdminBlockedChannel | null>(null);

  const loadChannels = async () => {
    try {
      const data = await getAdminBlockedChannels();
      setChannels(data);
    } catch (err) {
      toast.error(t("admin.connError", "Erro ao carregar canais bloqueados"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChannels();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelId.trim()) return;

    try {
      await addAdminBlockedChannel(newChannelId.trim(), newChannelName.trim());
      toast.success(t("admin.addSuccess", "Canal bloqueado com sucesso"));
      setNewChannelId("");
      setNewChannelName("");
      loadChannels();
    } catch (err) {
      toast.error(t("admin.addError", "Erro ao bloquear canal"));
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await deleteAdminBlockedChannel(id);
      toast.success(t("admin.deleteSuccess", "Canal desbloqueado"));
      loadChannels();
    } catch (err) {
      toast.error(t("admin.deleteError", "Erro ao remover"));
    } finally {
      setDeleting(false);
      setConfirm(null);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="max-w-7xl">
          <div className="mb-10 h-10 w-56 admin-skeleton"></div>
          <div className="admin-card border border-white/5 bg-[#0d0d12] p-8">
            <div className="admin-skeleton h-12 mb-6"></div>
            <div className="admin-skeleton h-48"></div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl">
        <AdminPageHeader
          title={t("admin.blockedChannels", "Canais Bloqueados")}
          subtitle="Canais do YouTube que não devem aparecer nos resultados de busca das salas."
          actions={
            <div className="text-right">
              <div className="font-mono text-xl font-black text-[#00f5ff]">{channels.length}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">bloqueados</div>
            </div>
          }
        />

        <form onSubmit={handleAdd} className="admin-card mb-8 border border-white/5 bg-[#0d0d12] p-8">
          <h2 className="mb-6 text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500">Bloquear Novo Canal</h2>
          <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-gray-500">
                ID do Canal (obrigatório)
              </label>
              <input
                type="text"
                placeholder="UCxxxxxxxxxxxxxxxxxxxxx"
                className="admin-input font-mono"
                value={newChannelId}
                onChange={(e) => setNewChannelId(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-gray-500">
                Nome (opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Canal de Música"
                className="admin-input font-mono"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
              />
            </div>
          </div>
          <AdminButton type="submit" size="lg">
            Bloquear Canal
          </AdminButton>
        </form>

        <div className="admin-card border border-white/5 bg-[#0d0d12]">
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="admin-th">Canal</th>
                  <th className="admin-th">ID</th>
                  <th className="admin-th" align="right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((channel) => (
                  <tr key={channel.id} className="admin-tr group">
                    <td className="admin-td">
                      <div className="mb-1 max-w-md truncate font-bold uppercase tracking-tighter text-gray-200">
                        {channel.name || "Nome não informado"}
                      </div>
                      <div className="text-[10px] italic text-gray-600">
                        Adicionado em {new Date(channel.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="admin-td">
                      <div className="font-mono text-xs text-gray-500 transition-colors group-hover:text-[#00f5ff]">
                        {channel.channelId}
                      </div>
                    </td>
                    <td className="admin-td text-right">
                      <AdminButton
                        variant="danger"
                        size="sm"
                        disabled={deleting}
                        onClick={() => setConfirm(channel)}
                      >
                        Desbloquear
                      </AdminButton>
                    </td>
                  </tr>
                ))}
                {channels.length === 0 && (
                  <tr>
                    <td colSpan={3} className="admin-td">
                      <AdminEmpty
                        title="Nenhum canal bloqueado"
                        hint="Os canais bloqueados aqui não aparecerão nas buscas das salas."
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
        title="Desbloquear canal"
        message={confirm ? `Tem certeza que deseja desbloquear o canal "${confirm.name || confirm.channelId}"? Ele voltará a aparecer nas buscas.` : ""}
        confirmLabel="Desbloquear"
        loading={deleting}
        onConfirm={() => confirm && handleDelete(confirm.id)}
        onCancel={() => setConfirm(null)}
      />
    </AdminLayout>
  );
}
