import { useState, useEffect } from "react";
import AdminLayout from "./AdminLayout";
import { getAdminSongs, deleteAdminSong, AdminSong } from "../../api";
import { Toaster, toast } from "react-hot-toast";

export default function AdminSongs() {
  const [songs, setSongs] = useState<AdminSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const loadSongs = () => {
    setLoading(true);
    getAdminSongs()
      .then(setSongs)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSongs();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja remover esta música do cache?")) return;
    
    try {
      await deleteAdminSong(id);
      toast.success("Música removida com sucesso");
      setSongs(songs.filter(s => s.id !== id));
    } catch {
      toast.error("Erro ao remover música");
    }
  };

  const filteredSongs = songs.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.videoId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <Toaster position="top-right" />
      <div className="max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold">Gestão de Músicas (Cache)</h1>
          <div className="relative w-full md:w-80">
            <input
              type="text"
              aria-label="Buscar músicas no cache"
              placeholder="Buscar por título ou ID..."
              className="w-full bg-[#121216] border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-red-500 transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-[#121216] rounded-2xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 text-gray-400 text-sm">
                  <th className="px-6 py-4">Preview</th>
                  <th className="px-6 py-4">Título</th>
                  <th className="px-6 py-4">Plays</th>
                  <th className="px-6 py-4">Adicionada por</th>
                  <th className="px-6 py-4">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {filteredSongs.map((song) => (
                  <tr key={song.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-6 py-3">
                      <img 
                        src={`https://i.ytimg.com/vi/${song.videoId}/default.jpg`} 
                        alt="" 
                        className="w-16 h-12 object-cover rounded-lg bg-gray-900" 
                      />
                    </td>
                    <td className="px-6 py-3">
                      <div className="font-medium line-clamp-1">{song.title}</div>
                      <div className="text-gray-500 text-xs font-mono">{song.videoId}</div>
                    </td>
                    <td className="px-6 py-3 text-red-400 font-bold">{song.playCount}</td>
                    <td className="px-6 py-3 text-gray-400">{song.addedBy}</td>
                    <td className="px-6 py-3">
                      <button 
                        onClick={() => handleDelete(song.id)}
                        className="p-2 bg-red-600/10 text-red-500 rounded-lg hover:bg-red-600 hover:text-white transition-all"
                        title="Remover do Cache"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredSongs.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">Nenhuma música encontrada no cache.</td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500 italic">Carregando livraria...</td>
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
