import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Mobile Bottom Sheet / Modal with Light/Dark Theme Support and 4px border-radius
 */
export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  className = '',
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Sheet Container */}
      <div
        className={`relative w-full max-w-md bg-white dark:bg-[#141518] text-[#111214] dark:text-[#F5F5F7] rounded-t-[24px] sm:rounded-[24px] shadow-2xl flex flex-col max-h-[85vh] z-10 transition-transform border-t sm:border border-black/[0.07] dark:border-white/[0.08] font-sans ${className}`}
      >
        {/* Mobile Drag Indicator Bar */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-black/15 dark:bg-white/15" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-4 sm:px-5 pt-3 pb-3 border-b border-black/[0.07] dark:border-white/[0.08]">
          <div>
            {title && <h3 className="text-base font-bold text-[#111214] dark:text-[#F5F5F7] leading-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#111214] dark:hover:text-[#F5F5F7] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 scrollbar-thin">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-4 sm:px-5 py-3 border-t border-black/[0.07] dark:border-white/[0.08] bg-[#F5F5F7]/80 dark:bg-[#141518]/80 flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
