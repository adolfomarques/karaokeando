import React, { useState, useEffect } from "react";
import AdminLayout from "./AdminLayout";
import { getAdminSongs } from "../../api";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { API_BASE } from "../../api";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import AdminButton from "../../components/admin/AdminButton";
import AdminEmpty from "../../components/admin/AdminEmpty";
import ConfirmDialog from "../../components/admin/ConfirmDialog";

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
  const [pickerSearch, setPickerSearch] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState<{ id: string; name: string } | null>(null);

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
    setDeleting(true);
    try {
      await deleteAdminPlaylist(id);
      toast.success(t("admin.playlistRemoved", "Playlist removida"));
      loadData();
    } catch {
      toast.error(t("admin.deleteError", "Erro ao remover playlist"));
    } finally {
      setDeleting(false);
      setConfirm(null);
    }
  };

  const toggleSongSelection = (id: string) => {
    if (selectedSongIds.includes(id)) {
      setSelectedSongIds(selectedSongIds.filter(sid => sid !== id));
    } else {
      setSelectedSongIds([...selectedSongIds, id]);
    }
  };

  const visibleSongs = songs.filter(s =>
    s.title.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  if (loading) {
    return (
      <AdminLayout>
        <div className="max-w-7xl">
          <div className="mb-10 h-10 w-56 admin-skeleton"></div>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="admin-skeleton h-96 lg:col-span-4"></div>
            <div className="admin-skeleton h-64 lg:col-span-8"></div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl">
        <AdminPageHeader
          title={t("admin.playlists", "Playlists")}
          subtitle="Agrupe músicas por tema ou ocasião para montar a atmosfera perfeita da festa."
        />

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          {/* Create Form */}
          <div className="lg:col-span-4">
            <form onSubmit={handleCreate} className="admin-card sticky top-20 space-y-8 border border-white/5 bg-[#0d0d12] p-8 md:top-24">
              <div>
                <h3 className="mb-6 text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500">
                  Nova Playlist
                </h3>
                <label htmlFor="playlist-name" className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-gray-500">
                  Nome
                </label>
                <input
                  id="playlist-name"
                  type="text"
                  placeholder="Ex: Festa dos Anos 80"
                  className="admin-input font-mono"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-4 block font-mono text-[10px] uppercase tracking-widest text-gray-500">
                  Músicas selecionadas: <span className="text-[#00f5ff]">{selectedSongIds.length}</span>
                  {pickerSearch && <span className="text-gray-600"> · {visibleSongs.length} visíveis de {songs.length}</span>}
                </label>
                <input
                  type="text"
                  placeholder="Filtrar músicas..."
                  className="admin-input mb-2 text-xs"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                />
                <div className="max-h-72 overflow-y-auto space-y-1 border border-white/5 bg-black/40 p-3">
                  {visibleSongs.map(song => {
                    const checked = selectedSongIds.includes(song.id);
                    return (
                      <label key={song.id} className={`group flex cursor-pointer items-center gap-3 p-2.5 transition-colors ${checked ? "bg-[#00f5ff]/10" : "hover:bg-[#00f5ff]/5"}`}>
                        <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
                          <input
                            type="checkbox"
                            className="peer h-4 w-4 cursor-pointer appearance-none border border-white/20 bg-transparent transition-all checked:border-[#00f5ff] checked:bg-[#00f5ff]"
                            checked={checked}
                            onChange={() => toggleSongSelection(song.id)}
                          />
                          <svg
                            className="pointer-events-none absolute h-3 w-3 text-black opacity-0 transition-opacity peer-checked:opacity-100"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                        <span className={`truncate text-[11px] font-medium uppercase tracking-wider ${checked ? "text-[#00f5ff]" : "text-gray-400 group-hover:text-white"}`}>
                          {song.title}
                        </span>
                      </label>
                    );
                  })}
                  {visibleSongs.length === 0 && (
                    <div className="py-8 text-center font-mono text-[10px] uppercase tracking-widest text-gray-700">
                      Nenhuma música encontrada
                    </div>
                  )}
                </div>
              </div>

              <AdminButton
                type="submit"
                size="lg"
                className="w-full"
                disabled={!newName || selectedSongIds.length === 0}
              >
                {t("admin.compilePlaylist", "Criar Playlist")}
              </AdminButton>
            </form>
          </div>

          {/* List */}
          <div className="space-y-6 lg:col-span-8">
            {playlists.map(p => (
              <div key={p.id} className="admin-card group relative border border-white/5 bg-[#0d0d12] p-8">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-3xl font-black uppercase tracking-tighter text-white transition-colors group-hover:text-[#00f5ff]">
                      {p.name}
                    </h4>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="h-[2px] w-8 bg-[#00f5ff]/30"></span>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">
                        {p.songs.length} {p.songs.length === 1 ? "música" : "músicas"}
                      </p>
                    </div>
                  </div>
                  <AdminButton
                    variant="danger"
                    size="sm"
                    aria-label={`Remover playlist ${p.name}`}
                    onClick={() => setConfirm({ id: p.id, name: p.name })}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </AdminButton>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex overflow-hidden">
                    {p.songs.slice(0, 8).map((ps: any) => (
                      <div key={ps.song.id} className="group/thumb relative">
                        <img
                          className="inline-block h-12 w-12 border border-white/10 object-cover grayscale transition-all ring-4 ring-[#0a0a0c] group-hover/thumb:grayscale-0"
                          src={`https://img.youtube.com/vi/${ps.song.id}/mqdefault.jpg`}
                          alt="Thumbnail"
                        />
                      </div>
                    ))}
                    {p.songs.length > 8 && (
                      <div className="inline-flex h-12 w-12 items-center justify-center border border-white/10 bg-white/5 text-[10px] font-bold text-gray-400 ring-4 ring-[#0a0a0c]">
                        +{p.songs.length - 8}
                      </div>
                    )}
                  </div>
                  <div className="h-[1px] flex-1 bg-white/[0.03]"></div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-gray-600">
                    Pronto para tocar
                  </span>
                </div>
              </div>
            ))}
            {playlists.length === 0 && (
              <AdminEmpty
                title="Nenhuma playlist criada"
                hint="Crie sua primeira playlist com o formulário ao lado para ter uma biblioteca temática pronta para o evento."
              />
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirm}
        title="Remover playlist"
        message={confirm ? `Remover a playlist "${confirm.name}"? Esta ação não pode ser desfeita.` : ""}
        confirmLabel="Remover"
        loading={deleting}
        onConfirm={() => confirm && handleDelete(confirm.id)}
        onCancel={() => setConfirm(null)}
      />
    </AdminLayout>
  );
}
