import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'var(--color-accent)',
    color: '#fff',
  },
  secondary: {
    background: 'var(--color-accent-secondary)',
    color: '#fff',
  },
  outline: {
    background: 'transparent',
    border: '2px solid var(--color-accent)',
    color: 'var(--color-accent)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-text-secondary)',
  },
  danger: {
    background: 'var(--color-error)',
    color: '#fff',
  },
  success: {
    background: 'var(--color-success)',
    color: '#fff',
  },
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: {
    padding: '6px 12px',
    fontSize: '0.875rem',
  },
  md: {
    padding: '12px 24px',
    fontSize: '1rem',
  },
  lg: {
    padding: '16px 32px',
    fontSize: '1.125rem',
  },
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  style,
  ...props
}) => {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    borderRadius: 'var(--radius-lg)',
    fontWeight: 600,
    border: 'none',
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    opacity: disabled || isLoading ? 0.5 : 1,
    transition: 'all var(--transition-base)',
    width: fullWidth ? '100%' : 'auto',
    fontFamily: 'var(--font-sans)',
    ...variantStyles[variant],
    ...sizeStyles[size],
    ...style,
  };

  return (
    <button
      style={baseStyle}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ animation: 'spin 1s linear infinite' }}
        >
          <line x1="12" y1="2" x2="12" y2="6"></line>
          <line x1="12" y1="18" x2="12" y2="22"></line>
          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
          <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
          <line x1="2" y1="12" x2="6" y2="12"></line>
          <line x1="18" y1="12" x2="22" y2="12"></line>
          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
          <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
        </svg>
      ) : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
};

export default Button;
