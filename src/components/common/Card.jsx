import React from 'react';

/**
 * Modern Design System Card Component
 * Surface container with 22px rounded corners and Light/Dark token support
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
    ? 'border-[#ECBD56] ring-2 ring-[#ECBD56]/20 shadow-md'
    : 'border-[#DDD9D0] dark:border-[#2A364B] shadow-2xs hover:shadow-xs';

  const clickableStyles = onClick
    ? 'cursor-pointer active-scale hover:border-[#ECBD56]/60 dark:hover:border-[#ECBD56]/60 transition-all'
    : '';

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-[#171F2C] text-[#111216] dark:text-[#F7F6F3] rounded-[22px] border ${highlightBorder} ${paddingStyles[padding]} ${clickableStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
