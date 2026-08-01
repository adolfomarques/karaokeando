import { useEffect, useMemo, useRef, useState } from "react";

export interface CommandPaletteItem {
  id: string;
  label: string;
  keywords?: string;
  icon?: React.ReactNode;
  action: () => void;
}

interface AdminCommandPaletteProps {
  open: boolean;
  onClose: () => void;
  items: CommandPaletteItem[];
}

export default function AdminCommandPalette({ open, onClose, items }: AdminCommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.keywords || "").toLowerCase().includes(q)
    );
  }, [query, items]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => setActiveIndex(0), [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const run = (item: CommandPaletteItem) => {
    onClose();
    item.action();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[activeIndex];
      if (item) run(item);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-start justify-center p-4 pt-[15vh]">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navegação rápida"
        className="admin-card relative w-full max-w-lg overflow-hidden border border-[#00f5ff]/20 bg-[#0d0d12] shadow-[0_0_60px_rgba(0,245,255,0.15)]"
      >
        <div className="flex items-center gap-3 border-b border-white/5 px-5 py-4">
          <svg className="h-4 w-4 shrink-0 text-[#00f5ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Navegar para... (Músicas, Logins, Playlists)"
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
          />
          <kbd className="shrink-0 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-gray-500">
            ESC
          </kbd>
        </div>
        <div ref={listRef} className="max-h-80 overflow-y-auto py-2" onMouseDown={(e) => e.preventDefault()}>
          {results.length === 0 && (
            <div className="px-5 py-8 text-center font-mono text-[11px] uppercase tracking-widest text-gray-600">
              Nenhum resultado para "{query}"
            </div>
          )}
          {results.map((item, index) => (
            <button
              key={item.id}
              onClick={() => run(item)}
              onMouseEnter={() => setActiveIndex(index)}
              className={`flex w-full items-center gap-4 px-5 py-3 text-left text-sm transition-colors ${
                index === activeIndex
                  ? "bg-[#00f5ff]/10 text-[#00f5ff]"
                  : "text-gray-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className={index === activeIndex ? "text-[#00f5ff]" : "text-gray-500"}>
                {item.icon}
              </span>
              <span className="flex-1 truncate font-medium">{item.label}</span>
              {index === activeIndex && (
                <span className="rounded bg-[#00f5ff]/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-[#00f5ff]">
                  Enter
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-white/5 bg-black/30 px-5 py-2.5">
          <span className="font-mono text-[9px] uppercase tracking-widest text-gray-600">
            {results.length} item(ns)
          </span>
          <div className="flex items-center gap-3 font-mono text-[9px] uppercase tracking-widest text-gray-600">
            <span>↑↓ navegar</span>
            <span>↵ abrir</span>
          </div>
        </div>
      </div>
    </div>
  );
}
