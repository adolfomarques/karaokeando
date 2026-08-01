export default function AdminLoading({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-8 text-gray-500">
      <div className="h-4 w-4 rounded-full border-2 border-[#00f5ff]/25 border-t-[#00f5ff] animate-spin"></div>
      <span className="font-mono text-xs uppercase tracking-widest">{label}</span>
    </div>
  );
}
