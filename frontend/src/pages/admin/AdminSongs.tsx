import { useEffect, useState } from "react";
import { getAdminSongs, deleteAdminSong } from "../../api";
import AdminLayout from "./AdminLayout";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import AdminButton from "../../components/admin/AdminButton";
import AdminEmpty from "../../components/admin/AdminEmpty";
import ConfirmDialog from "../../components/admin/ConfirmDialog";

export default function AdminSongs() {
  const { t } = useTranslation();
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<"newest"|"oldest"|"most_played"|"az">("newest");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; title: string } | null>(null);
  const itemsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortBy]);

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
    setDeletingId(id);
    try {
      await deleteAdminSong(id);
      toast.success(t("admin.deleteSuccess", "Música removida"));
      loadSongs();
    } catch (err) {
      toast.error(t("admin.deleteError", "Erro ao remover"));
    } finally {
      setDeletingId(null);
      setConfirm(null);
    }
  };

  const filteredSongs = songs.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.id.toLowerCase().includes(search.toLowerCase())
  );

  const sortedSongs = [...filteredSongs].sort((a, b) => {
    if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sortBy === "most_played") return (b.playCount || 0) - (a.playCount || 0);
    if (sortBy === "az") return a.title.localeCompare(b.title);
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sortedSongs.length / itemsPerPage));
  const currentSongs = sortedSongs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) {
    return (
      <AdminLayout>
        <div className="max-w-7xl">
          <div className="mb-10 h-10 w-56 admin-skeleton"></div>
          <div className="admin-card border border-white/5 bg-[#0d0d12] p-8 space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="admin-skeleton h-14"></div>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl">
        <AdminPageHeader
          title={t("admin.songs", "Músicas")}
          subtitle="Gerencie o cache de músicas do sistema: busque, filtre e remova itens."
          actions={
            <div className="text-right">
              <div className="font-mono text-xl font-black text-[#00f5ff]">{songs.length}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">no cache</div>
            </div>
          }
        />

        <div className="mb-8 flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={t("admin.searchPlaceholder", "Buscar por título ou ID...")}
              className="admin-input font-mono pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <svg
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-widest text-gray-500 transition-colors hover:text-[#00f5ff]"
              >
                Limpar ✕
              </button>
            )}
          </div>
          <select
            className="admin-select admin-input md:w-auto"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="newest">Últimas adicionadas</option>
            <option value="oldest">Mais antigas</option>
            <option value="most_played">Mais tocadas</option>
            <option value="az">A-Z</option>
          </select>
          <div className="flex items-center rounded border border-white/10 px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-gray-400">
            {search ? (
              <span>{filteredSongs.length} de {songs.length}</span>
            ) : (
              <span>{songs.length} músicas</span>
            )}
          </div>
        </div>

        <div className="admin-card border border-white/5 bg-[#0d0d12]">
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="admin-th">Vídeo</th>
                  <th className="admin-th">Música</th>
                  <th className="admin-th">Reproduções</th>
                  <th className="admin-th" align="right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {currentSongs.map((song) => (
                  <tr key={song.id} className="admin-tr group">
                    <td className="admin-td">
                      <div className="relative aspect-video w-24 overflow-hidden border border-white/5 bg-[#050507]">
                        <img
                          src={`https://img.youtube.com/vi/${song.videoId}/mqdefault.jpg`}
                          alt="Thumbnail"
                          className="h-full w-full object-cover opacity-50 grayscale transition-all duration-500 group-hover:opacity-100 group-hover:grayscale-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><rect fill="%230d0d12" width="320" height="180"/><text x="160" y="90" text-anchor="middle" fill="%23333" font-family="monospace" font-size="12">SEM IMAGEM</text></svg>';
                          }}
                        />
                        <div className="absolute inset-x-0 bottom-0 h-[1px] origin-left scale-x-0 bg-[#00f5ff] transition-transform duration-500 group-hover:scale-x-100"></div>
                      </div>
                    </td>
                    <td className="admin-td">
                      <div className="mb-1 max-w-md truncate font-bold uppercase tracking-tighter text-gray-200">{song.title}</div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-gray-600">{song.id}</div>
                    </td>
                    <td className="admin-td">
                      <span className="font-mono text-xs font-black text-gray-500 transition-colors group-hover:text-white">
                        {String(song.playCount || 0).padStart(4, '0')} plays
                      </span>
                    </td>
                    <td className="admin-td text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`https://www.youtube.com/watch?v=${song.videoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Abrir no YouTube"
                          className="rounded border border-white/10 bg-white/5 p-2 text-gray-400 transition-all hover:border-[#00f5ff]/50 hover:text-[#00f5ff]"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                        <button
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(song.videoId);
                              toast.success("ID copiado: " + song.videoId);
                            } catch {
                              toast.error("Não foi possível copiar");
                            }
                          }}
                          title="Copiar ID"
                          className="rounded border border-white/10 bg-white/5 p-2 text-gray-400 transition-all hover:border-[#00f5ff]/50 hover:text-[#00f5ff]"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <AdminButton
                          variant="danger"
                          size="sm"
                          disabled={deletingId === song.id}
                          onClick={() =>
                            setConfirm({ id: song.id, title: song.title })
                          }
                        >
                          Remover
                        </AdminButton>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredSongs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="admin-td">
                      <AdminEmpty
                        title={search ? "Nenhum resultado para a busca" : "Nenhuma música no cache"}
                        hint={search ? `Não encontramos nada para "${search}".` : "Adicione músicas tocando nas salas ou use o aquecimento de cache."}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between">
            <AdminButton variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}>
              ← Anterior
            </AdminButton>
            <div className="font-mono text-xs uppercase tracking-widest text-[#00f5ff]">
              Página {String(currentPage).padStart(2, "0")} <span className="mx-2 text-gray-600">/</span> {String(totalPages).padStart(2, "0")}
            </div>
            <AdminButton variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}>
              Próxima →
            </AdminButton>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirm}
        title="Remover música do cache"
        message={confirm ? `Tem certeza que deseja remover "${confirm.title}" do cache?` : ""}
        confirmLabel="Remover"
        loading={deletingId === confirm?.id}
        onConfirm={() => confirm && handleDelete(confirm.id)}
        onCancel={() => setConfirm(null)}
      />
    </AdminLayout>
  );
}
