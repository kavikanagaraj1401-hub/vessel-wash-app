import React from 'react';

/**
 * Design System Button component
 * Standardized 4px corner radius with exact Light/Dark tokens & warm coral-amber accent
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
  const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all duration-150 select-none outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active-scale disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 rounded-xl font-sans cursor-pointer';

  const sizeStyles = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'min-h-[40px] px-4 text-sm gap-2',
    lg: 'h-11 px-5 text-base gap-2.5',
    icon: 'h-9 w-9 p-0',
  };

  const variantStyles = {
    // Primary High-Contrast Monochrome
    primary: 'bg-[#111214] text-white dark:bg-white dark:text-[#0B0C0E] hover:opacity-90 focus-visible:ring-black dark:focus-visible:ring-white shadow-xs font-semibold border border-transparent',
    // Rich Ink / Dark
    dark: 'bg-[#111214] text-white dark:bg-white dark:text-[#0B0C0E] hover:opacity-90 active:scale-95 focus-visible:ring-black shadow-xs font-semibold border border-transparent',
    // Secondary White/Graphite Surface
    secondary: 'bg-white dark:bg-[#141518] text-[#111214] dark:text-[#F5F5F7] border border-black/[0.08] dark:border-white/[0.1] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] active:bg-black/[0.08] dark:active:bg-white/[0.08] focus-visible:ring-black/20 shadow-2xs',
    // Ghost / Tertiary
    tertiary: 'bg-transparent text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#111214] dark:hover:text-[#F5F5F7] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] active:bg-black/[0.08] dark:active:bg-white/[0.08]',
    // Semantic Error (clean muted tone)
    destructive: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-500/15 shadow-2xs',
    // Semantic OK (clean muted tone)
    success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/15 shadow-2xs',
    // Admin Button
    admin: 'bg-[#111214] text-white dark:bg-white dark:text-[#0B0C0E] border border-black/10 dark:border-white/10 hover:opacity-90 shadow-xs font-semibold',
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
