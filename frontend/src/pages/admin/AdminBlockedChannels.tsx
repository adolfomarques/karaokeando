import { useEffect, useState } from "react";
import { getAdminBlockedChannels, addAdminBlockedChannel, deleteAdminBlockedChannel, type AdminBlockedChannel } from "../../api";
import AdminLayout from "./AdminLayout";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";

export default function AdminBlockedChannels() {
  const { t } = useTranslation();
  const [channels, setChannels] = useState<AdminBlockedChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [newChannelId, setNewChannelId] = useState("");
  const [newChannelName, setNewChannelName] = useState("");

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
    if (!window.confirm(t("admin.confirmUnblockChannel", "Tem certeza que deseja desbloquear este canal?"))) return;
    try {
      await deleteAdminBlockedChannel(id);
      toast.success(t("admin.deleteSuccess", "Canal desbloqueado"));
      loadChannels();
    } catch (err) {
      toast.error(t("admin.deleteError", "Erro ao remover"));
    }
  };

  if (loading) return <AdminLayout><div className="text-[#00f5ff] font-mono animate-pulse uppercase tracking-widest text-xs">{t("admin.downloadingRegistry", "Downloading_Registry...")}</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="max-w-7xl">
        <header className="mb-12">
          <h1 className="text-4xl font-black mb-2 tracking-tighter uppercase neon-glow-cyan">
             {t("admin.blockedChannels", "Canais Bloqueados")} <span className="text-white/20">/</span> {t("admin.security", "Filtro")}
          </h1>
          <p className="text-gray-500 text-sm font-mono tracking-widest uppercase">
            {t("admin.blocklistManagement", "Gerenciamento de canais que não devem aparecer nas buscas")}
          </p>
        </header>

        <form onSubmit={handleAdd} className="mb-12 admin-card border border-white/5 bg-[#0d0d12] p-8">
          <h2 className="text-xs font-mono font-bold text-gray-500 uppercase tracking-[0.3em] mb-6">Bloquear Novo Canal</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-[10px] text-gray-600 font-bold uppercase tracking-widest mb-2">ID do Canal (ex: UCwTRjvjVge51X-ILJ4i22ew)</label>
              <input 
                type="text" 
                placeholder="CHANNEL_ID..."
                className="w-full bg-black border border-white/5 px-6 py-4 text-xs font-mono tracking-widest focus:outline-none focus:border-[#00f5ff]/30 transition-all"
                value={newChannelId}
                onChange={(e) => setNewChannelId(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-600 font-bold uppercase tracking-widest mb-2">Nome Amigável (Opcional)</label>
              <input 
                type="text" 
                placeholder="CHANNEL_NAME..."
                className="w-full bg-black border border-white/5 px-6 py-4 text-xs font-mono tracking-widest focus:outline-none focus:border-[#00f5ff]/30 transition-all"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
              />
            </div>
          </div>
          <button 
            type="submit"
            className="bg-[#00f5ff] text-black px-8 py-4 text-xs font-black uppercase tracking-widest hover:bg-[#00f5ff]/80 transition-all"
          >
            Bloquear Canal
          </button>
        </form>

        <div className="admin-card border border-white/5 bg-[#0d0d12]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="admin-table-header text-gray-500 text-[10px] font-bold uppercase tracking-widest bg-black/50">
                  <th className="px-10 py-5">Metadata Canal</th>
                  <th className="px-10 py-5">Identificador (ID)</th>
                  <th className="px-10 py-5 text-right">Controle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {channels.map((channel) => (
                  <tr key={channel.id} className="hover:bg-[#00f5ff]/[0.02] transition-colors group">
                    <td className="px-10 py-5">
                      <div className="font-bold text-gray-200 mb-1 max-w-md truncate uppercase tracking-tighter">
                        {channel.name || "NOME_NÃO_INFORMADO"}
                      </div>
                      <div className="text-[10px] text-gray-600 font-mono italic">
                        Adicionado em: {new Date(channel.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-10 py-5">
                      <div className="font-mono text-xs text-gray-500 group-hover:text-[#00f5ff] transition-colors">
                        {channel.channelId}
                      </div>
                    </td>
                    <td className="px-10 py-5 text-right">
                      <button 
                         onClick={() => handleDelete(channel.id)}
                         className="text-[10px] font-mono font-bold text-gray-700 hover:text-red-500 transition-colors uppercase tracking-[0.2em]"
                      >
                        [DESBLOQUEAR]
                      </button>
                    </td>
                  </tr>
                ))}
                {channels.length === 0 && !loading && (
                  <tr>
                    <td colSpan={3} className="px-10 py-20 text-center text-gray-700 font-mono text-xs uppercase tracking-widest italic">
                      --- BLOCKLIST_EMPTY ---
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
