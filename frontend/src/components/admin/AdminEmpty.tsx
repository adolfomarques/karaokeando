import React from "react";

interface AdminEmptyProps {
  title: string;
  hint?: string;
  icon?: React.ReactNode;
}

export default function AdminEmpty({ title, hint, icon }: AdminEmptyProps) {
  return (
    <div className="admin-card flex flex-col items-center justify-center border border-dashed border-white/10 bg-[#0d0d12] py-16 px-8 text-center">
      {icon && <div className="mb-4 text-gray-600">{icon}</div>}
      <div className="font-mono text-xs uppercase tracking-[0.3em] text-gray-500">{title}</div>
      {hint && <div className="mt-2 text-sm text-gray-600">{hint}</div>}
    </div>
  );
}
