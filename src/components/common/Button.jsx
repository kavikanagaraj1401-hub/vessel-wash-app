import React from 'react';

/**
 * Design System Button component
 * Pill shaped (rounded-full) with pastel and dark accent styling
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon: Icon,
  iconPosition = 'left',
  onClick,
  className = '',
  type = 'button',
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all duration-150 select-none outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active-scale disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 rounded-full font-sans';

  const sizeStyles = {
    sm: 'h-9 px-3.5 text-xs gap-1.5',
    md: 'min-h-[44px] px-5 text-sm gap-2', // Meets 44px min touch target
    lg: 'h-12 px-6 text-base gap-2.5',
    icon: 'h-11 w-11 p-0',
  };

  const variantStyles = {
    primary: 'bg-[#A28EF9] text-[#1E1E1E] hover:bg-[#9077F7] active:bg-[#7D64F6] focus-visible:ring-[#A28EF9] shadow-xs hover:shadow-sm font-bold',
    dark: 'bg-[#1E1E1E] text-white hover:bg-[#2D2D2D] active:bg-[#111111] focus-visible:ring-[#1E1E1E] shadow-xs font-bold',
    secondary: 'bg-white text-[#1E1E1E] border border-neutral-border hover:bg-[#ECEEF0] active:bg-neutral-200 focus-visible:ring-neutral-border shadow-2xs',
    tertiary: 'bg-transparent text-neutral-textSecondary hover:text-neutral-textPrimary hover:bg-[#ECEEF0]/60 active:bg-[#ECEEF0] focus-visible:ring-neutral-border',
    destructive: 'bg-[#FFE2E2] text-[#8C1414] border border-[#FFBABA] hover:bg-[#FFD2D2] active:bg-[#FFC4C4] shadow-2xs',
    success: 'bg-[#A4F5A6] text-[#0C4E10] border border-[#8DEB90] hover:bg-[#8EF190] active:bg-[#7AE87C] shadow-2xs',
  };

  const currentSizeStyle = variant === 'icon' ? sizeStyles.icon : sizeStyles[size];
  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${currentSizeStyle} ${variantStyles[variant] || variantStyles.primary} ${widthStyle} ${className}`}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={2.2} />}
          {children}
          {Icon && iconPosition === 'right' && <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={2.2} />}
        </>
      )}
    </button>
  );
}
