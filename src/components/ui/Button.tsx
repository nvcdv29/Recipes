import { cn } from '../../lib/utils';
import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  disabled?: boolean;
  icon?: LucideIcon;
  type?: 'button' | 'submit' | 'reset';
}

export const Button = ({ 
  children, 
  onClick, 
  className, 
  variant = 'primary', 
  disabled, 
  icon: Icon, 
  type = 'button' 
}: ButtonProps) => {
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary/90 shadow-sm',
    secondary: 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest',
    outline: 'border border-outline-variant text-primary hover:bg-primary/5',
    ghost: 'text-primary hover:bg-primary/5',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100'
  };

  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled}
      className={cn(
        'flex items-center justify-center gap-2 px-6 py-2.5 rounded-full font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        className
      )}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};
