import React, { useState, useEffect } from "react";
import AdminLayout from "./AdminLayout";
import {
  getAdminBackgrounds, addAdminBackground, updateAdminBackground, deleteAdminBackground,
  getAdminPhrases, addAdminPhrase, updateAdminPhrase, deleteAdminPhrase,
  AdminBackground, AdminPhrase
} from "../../api";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import AdminButton from "../../components/admin/AdminButton";
import AdminEmpty from "../../components/admin/AdminEmpty";
import ConfirmDialog from "../../components/admin/ConfirmDialog";

interface ConfirmState {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}

export default function AdminScoreConfig() {
  const { t } = useTranslation();
  const [backgrounds, setBackgrounds] = useState<AdminBackground[]>([]);
  const [phrases, setPhrases] = useState<AdminPhrase[]>([]);
  const [loading, setLoading] = useState(true);

  // Background form
  const [editingBgId, setEditingBgId] = useState<string | null>(null);
  const [bgUrl, setBgUrl] = useState("");

  // Phrase form
  const [editingPhraseId, setEditingPhraseId] = useState<string | null>(null);
  const [phraseText, setPhraseText] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [maxScore, setMaxScore] = useState(100);

  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const loadData = () => {
    Promise.all([getAdminBackgrounds(), getAdminPhrases()])
      .then(([bgData, phraseData]) => {
        setBackgrounds(bgData);
        setPhrases(phraseData);
      })
      .catch((err) => toast.error(t("admin.connError", "Erro ao carregar dados") + ": " + err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddOrUpdateBackground = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bgUrl) return;
    setSaving(true);
    try {
      if (editingBgId) {
        await updateAdminBackground(editingBgId, bgUrl);
        toast.success(t("common.save", "Salvo"));
      } else {
        await addAdminBackground(bgUrl);
        toast.success(t("admin.backgroundCreated", "Background adicionado"));
      }
      setBgUrl("");
      setEditingBgId(null);
      loadData();
    } catch {
      toast.error(t("admin.deleteError", "Erro ao processar"));
    } finally {
      setSaving(false);
    }
  };

  const handleEditBg = (bg: AdminBackground) => {
    setEditingBgId(bg.id);
    setBgUrl(bg.url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEditBg = () => {
    setEditingBgId(null);
    setBgUrl("");
  };

  const handleAddOrUpdatePhrase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phraseText) return;
    setSaving(true);
    try {
      if (editingPhraseId) {
        await updateAdminPhrase(editingPhraseId, phraseText, minScore, maxScore);
        toast.success(t("common.save", "Salvo"));
      } else {
        await addAdminPhrase(phraseText, minScore, maxScore);
        toast.success(t("admin.phraseCreated", "Frase adicionada"));
      }
      setPhraseText("");
      setMinScore(0);
      setMaxScore(100);
      setEditingPhraseId(null);
      loadData();
    } catch {
      toast.error(t("admin.deleteError", "Erro ao processar"));
    } finally {
      setSaving(false);
    }
  };

  const handleEditPhrase = (phrase: AdminPhrase) => {
    setEditingPhraseId(phrase.id);
    setPhraseText(phrase.phrase);
    setMinScore(phrase.minScore);
    setMaxScore(phrase.maxScore);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEditPhrase = () => {
    setEditingPhraseId(null);
    setPhraseText("");
    setMinScore(0);
    setMaxScore(100);
  };

  const handleDeleteBg = async (id: string) => {
    try {
      await deleteAdminBackground(id);
      toast.success(t("admin.backgroundDeleted", "Background removido"));
      loadData();
    } catch {
      toast.error(t("admin.deleteError", "Erro ao remover"));
    } finally {
      setConfirm(null);
    }
  };

  const handleDeletePhrase = async (id: string) => {
    try {
      await deleteAdminPhrase(id);
      toast.success(t("admin.phraseDeleted", "Frase removida"));
      loadData();
    } catch {
      toast.error(t("admin.deleteError", "Erro ao remover"));
    } finally {
      setConfirm(null);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl space-y-16 pb-20">
        <AdminPageHeader
          title="Configuração de Score"
          subtitle="Personalize as imagens e as frases exibidas após a pontuação de cada apresentação."
        />

        {loading ? (
          <div className="space-y-16">
            <div className="admin-skeleton h-80"></div>
            <div className="admin-skeleton h-80"></div>
          </div>
        ) : (
          <>
            {/* BACKGROUNDS SECTION */}
            <section>
              <div className="mb-8 flex items-center gap-4">
                <h2 className="text-xs font-bold uppercase tracking-[0.4em] text-white">{t("admin.backgrounds", "Fundos de Tela")}</h2>
                <div className="h-[1px] flex-1 bg-white/[0.05]"></div>
              </div>

              <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
                {/* Form */}
                <div className="lg:col-span-4">
                  <form onSubmit={handleAddOrUpdateBackground} className="admin-card space-y-6 border border-white/5 bg-[#0d0d12] p-8">
                    <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500">
                      {editingBgId ? t("admin.preview", "Editando Background") : t("admin.addBackground", "Novo Background")}
                    </h3>
                    <div>
                      <label htmlFor="bg-url" className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-gray-500">
                        {t("admin.imageUrl", "URL da Imagem")}
                      </label>
                      <input
                        id="bg-url"
                        type="url"
                        placeholder="https://..."
                        className="admin-input font-mono"
                        value={bgUrl}
                        onChange={(e) => setBgUrl(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <AdminButton type="submit" className="flex-1" size="lg" disabled={saving}>
                        {editingBgId ? t("common.save", "Salvar") : t("common.add", "Adicionar")}
                      </AdminButton>
                      {editingBgId && (
                        <AdminButton type="button" variant="outline" onClick={handleCancelEditBg} size="lg" aria-label="Cancelar edição">
                          X
                        </AdminButton>
                      )}
                    </div>
                  </form>
                </div>

                {/* List */}
                <div className="grid grid-cols-2 gap-6 lg:col-span-8 md:grid-cols-3">
                  {backgrounds.map(bg => (
                    <div key={bg.id} className="group relative aspect-video overflow-hidden border border-white/5 bg-black">
                      <img src={bg.url} alt="Background" className="h-full w-full object-cover grayscale transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0" />
                      <div className="pointer-events-none absolute inset-0 bg-[#00f5ff]/20 opacity-0 transition-opacity group-hover:opacity-100"></div>
                      <div className="absolute bottom-3 right-3 flex translate-y-4 gap-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                        <button
                          onClick={() => handleEditBg(bg)}
                          aria-label="Editar background"
                          className="border border-white/20 bg-black/80 p-2.5 text-white transition-colors hover:border-[#00f5ff] hover:text-[#00f5ff]"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button
                          onClick={() => setConfirm({
                            title: "Remover background",
                            message: "Remover esta imagem de fundo?",
                            confirmLabel: "Remover",
                            onConfirm: () => handleDeleteBg(bg.id),
                          })}
                          aria-label="Excluir background"
                          className="border border-red-500 bg-red-600/90 p-2.5 text-white transition-colors hover:bg-red-700"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                  {backgrounds.length === 0 && (
                    <div className="col-span-full">
                      <AdminEmpty
                        title={t("admin.noBackgrounds", "Nenhum fundo cadastrado")}
                        hint="Adicione imagens de fundo para exibir durante a pontuação."
                      />
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* PHRASES SECTION */}
            <section>
              <div className="mb-8 flex items-center gap-4">
                <h2 className="text-xs font-bold uppercase tracking-[0.4em] text-white">{t("admin.phrases", "Frases de Avaliação")}</h2>
                <div className="h-[1px] flex-1 bg-white/[0.05]"></div>
              </div>

              <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
                {/* Form */}
                <div className="lg:col-span-4">
                  <form onSubmit={handleAddOrUpdatePhrase} className="admin-card space-y-8 border border-white/5 bg-[#0d0d12] p-8">
                    <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500">
                      {editingPhraseId ? t("admin.preview", "Editando Frase") : t("admin.addPhrase", "Nova Frase")}
                    </h3>
                    <div>
                      <label htmlFor="phrase-text" className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-gray-500">
                        {t("admin.phraseText", "Mensagem a Exibir")}
                      </label>
                      <textarea
                        id="phrase-text"
                        placeholder={t("admin.phrasePlaceholder", "Ex: Você cantou muito bem!")}
                        className="admin-input h-32 resize-none font-mono"
                        value={phraseText}
                        onChange={(e) => setPhraseText(e.target.value)}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="min-score" className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-gray-500">
                          {t("admin.minScore", "Nota Mínima")}
                        </label>
                        <input
                          id="min-score"
                          type="number"
                          className="admin-input font-mono"
                          value={minScore}
                          onChange={(e) => setMinScore(parseInt(e.target.value))}
                          min="0" max="100"
                        />
                      </div>
                      <div>
                        <label htmlFor="max-score" className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-gray-500">
                          {t("admin.maxScore", "Nota Máxima")}
                        </label>
                        <input
                          id="max-score"
                          type="number"
                          className="admin-input font-mono"
                          value={maxScore}
                          onChange={(e) => setMaxScore(parseInt(e.target.value))}
                          min="0" max="100"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <AdminButton type="submit" className="flex-1" size="lg" disabled={saving}>
                        {editingPhraseId ? t("common.save", "Salvar") : t("common.add", "Criar")}
                      </AdminButton>
                      {editingPhraseId && (
                        <AdminButton type="button" variant="outline" onClick={handleCancelEditPhrase} size="lg" aria-label="Cancelar edição">
                          X
                        </AdminButton>
                      )}
                    </div>
                  </form>
                </div>

                {/* List */}
                <div className="space-y-4 lg:col-span-8">
                  {phrases.map(phrase => (
                    <div key={phrase.id} className="admin-card group flex items-center justify-between border border-white/5 bg-[#0d0d12] p-6">
                      <div className="min-w-0 flex-1">
                        <div className="mb-3 flex items-center gap-4">
                          <span className="border border-[#00f5ff]/20 bg-[#00f5ff]/10 px-3 py-1 font-mono text-[10px] font-black text-[#00f5ff]">
                            {phrase.minScore} até {phrase.maxScore} pts
                          </span>
                          <div className="h-[1px] w-12 bg-white/5"></div>
                        </div>
                        <p className="truncate text-lg font-bold italic tracking-tight text-white transition-colors group-hover:text-[#00f5ff]">
                          "{phrase.phrase}"
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          onClick={() => handleEditPhrase(phrase)}
                          aria-label="Editar frase"
                          className="border border-white/10 bg-white/5 p-2.5 text-white transition-all hover:text-[#00f5ff]"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button
                          onClick={() => setConfirm({
                            title: "Remover frase",
                            message: `Remover a frase "${phrase.phrase}"?`,
                            confirmLabel: "Remover",
                            onConfirm: () => handleDeletePhrase(phrase.id),
                          })}
                          aria-label="Excluir frase"
                          className="border border-red-500/10 bg-red-600/5 p-2.5 text-red-500 transition-all hover:border-red-600 hover:bg-red-600 hover:text-white"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                  {phrases.length === 0 && (
                    <AdminEmpty
                      title={t("admin.noPhrases", "Nenhuma frase cadastrada")}
                      hint="Crie frases para celebrar a pontuação de cada apresentação."
                    />
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title || ""}
        message={confirm?.message || ""}
        confirmLabel={confirm?.confirmLabel}
        onConfirm={() => confirm?.onConfirm()}
        onCancel={() => setConfirm(null)}
      />
    </AdminLayout>
  );
}
