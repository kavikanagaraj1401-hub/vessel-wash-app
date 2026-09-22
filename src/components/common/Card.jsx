import React from 'react';

/**
 * Modern Design System Card Component
 * Surface container with 20px-24px rounded corners and pure white surface
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
    ? 'border-[#A28EF9] ring-2 ring-[#A28EF9]/20 shadow-md'
    : 'border-neutral-border/80 shadow-2xs hover:shadow-xs';

  const clickableStyles = onClick
    ? 'cursor-pointer active-scale hover:border-neutral-300 transition-all'
    : '';

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-[22px] border ${highlightBorder} ${paddingStyles[padding]} ${clickableStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
