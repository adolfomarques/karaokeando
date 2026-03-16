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
      <div className="max-w-7xl">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8">
          <div>
            <h1 className="text-4xl font-black mb-2 tracking-tighter uppercase neon-glow-cyan">
              Músicas <span className="text-white/20">/</span> Cache
            </h1>
            <p className="text-gray-500 text-sm font-mono tracking-widest uppercase">
              Gerenciamento de Ativos de Áudio e Vídeo
            </p>
          </div>
          <div className="relative w-full md:w-96">
            <input
              type="text"
              aria-label="Buscar músicas no cache"
              placeholder="PESQUISAR_IDENTIFICADOR_OU_TITULO..."
              className="w-full bg-[#121216] border border-white/5 rounded-none px-6 py-4 text-xs font-mono uppercase tracking-[0.2em] focus:outline-none focus:border-[#00f5ff] transition-colors placeholder:text-gray-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-700 pointer-events-none font-mono text-[10px]">SRC_QUERY</div>
          </div>
        </header>

        <div className="admin-card border border-white/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="admin-table-header text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                  <th className="px-10 py-5">Visual</th>
                  <th className="px-10 py-5">Metadata</th>
                  <th className="px-10 py-5">Métrica (Plays)</th>
                  <th className="px-10 py-5">Registrador</th>
                  <th className="px-10 py-5 text-right">Controle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {filteredSongs.map((song) => (
                  <tr key={song.id} className="hover:bg-[#00f5ff]/[0.02] transition-colors group">
                    <td className="px-10 py-5">
                      <div className="relative w-24 h-14 bg-black border border-white/5 overflow-hidden">
                        <img 
                          src={`https://i.ytimg.com/vi/${song.videoId}/default.jpg`} 
                          alt="" 
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                      </div>
                    </td>
                    <td className="px-10 py-5">
                      <div className="font-bold text-white mb-1 tracking-tight group-hover:text-[#00f5ff] transition-colors">{song.title}</div>
                      <div className="text-gray-600 text-[10px] font-mono uppercase tracking-widest">{song.videoId}</div>
                    </td>
                    <td className="px-10 py-5">
                       <span className="text-xl font-black neon-text-cyan admin-stat-value">{song.playCount}</span>
                    </td>
                    <td className="px-10 py-5 text-gray-500 font-medium">{song.addedBy}</td>
                    <td className="px-10 py-5 text-right">
                      <button 
                        onClick={() => handleDelete(song.id)}
                        className="p-3 bg-red-600/5 text-red-500 hover:bg-red-600 hover:text-white transition-all border border-red-500/20 hover:border-red-600"
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
                    <td colSpan={5} className="px-10 py-20 text-center text-gray-700 font-mono text-xs uppercase tracking-widest italic">
                      --- DATABASE_EMPTY ---
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-10 py-20 text-center">
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
