import React from "react";

interface AdminStatCardProps {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
  hint?: string;
}

export default function AdminStatCard({ label, value, accent, hint }: AdminStatCardProps) {
  return (
    <div className="admin-card admin-stat-card relative p-8 group">
      <div className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em]">
        {label}
      </div>
      <div
        className={`mt-3 text-5xl font-black tracking-tighter admin-stat-value ${
          accent ? "text-[#00f5ff] neon-text-cyan" : "text-white"
        }`}
      >
        {value}
      </div>
      <div className={`mt-4 h-1 w-10 ${accent ? "bg-[#00f5ff]" : "bg-white/10"}`}></div>
      {hint && <div className="mt-3 text-[10px] font-mono text-gray-600 uppercase tracking-widest">{hint}</div>}
    </div>
  );
}
