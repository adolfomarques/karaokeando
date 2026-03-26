import React, { useState, useEffect } from "react";
import AdminLayout from "./AdminLayout";
import { getAdminSongs } from "../../api";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";

// I need to add getAdminPlaylists, addAdminPlaylist, deleteAdminPlaylist to api.ts
import { API_BASE } from "../../api";

async function getAdminPlaylists() {
  const token = localStorage.getItem("karaokefactory_token");
  const res = await fetch(`${API_BASE}/api/admin/playlists`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

async function addAdminPlaylist(name: string, songIds: string[]) {
  const token = localStorage.getItem("karaokefactory_token");
  const res = await fetch(`${API_BASE}/api/admin/playlists`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, songIds }),
  });
  return res.json();
}

async function deleteAdminPlaylist(id: string) {
  const token = localStorage.getItem("karaokefactory_token");
  const res = await fetch(`${API_BASE}/api/admin/playlists/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export default function AdminPlaylists() {
  const { t } = useTranslation();
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newName, setNewName] = useState("");
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pData, sData] = await Promise.all([getAdminPlaylists(), getAdminSongs()]);
      setPlaylists(pData);
      setSongs(sData);
    } catch {
      toast.error(t("admin.connError", "Erro ao carregar dados"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || selectedSongIds.length === 0) {
      toast.error(t("admin.nameAndSongRequired", "Nome e pelo menos uma música são obrigatórios"));
      return;
    }
    try {
      await addAdminPlaylist(newName, selectedSongIds);
      toast.success(t("admin.playlistCreated", "Playlist criada"));
      setNewName("");
      setSelectedSongIds([]);
      loadData();
    } catch {
      toast.error(t("admin.deleteError", "Erro ao criar playlist"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("admin.removePlaylist", "Remover playlist?"))) return;
    try {
      await deleteAdminPlaylist(id);
      toast.success(t("admin.playlistRemoved", "Playlist removida"));
      loadData();
    } catch {
      toast.error(t("admin.deleteError", "Erro ao remover playlist"));
    }
  };

  const toggleSongSelection = (id: string) => {
    if (selectedSongIds.includes(id)) {
      setSelectedSongIds(selectedSongIds.filter(sid => sid !== id));
    } else {
      setSelectedSongIds([...selectedSongIds, id]);
    }
  };

  if (loading) return <AdminLayout><div className="text-[#00f5ff] font-mono animate-pulse uppercase tracking-widest text-xs">{t("admin.downloadingRegistry", "Downloading_Registry...")}</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="max-w-7xl">
        <header className="mb-12">
          <h1 className="text-4xl font-black mb-2 tracking-tighter uppercase neon-glow-cyan text-white">
            {t("admin.playlists", "Playlists")} <span className="text-white/20">/</span> {t("admin.curation", "Curadoria")}
          </h1>
          <p className="text-gray-500 text-sm font-mono tracking-widest uppercase">
            {t("admin.thematicLibraries", "Organização de Bibliotecas Temáticas")}
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Create Form */}
          <div className="lg:col-span-4">
            <form onSubmit={handleCreate} className="admin-card p-10 space-y-8 sticky top-28 border border-white/5 bg-[#0d0d12]">
              <div>
                <h3 className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.3em] mb-6">{t("admin.newInstance", "Nova_Instância")}</h3>
                <label htmlFor="playlist-name" className="block text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-2">Namespace</label>
                <input 
                  id="playlist-name"
                  type="text" 
                  placeholder={t("admin.namePlaceholder", "DIGITE_NOME...")}
                  className="w-full bg-black/50 border border-white/5 rounded-none px-6 py-4 focus:outline-none focus:border-[#00f5ff] text-sm font-mono tracking-widest transition-colors placeholder:text-gray-800 text-white"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-4">{t("admin.cacheMapping", { count: selectedSongIds.length })}</label>
                <div className="max-h-80 overflow-y-auto space-y-1 p-4 bg-black/40 border border-white/5 scrollbar-thin scrollbar-thumb-white/10">
                  {songs.map(song => (
                    <label key={song.id} className="flex items-center gap-3 p-3 hover:bg-[#00f5ff]/5 cursor-pointer transition-colors group">
                      <div className="relative flex items-center justify-center">
                        <input 
                          type="checkbox" 
                          className="peer appearance-none w-4 h-4 border border-white/20 checked:bg-[#00f5ff] checked:border-[#00f5ff] transition-all cursor-pointer"
                          checked={selectedSongIds.includes(song.id)}
                          onChange={() => toggleSongSelection(song.id)}
                        />
                        <svg className="absolute w-3 h-3 text-black pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-[11px] font-medium text-gray-400 group-hover:text-white transition-colors truncate uppercase tracking-wider">{song.title}</span>
                    </label>
                  ))}
                  {songs.length === 0 && <div className="text-center py-10 text-[10px] font-mono text-gray-700 uppercase tracking-widest">{t("admin.cacheNull", "Cache_Null")}</div>}
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-[#00f5ff] text-black font-black uppercase text-xs tracking-[0.2em] py-5 hover:bg-[#2dd4bf] transition-colors disabled:opacity-20 disabled:grayscale"
                disabled={!newName || selectedSongIds.length === 0}
              >
                {t("admin.compilePlaylist", "Compilar Playlist")}
              </button>
            </form>
          </div>

          {/* List */}
          <div className="lg:col-span-8 space-y-6 stagger-in">
            {playlists.map(p => (
              <div key={p.id} className="admin-card p-10 group relative border border-white/5 bg-[#0d0d12]">
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <h4 className="text-3xl font-black tracking-tighter uppercase group-hover:text-[#00f5ff] transition-colors text-white">{p.name}</h4>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="h-[2px] w-8 bg-[#00f5ff]/30"></span>
                      <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{t("admin.objectsRegistered", { count: p.songs.length })}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(p.id)}
                    className="p-3 bg-red-600/5 text-red-500 hover:bg-red-600 hover:text-white transition-all border border-red-500/10 hover:border-red-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-4 overflow-hidden">
                    {p.songs.slice(0, 8).map((ps: any) => (
                      <div key={ps.song.id} className="relative group/thumb">
                        <img 
                          className="inline-block h-12 w-12 grayscale group-hover/thumb:grayscale-0 transition-all ring-4 ring-[#0a0a0c] border border-white/10"
                          src={`https://img.youtube.com/vi/${ps.song.id}/mqdefault.jpg`}
                          alt="Thumbnail"
                        />
                      </div>
                    ))}
                    {p.songs.length > 8 && (
                      <div className="inline-flex h-12 w-12 items-center justify-center bg-white/5 border border-white/10 text-[10px] font-bold text-gray-400 ring-4 ring-[#0a0a0c]">
                        +{p.songs.length - 8}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 h-[1px] bg-white/[0.03]"></div>
                  <div className="text-[10px] font-mono text-gray-700 tracking-tighter">{t("admin.dataIndexComplete", "DATA_INDEX_COMPLETE")}</div>
                </div>
              </div>
            ))}
            {playlists.length === 0 && !loading && (
              <div className="py-24 text-center admin-card border-dashed border-white/10 opacity-30 bg-[#0d0d12]">
                <div className="font-mono text-xs uppercase tracking-[0.5em]">{t("admin.noPlaylistSync", "Nenhuma_Playlist_Sincronizada")}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
