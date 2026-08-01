import { useEffect, useState, useCallback } from "react";
import AdminLayout from "./AdminLayout";
import {
  getAdminLogins,
  getAdminLoginStats,
  type LoginEvent,
  type LoginStats,
} from "../../api";
import { useTranslation } from "react-i18next";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import AdminStatCard from "../../components/admin/AdminStatCard";
import AdminButton from "../../components/admin/AdminButton";
import AdminEmpty from "../../components/admin/AdminEmpty";
import AdminLoading from "../../components/admin/AdminLoading";

const METHOD_LABELS: Record<string, string> = {
  password: "Senha",
  google: "Google",
  facebook: "Facebook",
  guest: "Convidado",
  host: "Anfitrião",
  complete: "Completar",
};

const METHOD_COLORS: Record<string, string> = {
  password: "bg-white/10 text-white",
  google: "bg-red-500/20 text-red-300",
  facebook: "bg-blue-500/20 text-blue-300",
  guest: "bg-yellow-500/20 text-yellow-300",
  host: "bg-[#00f5ff]/20 text-[#00f5ff]",
  complete: "bg-green-500/20 text-green-300",
};

const PAGE_SIZE = 50;

function timeAgo(date: string | Date): string {
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days} d`;
  return new Date(date).toLocaleDateString("pt-BR");
}

export default function AdminLogins() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<LoginEvent[]>([]);
  const [stats, setStats] = useState<LoginStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("");
  const [searchInput, setSearchInput] = useState("");
  const [, setNowTick] = useState(0);

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const [data, s] = await Promise.all([
        getAdminLogins({
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
          q: search || undefined,
          method: methodFilter || undefined,
        }),
        getAdminLoginStats(),
      ]);
      setEvents(data.events);
      setTotal(data.total);
      setStats(s);
    } catch (err: any) {
      setError(t("admin.invalidKey", "Chave inválida ou erro ao carregar dados"));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, search, methodFilter, t]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh every 60s (silent) + ticker to keep relative times fresh
  useEffect(() => {
    const reload = setInterval(() => load(true), 60000);
    const ticker = setInterval(() => setNowTick((n) => n + 1), 30000);
    return () => {
      clearInterval(reload);
      clearInterval(ticker);
    };
  }, [load]);

  const applySearch = () => {
    setSearch(searchInput.trim());
    setPage(0);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canPrev = page > 0 && !loading;
  const canNext = (page + 1) * PAGE_SIZE < total && !loading;

  if (error)
    return (
      <AdminLayout>
        <AdminEmpty title={error} />
      </AdminLayout>
    );

  return (
    <AdminLayout>
      <div className="max-w-7xl">
        <AdminPageHeader
          title={t("admin.logins", "Logins")}
          subtitle="Registro de acessos ao sistema por todos os métodos de login."
          actions={
            <AdminButton
              variant="outline"
              size="md"
              onClick={() => load()}
              disabled={loading}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? "Carregando..." : "Recarregar"}
            </AdminButton>
          }
        />

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <AdminStatCard label="Últimas 24h" value={stats?.last24h ?? 0} accent hint="24_hours" />
          <AdminStatCard label="Últimos 7 dias" value={stats?.last7d ?? 0} hint="7_days" />
          <AdminStatCard label="Total de logins" value={stats?.total ?? 0} hint="all_time" />
          <AdminStatCard label="Usuários únicos" value={stats?.uniqueUsers ?? 0} hint="distinct_users" />
        </div>

        {/* Method breakdown */}
        {stats?.byMethod && Object.keys(stats.byMethod).length > 0 && (
          <div className="admin-card mb-8 flex flex-wrap items-center gap-3 border border-white/5 bg-[#0d0d12] p-6">
            <span className="mr-2 font-mono text-[10px] uppercase tracking-widest text-gray-500">
              Por método:
            </span>
            {Object.entries(stats.byMethod).map(([m, count]) => (
              <span
                key={m}
                className={`rounded px-3 py-1.5 font-mono text-xs ${METHOD_COLORS[m] || "bg-white/10 text-white"}`}
              >
                {METHOD_LABELS[m] || m}: <strong>{count}</strong>
              </span>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="admin-card mb-8 flex flex-col items-stretch gap-4 border border-white/5 bg-[#0d0d12] p-6 md:flex-row md:items-end">
          <div className="flex flex-1 flex-col">
            <label className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Buscar por nome ou email
            </label>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applySearch()}
              placeholder="ex: joao@exemplo.com"
              className="admin-input"
            />
          </div>
          <div className="flex flex-col">
            <label className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Método
            </label>
            <select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value);
                setPage(0);
              }}
              className="admin-select admin-input"
            >
              <option value="">Todos</option>
              <option value="password">Senha</option>
              <option value="google">Google</option>
              <option value="facebook">Facebook</option>
              <option value="guest">Convidado</option>
              <option value="host">Anfitrião</option>
              <option value="complete">Completar</option>
            </select>
          </div>
          <AdminButton onClick={applySearch}>Buscar</AdminButton>
          {(search || methodFilter) && (
            <AdminButton
              variant="outline"
              onClick={() => {
                setSearch("");
                setSearchInput("");
                setMethodFilter("");
                setPage(0);
              }}
            >
              Limpar
            </AdminButton>
          )}
        </div>

        {/* Table */}
        <div className="admin-card border border-white/5 bg-[#0d0d12]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 bg-white/[0.01] px-8 py-5">
            <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-gray-400">
              Eventos de Login
            </h2>
            <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500">
              {total} registros · página {page + 1}/{totalPages}
            </div>
          </div>

          {loading && events.length === 0 ? (
            <div className="p-8">
              <AdminLoading label="Carregando histórico..." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="admin-th">Usuário</th>
                    <th className="admin-th">Email</th>
                    <th className="admin-th">Método</th>
                    <th className="admin-th">IP</th>
                    <th className="admin-th">Dispositivo</th>
                    <th className="admin-th" align="right">Data/Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id} className="admin-tr">
                      <td className="admin-td">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{e.userName}</span>
                          {e.userIsAdmin && (
                            <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-red-400">
                              admin
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="admin-td font-mono text-xs text-gray-400">{e.userEmail}</td>
                      <td className="admin-td">
                        <span className={`rounded px-2 py-1 font-mono text-xs ${METHOD_COLORS[e.method] || "bg-white/10 text-white"}`}>
                          {METHOD_LABELS[e.method] || e.method}
                        </span>
                      </td>
                      <td className="admin-td font-mono text-xs text-gray-500">{e.ip || "-"}</td>
                      <td className="admin-td max-w-xs truncate font-mono text-[10px] text-gray-600" title={e.userAgent || ""}>
                        {e.userAgent || "-"}
                      </td>
                      <td className="admin-td text-right font-mono text-xs text-gray-500" title={new Date(e.createdAt).toLocaleString("pt-BR")}>
                        {timeAgo(e.createdAt)}
                      </td>
                    </tr>
                  ))}
                  {events.length === 0 && (
                    <tr>
                      <td colSpan={6} className="admin-td">
                        <AdminEmpty
                          title="Nenhum registro de login encontrado"
                          hint={search || methodFilter ? "Ajuste os filtros para encontrar registros." : "Os acessos começam a ser registrados a partir da implantação desta versão."}
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-white/5 px-8 py-5">
              <AdminButton
                variant="outline"
                size="sm"
                disabled={!canPrev}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Anterior
              </AdminButton>
              <span className="font-mono text-[10px] text-gray-500">
                {(page * PAGE_SIZE) + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} de {total}
              </span>
              <AdminButton
                variant="outline"
                size="sm"
                disabled={!canNext}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima →
              </AdminButton>
            </div>
          )}
        </div>

        <p className="mt-4 font-mono text-xs text-gray-600">
          * A coleta de logins começou agora. Eventos anteriores a esta versão não estão registrados. Atualiza automaticamente a cada 60s.
        </p>
      </div>
    </AdminLayout>
  );
}
