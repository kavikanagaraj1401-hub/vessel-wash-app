import React from 'react';

/**
 * Modern Design System Card Component
 * Standardized 4px border-radius with Light/Dark token support
 * Light: #FFFFFF (Pure White) | Dark: #171F2C (Deep Slate)
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
    ? 'border-[#EA580C] dark:border-[#F59E0B] ring-2 ring-[#EA580C]/20 shadow-md'
    : 'border-[#DDD9D0] dark:border-[#2A364B] shadow-2xs hover:shadow-xs';

  const clickableStyles = onClick
    ? 'cursor-pointer active-scale hover:border-[#EA580C]/60 dark:hover:border-[#F59E0B]/60 transition-all'
    : '';

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-[#171F2C] text-[#111216] dark:text-[#F7F6F3] rounded-2xl border ${highlightBorder} ${paddingStyles[padding]} ${clickableStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
