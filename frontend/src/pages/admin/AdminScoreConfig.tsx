import React, { useState, useEffect } from "react";
import AdminLayout from "./AdminLayout";
import { 
  getAdminBackgrounds, addAdminBackground, updateAdminBackground, deleteAdminBackground, 
  getAdminPhrases, addAdminPhrase, updateAdminPhrase, deleteAdminPhrase,
  AdminBackground, AdminPhrase 
} from "../../api";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";

export default function AdminScoreConfig() {
  const { t } = useTranslation();
  const [backgrounds, setBackgrounds] = useState<AdminBackground[]>([]);
  const [phrases, setPhrases] = useState<AdminPhrase[]>([]);

  // Background form
  const [editingBgId, setEditingBgId] = useState<string | null>(null);
  const [bgUrl, setBgUrl] = useState("");
  
  // Phrase form
  const [editingPhraseId, setEditingPhraseId] = useState<string | null>(null);
  const [phraseText, setPhraseText] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [maxScore, setMaxScore] = useState(100);

  const loadData = () => {
    Promise.all([getAdminBackgrounds(), getAdminPhrases()])
      .then(([bgData, phraseData]) => {
        setBackgrounds(bgData);
        setPhrases(phraseData);
      })
      .catch((err) => toast.error(t("admin.connError", "Erro ao carregar dados") + ": " + err.message));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddOrUpdateBackground = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bgUrl) return;
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
    if (!window.confirm(t("admin.deleteBackgroundConfirm", "Remover imagem de fundo?"))) return;
    try {
      await deleteAdminBackground(id);
      toast.success(t("admin.backgroundDeleted", "Background removido"));
      loadData();
    } catch {
      toast.error(t("admin.deleteError", "Erro ao remover"));
    }
  };

  const handleDeletePhrase = async (id: string) => {
    if (!window.confirm(t("admin.deletePhraseConfirm", "Remover frase de pontuação?"))) return;
    try {
      await deleteAdminPhrase(id);
      toast.success(t("admin.phraseDeleted", "Frase removida"));
      loadData();
    } catch {
      toast.error(t("admin.deleteError", "Erro ao remover"));
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl space-y-24 pb-20">
        <header className="mb-12">
          <h1 className="text-4xl font-black mb-2 tracking-tighter uppercase neon-glow-cyan text-white">
            Score <span className="text-white/20">/</span> Config
          </h1>
          <p className="text-gray-500 text-sm font-mono tracking-widest uppercase">
            {t("admin.scoreLogic", "Personalize as imagens e frases baseadas na pontuação")}
          </p>
        </header>

        {/* BACKGROUNDS SECTION */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.4em] text-white">{t("admin.backgrounds", "Fundos de Tela")}</h2>
            <div className="flex-1 h-[1px] bg-white/[0.05]"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Form */}
            <div className="lg:col-span-4">
              <form onSubmit={handleAddOrUpdateBackground} className="admin-card p-10 space-y-6 border border-white/5 bg-[#0d0d12]">
                <h3 className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.3em] mb-4">
                  {editingBgId ? t("admin.preview", "Editando") : t("admin.addBackground", "Adicionar")}
                </h3>
                <div>
                  <label htmlFor="bg-url" className="block text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-2">{t("admin.imageUrl", "URL da Imagem")}</label>
                  <input 
                    id="bg-url"
                    type="url" 
                    placeholder="https://..."
                    className="w-full bg-black/50 border border-white/5 rounded-none px-6 py-4 focus:outline-none focus:border-[#00f5ff] text-xs font-mono transition-colors placeholder:text-gray-800 text-white"
                    value={bgUrl}
                    onChange={(e) => setBgUrl(e.target.value)}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <button 
                    type="submit"
                    className="flex-1 bg-white text-black font-black uppercase text-xs tracking-[0.2em] py-5 hover:bg-[#00f5ff] transition-colors"
                  >
                    {editingBgId ? t("common.save", "Salvar") : t("common.add", "Adicionar")}
                  </button>
                  {editingBgId && (
                    <button 
                      type="button"
                      onClick={handleCancelEditBg}
                      className="flex-none bg-white/10 text-white font-black uppercase text-xs tracking-[0.2em] px-4 hover:bg-white/20 transition-colors border border-white/5"
                    >
                      X
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* List */}
            <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-3 gap-6 stagger-in">
              {backgrounds.map(bg => (
                <div key={bg.id} className="group relative aspect-video bg-black border border-white/5 overflow-hidden">
                  <img src={bg.url} alt="" className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700" />
                  <div className="absolute inset-0 bg-[#00f5ff]/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                  <div className="absolute bottom-4 right-4 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 flex gap-2">
                    <button 
                      onClick={() => handleEditBg(bg)}
                      className="bg-black/80 text-white p-3 border border-white/20 hover:bg-white/20 hover:border-[#00f5ff] hover:text-[#00f5ff] transition-colors shadow-2xl"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button 
                      onClick={() => handleDeleteBg(bg.id)}
                      className="bg-red-600/90 text-white p-3 border border-red-500 hover:bg-red-700 transition-colors shadow-2xl"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              {backgrounds.length === 0 && (
                <div className="col-span-full py-16 text-center admin-card border-dashed border-white/10 opacity-30 bg-[#0d0d12]">
                  <span className="font-mono text-xs uppercase tracking-widest italic">{t("admin.noBackgrounds", "Nenhum fundo cadastrado")}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* PHRASES SECTION */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.4em] text-white">{t("admin.phrases", "Frases de Avaliação")}</h2>
            <div className="flex-1 h-[1px] bg-white/[0.05]"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Form */}
            <div className="lg:col-span-4">
              <form onSubmit={handleAddOrUpdatePhrase} className="admin-card p-10 space-y-8 border border-white/5 bg-[#0d0d12]">
                <h3 className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.3em] mb-4">
                  {editingPhraseId ? t("admin.preview", "Editando") : t("admin.addPhrase", "Nova Frase")}
                </h3>
                <div>
                  <label htmlFor="phrase-text" className="block text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-2">{t("admin.phraseText", "Mensagem a Exibir")}</label>
                  <textarea 
                    id="phrase-text"
                    placeholder={t("admin.phrasePlaceholder", "Ex: Você cantou muito bem!")}
                    className="w-full bg-black/50 border border-white/5 rounded-none px-6 py-4 focus:outline-none focus:border-[#00f5ff] text-xs font-mono h-32 resize-none transition-colors placeholder:text-gray-800 text-white"
                    value={phraseText}
                    onChange={(e) => setPhraseText(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="min-score" className="block text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-2">{t("admin.minScore", "Nota Mínima")}</label>
                    <input 
                      id="min-score"
                      type="number" 
                      className="w-full bg-black/50 border border-white/5 rounded-none px-4 py-3 focus:outline-none focus:border-[#00f5ff] text-xs font-mono text-white"
                      value={minScore}
                      onChange={(e) => setMinScore(parseInt(e.target.value))}
                      min="0" max="100"
                    />
                  </div>
                  <div>
                    <label htmlFor="max-score" className="block text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-2">{t("admin.maxScore", "Nota Máxima")}</label>
                    <input 
                      id="max-score"
                      type="number" 
                      className="w-full bg-black/50 border border-white/5 rounded-none px-4 py-3 focus:outline-none focus:border-[#00f5ff] text-xs font-mono text-white"
                      value={maxScore}
                      onChange={(e) => setMaxScore(parseInt(e.target.value))}
                      min="0" max="100"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    type="submit"
                    className="flex-1 bg-[#00f5ff] text-black font-black uppercase text-xs tracking-[0.2em] py-5 hover:bg-[#2dd4bf] transition-colors"
                  >
                    {editingPhraseId ? t("common.save", "Salvar") : t("common.add", "Criar")}
                  </button>
                  {editingPhraseId && (
                    <button 
                      type="button"
                      onClick={handleCancelEditPhrase}
                      className="flex-none bg-white/10 text-[#00f5ff] font-black uppercase text-xs tracking-[0.2em] px-4 hover:bg-white/20 transition-colors border border-white/5"
                    >
                      X
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* List */}
            <div className="lg:col-span-8 space-y-4 stagger-in">
              {phrases.map(phrase => (
                <div key={phrase.id} className="admin-card p-8 group flex items-center justify-between border border-white/5 bg-[#0d0d12]">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <span className="px-3 py-1 bg-[#00f5ff]/10 text-[#00f5ff] text-[10px] font-black font-mono border border-[#00f5ff]/20">
                        {phrase.minScore} até {phrase.maxScore} pts
                      </span>
                      <div className="h-[1px] w-12 bg-white/5"></div>
                    </div>
                    <p className="text-lg font-bold tracking-tight text-white group-hover:text-[#00f5ff] transition-colors italic">"{phrase.phrase}"</p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleEditPhrase(phrase)}
                      className="p-3 bg-white/5 text-white hover:bg-white/10 hover:text-[#00f5ff] transition-all border border-white/10"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button 
                      onClick={() => handleDeletePhrase(phrase.id)}
                      className="p-3 bg-red-600/5 text-red-500 hover:bg-red-600 hover:text-white transition-all border border-red-500/10 hover:border-red-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              {phrases.length === 0 && (
                <div className="py-16 text-center admin-card border-dashed border-white/10 opacity-30 bg-[#0d0d12]">
                  <span className="font-mono text-xs uppercase tracking-widest italic">{t("admin.noPhrases", "Nenhuma frase cadastrada")}</span>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
