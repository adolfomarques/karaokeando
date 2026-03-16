import { useState, useEffect } from "react";
import AdminLayout from "./AdminLayout";
import { 
  getAdminBackgrounds, addAdminBackground, deleteAdminBackground, 
  getAdminPhrases, addAdminPhrase, deleteAdminPhrase,
  AdminBackground, AdminPhrase 
} from "../../api";
import { Toaster, toast } from "react-hot-toast";

export default function AdminScoreConfig() {
  const [backgrounds, setBackgrounds] = useState<AdminBackground[]>([]);
  const [phrases, setPhrases] = useState<AdminPhrase[]>([]);

  // Background form
  const [bgUrl, setBgUrl] = useState("");
  
  // Phrase form
  const [phraseText, setPhraseText] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [maxScore, setMaxScore] = useState(100);

  const loadData = () => {
    Promise.all([getAdminBackgrounds(), getAdminPhrases()])
      .then(([bgData, phraseData]) => {
        setBackgrounds(bgData);
        setPhrases(phraseData);
      })
      .catch((err) => toast.error("Erro ao carregar dados: " + err.message));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddBackground = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bgUrl) return;
    try {
      await addAdminBackground(bgUrl);
      toast.success("Background adicionado");
      setBgUrl("");
      loadData();
    } catch {
      toast.error("Erro ao adicionar background");
    }
  };

  const handleAddPhrase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phraseText) return;
    try {
      await addAdminPhrase(phraseText, minScore, maxScore);
      toast.success("Frase adicionada");
      setPhraseText("");
      setMinScore(0);
      setMaxScore(100);
      loadData();
    } catch {
      toast.error("Erro ao adicionar frase");
    }
  };

  const handleDeleteBg = async (id: string) => {
    if (!window.confirm("Remover imagem de fundo?")) return;
    try {
      await deleteAdminBackground(id);
      toast.success("Background removido");
      loadData();
    } catch {
      toast.error("Erro ao remover background");
    }
  };

  const handleDeletePhrase = async (id: string) => {
    if (!window.confirm("Remover frase de pontuação?")) return;
    try {
      await deleteAdminPhrase(id);
      toast.success("Frase removida");
      loadData();
    } catch {
      toast.error("Erro ao remover frase");
    }
  };  return (
    <AdminLayout>
      <Toaster position="top-right" />
      <div className="max-w-7xl space-y-24 pb-20">
        <header className="mb-12">
          <h1 className="text-4xl font-black mb-2 tracking-tighter uppercase neon-glow-cyan">
            Score <span className="text-white/20">/</span> Assets
          </h1>
          <p className="text-gray-500 text-sm font-mono tracking-widest uppercase">
            Configuração de Experiência Visual e Frases
          </p>
        </header>

        {/* BACKGROUNDS SECTION */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.4em] text-white">Visual_Backgrounds</h2>
            <div className="flex-1 h-[1px] bg-white/[0.05]"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Form */}
            <div className="lg:col-span-4">
              <form onSubmit={handleAddBackground} className="admin-card p-10 space-y-6 border border-white/5 bg-white/[0.01]">
                <h3 className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.3em] mb-4">Novo_Buffer_Visual</h3>
                <div>
                  <label htmlFor="bg-url" className="block text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-2">URL_REPOSITORIO</label>
                  <input 
                    id="bg-url"
                    type="url" 
                    placeholder="HTTPS://..."
                    className="w-full bg-black/50 border border-white/5 rounded-none px-6 py-4 focus:outline-none focus:border-[#00f5ff] text-xs font-mono transition-colors placeholder:text-gray-800"
                    value={bgUrl}
                    onChange={(e) => setBgUrl(e.target.value)}
                    required
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-white text-black font-black uppercase text-xs tracking-[0.2em] py-5 hover:bg-[#00f5ff] transition-colors"
                >
                  Registrar Imagem
                </button>
              </form>
            </div>

            {/* List */}
            <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-3 gap-6 stagger-in">
              {backgrounds.map(bg => (
                <div key={bg.id} className="group relative aspect-video bg-black border border-white/5 overflow-hidden">
                  <img src={bg.url} alt="" className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700" />
                  <div className="absolute inset-0 bg-[#00f5ff]/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                  <div className="absolute bottom-4 right-4 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <button 
                      onClick={() => handleDeleteBg(bg.id)}
                      className="bg-red-600 text-white p-3 border border-red-500 hover:bg-red-700 transition-colors shadow-2xl"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              {backgrounds.length === 0 && (
                <div className="col-span-full py-16 text-center admin-card border-dashed border-white/10 opacity-30">
                  <span className="font-mono text-xs uppercase tracking-widest italic">Buffer_Visual_Empty</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* PHRASES SECTION */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.4em] text-white">Logic_Messages</h2>
            <div className="flex-1 h-[1px] bg-white/[0.05]"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Form */}
            <div className="lg:col-span-4">
              <form onSubmit={handleAddPhrase} className="admin-card p-10 space-y-8 border border-white/5 bg-white/[0.01]">
                <h3 className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.3em] mb-4">Nova_String_Ponto</h3>
                <div>
                  <label htmlFor="phrase-text" className="block text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-2">Mensagem_Feedback</label>
                  <textarea 
                    id="phrase-text"
                    placeholder="TEXT_LOAD..."
                    className="w-full bg-black/50 border border-white/5 rounded-none px-6 py-4 focus:outline-none focus:border-[#00f5ff] text-xs font-mono h-32 resize-none transition-colors placeholder:text-gray-800"
                    value={phraseText}
                    onChange={(e) => setPhraseText(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="min-score" className="block text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-2">SCORE_MIN</label>
                    <input 
                      id="min-score"
                      type="number" 
                      className="w-full bg-black/50 border border-white/5 rounded-none px-4 py-3 focus:outline-none focus:border-[#00f5ff] text-xs font-mono"
                      value={minScore}
                      onChange={(e) => setMinScore(parseInt(e.target.value))}
                      min="0" max="100"
                    />
                  </div>
                  <div>
                    <label htmlFor="max-score" className="block text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-2">SCORE_MAX</label>
                    <input 
                      id="max-score"
                      type="number" 
                      className="w-full bg-black/50 border border-white/5 rounded-none px-4 py-3 focus:outline-none focus:border-[#00f5ff] text-xs font-mono"
                      value={maxScore}
                      onChange={(e) => setMaxScore(parseInt(e.target.value))}
                      min="0" max="100"
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full bg-[#00f5ff] text-black font-black uppercase text-xs tracking-[0.2em] py-5 hover:bg-[#2dd4bf] transition-colors"
                >
                  Confirmar String
                </button>
              </form>
            </div>

            {/* List */}
            <div className="lg:col-span-8 space-y-4 stagger-in">
              {phrases.map(phrase => (
                <div key={phrase.id} className="admin-card p-8 group flex items-center justify-between border border-white/5 bg-white/[0.01]">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <span className="px-3 py-1 bg-[#00f5ff]/10 text-[#00f5ff] text-[10px] font-black font-mono border border-[#00f5ff]/20">
                        RANGE_{phrase.minScore}-{phrase.maxScore}_PTS
                      </span>
                      <div className="h-[1px] w-12 bg-white/5"></div>
                    </div>
                    <p className="text-lg font-bold tracking-tight text-white group-hover:text-[#00f5ff] transition-colors italic">"{phrase.phrase}"</p>
                  </div>
                  <button 
                    onClick={() => handleDeletePhrase(phrase.id)}
                    className="p-3 bg-red-600/5 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-600 hover:text-white transition-all border border-red-500/10 hover:border-red-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
              {phrases.length === 0 && (
                <div className="py-16 text-center admin-card border-dashed border-white/10 opacity-30">
                  <span className="font-mono text-xs uppercase tracking-widest italic">Logic_Registry_Null</span>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
