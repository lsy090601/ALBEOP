import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Variant = 'primary' | 'secondary';
type Size = 'sm' | 'md';

interface CommonProps {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  children: ReactNode;
  className?: string;
}

interface ButtonProps
  extends CommonProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> {
  to?: undefined;
}

interface LinkButtonProps extends CommonProps {
  to: string;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-navy text-white border border-navy hover:bg-navy-soft',
  secondary: 'bg-white text-navy border border-line hover:bg-surface',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-[18px] py-2.5 text-[13px] rounded-btn',
  md: 'px-[22px] py-3.5 text-[14px] rounded-btn',
};

function buildClassName(
  variant: Variant,
  size: Size,
  fullWidth: boolean | undefined,
  className: string | undefined,
) {
  return [
    'inline-flex items-center justify-center font-bold transition-colors',
    variantClasses[variant],
    sizeClasses[size],
    fullWidth ? 'w-full' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  children,
  className,
  ...rest
}: ButtonProps) {
  return (
    <button className={buildClassName(variant, size, fullWidth, className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  fullWidth,
  children,
  className,
  to,
}: LinkButtonProps) {
  return (
    <Link to={to} className={buildClassName(variant, size, fullWidth, className)}>
      {children}
    </Link>
  );
}

export default Button;
