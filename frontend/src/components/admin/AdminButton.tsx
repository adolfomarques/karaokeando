import React from "react";

type ButtonVariant = "primary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface AdminButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-[#00f5ff] text-black hover:bg-white shadow-[0_0_20px_rgba(0,245,255,0.25)] hover:shadow-[0_0_28px_rgba(0,245,255,0.4)]",
  outline:
    "border border-white/15 text-white hover:border-[#00f5ff]/50 hover:text-[#00f5ff] hover:bg-[#00f5ff]/5",
  ghost: "text-gray-400 hover:text-white hover:bg-white/5",
  danger:
    "bg-red-500/10 text-red-300 border border-red-500/25 hover:bg-red-500/25 hover:text-red-200",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "px-3 py-2 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-8 py-3 text-sm",
};

const AdminButton = React.forwardRef<HTMLButtonElement, AdminButtonProps>(
  function AdminButton(
    { variant = "primary", size = "md", className = "", disabled, ...rest },
    ref
  ) {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center gap-2 rounded font-bold uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
        disabled={disabled}
        {...rest}
      />
    );
  }
);

export default AdminButton;
