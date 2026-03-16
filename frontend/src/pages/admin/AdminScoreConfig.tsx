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
  };

  return (
    <AdminLayout>
      <Toaster position="top-right" />
      <div className="max-w-6xl space-y-12 pb-20">
        <h1 className="text-3xl font-bold">Configuração de Score</h1>

        {/* BACKGROUNDS SECTION */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-300">Backgrounds de Vitória</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-1">
              <form onSubmit={handleAddBackground} className="bg-[#121216] p-6 rounded-2xl border border-white/5 space-y-4">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-500">Novo Background</h3>
                <div>
                  <label htmlFor="bg-url" className="block text-xs text-gray-400 mb-1">URL da Imagem</label>
                  <input 
                    id="bg-url"
                    type="url" 
                    placeholder="https://exemplo.com/imagem.jp..."
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-red-500 text-sm"
                    value={bgUrl}
                    onChange={(e) => setBgUrl(e.target.value)}
                    required
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700 py-2 rounded-xl transition-colors font-bold"
                >
                  Adicionar Imagem
                </button>
              </form>
            </div>

            {/* List */}
            <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
              {backgrounds.map(bg => (
                <div key={bg.id} className="group relative aspect-video bg-gray-900 rounded-xl overflow-hidden border border-white/5">
                  <img src={bg.url} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                      onClick={() => handleDeleteBg(bg.id)}
                      className="bg-red-600 p-2 rounded-full hover:scale-110 transition-transform"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              {backgrounds.length === 0 && <div className="col-span-full py-10 text-center text-gray-500 bg-[#121216] rounded-xl">Sem imagens cadastradas.</div>}
            </div>
          </div>
        </section>

        {/* PHRASES SECTION */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-300">Frases de Incentivo/Zueira</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-1">
              <form onSubmit={handleAddPhrase} className="bg-[#121216] p-6 rounded-2xl border border-white/5 space-y-4">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-500">Nova Frase</h3>
                <div>
                  <label htmlFor="phrase-text" className="block text-xs text-gray-400 mb-1">Frase</label>
                  <textarea 
                    id="phrase-text"
                    placeholder="Ex: Cantou muito! Ou... melhore."
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-red-500 text-sm h-24 resize-none"
                    value={phraseText}
                    onChange={(e) => setPhraseText(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="min-score" className="block text-xs text-gray-400 mb-1">Score Mín</label>
                    <input 
                      id="min-score"
                      type="number" 
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-red-500 text-sm"
                      value={minScore}
                      onChange={(e) => setMinScore(parseInt(e.target.value))}
                      min="0" max="100"
                    />
                  </div>
                  <div>
                    <label htmlFor="max-score" className="block text-xs text-gray-400 mb-1">Score Máx</label>
                    <input 
                      id="max-score"
                      type="number" 
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-red-500 text-sm"
                      value={maxScore}
                      onChange={(e) => setMaxScore(parseInt(e.target.value))}
                      min="0" max="100"
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700 py-2 rounded-xl transition-colors font-bold"
                >
                  Salvar Frase
                </button>
              </form>
            </div>

            {/* List */}
            <div className="lg:col-span-2 space-y-3">
              {phrases.map(phrase => (
                <div key={phrase.id} className="flex items-center justify-between bg-[#121216] p-4 rounded-xl border border-white/5 group">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-red-600/20 text-red-500 rounded text-xs font-bold font-mono">
                        {phrase.minScore}-{phrase.maxScore}
                      </span>
                    </div>
                    <p className="text-sm text-gray-200">{phrase.phrase}</p>
                  </div>
                  <button 
                    onClick={() => handleDeletePhrase(phrase.id)}
                    className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-600/20 text-red-500 rounded-lg transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
              {phrases.length === 0 && <div className="py-10 text-center text-gray-500 bg-[#121216] rounded-xl">Sem frases cadastradas.</div>}
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
