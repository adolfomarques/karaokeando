import { useEffect, useRef } from "react";
import AdminButton from "./AdminButton";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Excluir",
  cancelLabel = "Cancelar",
  danger = true,
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={() => !loading && onCancel()}
      ></div>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="admin-card relative w-full max-w-md bg-[#0d0d12] p-8"
      >
        <h2 className="text-lg font-black uppercase tracking-tight text-white">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-gray-400">{message}</p>
        <div className="mt-8 flex justify-end gap-3">
          <AdminButton
            ref={cancelRef}
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </AdminButton>
          <AdminButton
            variant={danger ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Aguarde..." : confirmLabel}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
