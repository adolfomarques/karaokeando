import { useEffect, useState } from "react";
import { getAdminSongs, deleteAdminSong } from "../../api";
import AdminLayout from "./AdminLayout";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";

export default function AdminSongs() {
  const { t } = useTranslation();
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadSongs = async () => {
    try {
      const data = await getAdminSongs();
      setSongs(data);
    } catch (err) {
      toast.error(t("admin.connError", "Erro ao carregar músicas"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSongs();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("admin.confirmDeleteSong", "Tem certeza que deseja remover esta música do cache?"))) return;
    try {
      await deleteAdminSong(id);
      toast.success(t("admin.deleteSuccess", "Música removida"));
      loadSongs();
    } catch (err) {
      toast.error(t("admin.deleteError", "Erro ao remover"));
    }
  };

  const filteredSongs = songs.filter(s => 
    s.title.toLowerCase().includes(search.toLowerCase()) || 
    s.id.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <AdminLayout><div className="text-[#00f5ff] font-mono animate-pulse uppercase tracking-widest text-xs">{t("admin.downloadingRegistry", "Downloading_Registry...")}</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="max-w-7xl">
        <header className="mb-12">
          <h1 className="text-4xl font-black mb-2 tracking-tighter uppercase neon-glow-cyan">
             {t("admin.songs", "Músicas")} <span className="text-white/20">/</span> {t("admin.cache", "Cache")}
          </h1>
          <p className="text-gray-500 text-sm font-mono tracking-widest uppercase">
            {t("admin.assetManagement", "Gerenciamento de Ativos de Áudio e Vídeo")}
          </p>
        </header>

        <div className="mb-8 relative group">
          <input 
            type="text" 
            placeholder={t("admin.searchPlaceholder", "PESQUISAR_IDENTIFICADOR_OU_TITULO...")}
            className="w-full bg-[#0d0d12] border border-white/5 px-6 py-4 text-xs font-mono tracking-widest placeholder:text-gray-700 focus:outline-none focus:border-[#00f5ff]/30 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] text-gray-700 font-mono hidden group-focus-within:block uppercase tracking-widest">Searching_Now...</div>
        </div>

        <div className="admin-card border border-white/5 bg-[#0d0d12]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="admin-table-header text-gray-500 text-[10px] font-bold uppercase tracking-widest bg-black/50">
                  <th className="px-10 py-5">{t("admin.visual", "Visual")}</th>
                  <th className="px-10 py-5">{t("admin.metadata", "Metadata")}</th>
                  <th className="px-10 py-5">{t("admin.metrics", "Métrica (Plays)")}</th>
                  <th className="px-10 py-5 text-right">{t("admin.control", "Controle")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {filteredSongs.map((song) => (
                  <tr key={song.id} className="hover:bg-[#00f5ff]/[0.02] transition-colors group">
                    <td className="px-10 py-5">
                      <div className="w-24 aspect-video bg-[#050507] border border-white/5 overflow-hidden relative">
                         <img 
                          src={`https://img.youtube.com/vi/${song.videoId}/mqdefault.jpg`} 
                          alt="Thumbnail" 
                          className="w-full h-full object-cover opacity-50 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><rect fill="%230d0d12" width="320" height="180"/><text x="160" y="90" text-anchor="middle" fill="%23333" font-family="monospace" font-size="12">NO_THUMBNAIL</text></svg>';
                          }}
                        />
                         <div className="absolute inset-x-0 bottom-0 bg-[#00f5ff] h-[1px] scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500"></div>
                      </div>
                    </td>
                    <td className="px-10 py-5">
                      <div className="font-bold text-gray-200 mb-1 max-w-md truncate uppercase tracking-tighter">{song.title}</div>
                      <div className="font-mono text-[10px] text-gray-600 tracking-widest uppercase">{song.id}</div>
                    </td>
                    <td className="px-10 py-5">
                       <span className="font-mono text-xs font-black text-gray-500 group-hover:text-white transition-colors">
                        {String(song.playCount).padStart(4, '0')} PLAYS
                       </span>
                    </td>
                    <td className="px-10 py-5 text-right">
                      <button 
                         onClick={() => handleDelete(song.id)}
                         className="text-[10px] font-mono font-bold text-gray-700 hover:text-red-500 transition-colors uppercase tracking-[0.2em]"
                      >
                        [REMOVE_CACHE]
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredSongs.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="px-10 py-20 text-center text-gray-700 font-mono text-xs uppercase tracking-widest italic">
                      --- DATABASE_EMPTY ---
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={4} className="px-10 py-20 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-2 h-2 bg-[#00f5ff] animate-ping"></div>
                        <span className="text-gray-500 font-mono text-[10px] uppercase tracking-[0.3em]">Downloading_Registry...</span>
                      </div>
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
