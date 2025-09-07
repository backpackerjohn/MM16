import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'destructive-secondary';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  isLoading = false,
  children,
  ...props
}) => {
  const baseClasses = "px-6 py-2.5 font-bold rounded-lg transition-all shadow-sm flex items-center justify-center disabled:cursor-not-allowed text-sm";
  
  const variantClasses: Record<ButtonVariant, string> = {
    primary: 'text-[var(--color-primary-accent-text)] bg-[var(--color-primary-accent)] hover:bg-[var(--color-primary-accent-hover)] disabled:bg-stone-400',
    secondary: 'text-[var(--color-text-secondary)] bg-[var(--color-surface-sunken)] hover:bg-[var(--color-border)] border border-[var(--color-border)] disabled:bg-stone-200 disabled:text-stone-400',
    destructive: 'text-[var(--color-danger-text)] bg-[var(--color-danger)] hover:bg-[var(--color-danger-hover)] disabled:bg-red-300',
    'destructive-secondary': 'text-[var(--color-danger)] bg-transparent hover:bg-red-100 disabled:bg-transparent disabled:text-red-300',
  };

  const className = `${baseClasses} ${variantClasses[variant]}`;

  return (
    <button
      className={className}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {isLoading ? 'Processing...' : children}
    </button>
  );
};

export default Button;