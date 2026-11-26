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
    // Primary Coral-Amber Accent
    primary: 'bg-gradient-to-r from-[#EA580C] via-[#F97316] to-[#F59E0B] text-white hover:opacity-95 focus-visible:ring-[#EA580C] shadow-xs font-bold border border-transparent',
    // Rich Ink / Dark
    dark: 'bg-[#18181B] text-[#F4F4F5] dark:bg-[#F4F4F5] dark:text-[#18181B] hover:bg-[#27272A] active:bg-[#09090B] focus-visible:ring-[#18181B] shadow-xs font-bold border border-transparent',
    // White/Slate Secondary Surface
    secondary: 'bg-white dark:bg-[#171F2C] text-[#111216] dark:text-[#F7F6F3] border border-[#DDD9D0] dark:border-[#2A364B] hover:bg-[#F2F1ED] dark:hover:bg-[#1F2A3C] active:bg-[#EAE8E2] dark:active:bg-[#253248] focus-visible:ring-[#EA580C] shadow-2xs',
    // Ghost / Tertiary
    tertiary: 'bg-transparent text-[#4E525D] dark:text-[#9BA5B7] hover:text-[#111216] dark:hover:text-[#F7F6F3] hover:bg-[#EAE8E2]/60 dark:hover:bg-[#1F2A3C]/60 active:bg-[#EAE8E2] dark:active:bg-[#1F2A3C] focus-visible:ring-[#DDD9D0]',
    // Semantic Error
    destructive: 'bg-[#FDF1F0] dark:bg-[#331310] text-[#D9483B] dark:text-[#FF5A4E] border border-[#F5A9A2] dark:border-[#991B1B] hover:bg-[#FCE3E1] dark:hover:bg-[#451714] shadow-2xs',
    // Semantic OK
    success: 'bg-[#EAF8F1] dark:bg-[#0E2E1D] text-[#22AC77] dark:text-[#4ADE80] border border-[#97E2C0] dark:border-[#166534] hover:bg-[#D7F3E5] dark:hover:bg-[#14432B] shadow-2xs',
    // Admin Gradient
    admin: 'admin-gradient text-white border border-[#ECBD56]/40 hover:opacity-95 shadow-xs font-bold',
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
