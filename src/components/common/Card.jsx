import React from 'react';

/**
 * Modern Design System Bento Card Component (Dorme Reference)
 * Standardized 20px border-radius with pure Grayscale Monochrome tokens
 * Light: #FFFFFF (Pure White) on #F5F5F7 | Dark: #141518 (Elevated Graphite) on #0B0C0E
 */
export function Card({
  children,
  className = '',
  onClick,
  highlight = false,
  padding = 'default',
  ...props
}) {
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3.5',
    default: 'p-4 sm:p-5',
    lg: 'p-5 sm:p-6',
    xl: 'p-6 sm:p-7',
  };

  const highlightBorder = highlight
    ? 'border-[#111214] dark:border-white ring-2 ring-black/10 dark:ring-white/10 shadow-md'
    : 'border-black/[0.07] dark:border-white/[0.08] shadow-2xs hover:shadow-xs';

  const clickableStyles = onClick
    ? 'cursor-pointer active-scale hover:border-black/30 dark:hover:border-white/30 transition-all'
    : '';

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-[#141518] text-[#111214] dark:text-[#F5F5F7] rounded-[20px] border ${highlightBorder} ${paddingStyles[padding]} ${clickableStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

