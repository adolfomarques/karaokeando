import { useState, useEffect } from "react";
import AdminLayout from "./AdminLayout";
import { getAdminSongs, AdminSong } from "../../api";
import { Toaster, toast } from "react-hot-toast";

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
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [songs, setSongs] = useState<AdminSong[]>([]);
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
      toast.error("Erro ao carregar dados");
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
      toast.error("Nome e pelo menos uma música são obrigatórios");
      return;
    }
    try {
      await addAdminPlaylist(newName, selectedSongIds);
      toast.success("Playlist criada");
      setNewName("");
      setSelectedSongIds([]);
      loadData();
    } catch {
      toast.error("Erro ao criar playlist");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Remover playlist?")) return;
    try {
      await deleteAdminPlaylist(id);
      toast.success("Playlist removida");
      loadData();
    } catch {
      toast.error("Erro ao remover playlist");
    }
  };

  const toggleSongSelection = (id: string) => {
    if (selectedSongIds.includes(id)) {
      setSelectedSongIds(selectedSongIds.filter(sid => sid !== id));
    } else {
      setSelectedSongIds([...selectedSongIds, id]);
    }
  };

  return (
    <AdminLayout>
      <Toaster position="top-right" />
      <div className="max-w-6xl space-y-10">
        <h1 className="text-3xl font-bold">Playlists de Karaoke</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Form */}
          <div className="lg:col-span-1">
            <form onSubmit={handleCreate} className="bg-[#121216] p-6 rounded-2xl border border-white/5 space-y-4 sticky top-6">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-500">Nova Playlist</h3>
              <div>
                <label htmlFor="playlist-name" className="block text-xs text-gray-400 mb-1">Nome da Playlist</label>
                <input 
                  id="playlist-name"
                  type="text" 
                  placeholder="Ex: Pop Anos 2000"
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-red-500 text-sm"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-2">Selecionar Músicas ({selectedSongIds.length})</label>
                <div className="max-h-60 overflow-y-auto space-y-1 p-2 bg-black/20 rounded-xl border border-white/5">
                  {songs.map(song => (
                    <label key={song.id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-400 text-red-600 focus:ring-red-600 bg-transparent"
                        checked={selectedSongIds.includes(song.id)}
                        onChange={() => toggleSongSelection(song.id)}
                      />
                      <span className="text-xs truncate">{song.title}</span>
                    </label>
                  ))}
                  {songs.length === 0 && <div className="text-center py-4 text-xs text-gray-500 italic">Cache vazio</div>}
                </div>
              </div>
              <button 
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 py-2 rounded-xl transition-colors font-bold disabled:opacity-50"
                disabled={!newName || selectedSongIds.length === 0}
              >
                Gerar Playlist
              </button>
            </form>
          </div>

          {/* List */}
          <div className="lg:col-span-2 space-y-4">
            {playlists.map(p => (
              <div key={p.id} className="bg-[#121216] p-6 rounded-2xl border border-white/5 group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-xl font-bold">{p.name}</h4>
                    <p className="text-sm text-gray-500">{p.songs.length} músicas</p>
                  </div>
                  <button 
                    onClick={() => handleDelete(p.id)}
                    className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-600/20 text-red-500 rounded-lg transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <div className="flex -space-x-4 overflow-hidden">
                  {p.songs.slice(0, 5).map((ps: any) => (
                    <img 
                      key={ps.song.id}
                      className="inline-block h-10 w-10 rounded-full ring-2 ring-[#0a0a0c]"
                      src={`https://i.ytimg.com/vi/${ps.song.videoId}/default.jpg`}
                      alt=""
                    />
                  ))}
                  {p.songs.length > 5 && (
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-xs font-medium text-white ring-2 ring-[#0a0a0c]">
                      +{p.songs.length - 5}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {playlists.length === 0 && !loading && (
              <div className="py-20 text-center text-gray-500 bg-[#121216] rounded-2xl border border-dashed border-white/10">
                Nenhuma playlist criada ainda.
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
