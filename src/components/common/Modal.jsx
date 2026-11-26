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
        className={`relative w-full max-w-md bg-white dark:bg-[#171F2C] text-[#111216] dark:text-[#F7F6F3] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] z-10 transition-transform border-t sm:border border-[#DDD9D0] dark:border-[#2A364B] ${className}`}
      >
        {/* Mobile Drag Indicator Bar */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[#DDD9D0] dark:bg-[#2A364B]" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-4 sm:px-5 pt-3 pb-3 border-b border-[#DDD9D0] dark:border-[#2A364B]">
          <div>
            {title && <h3 className="text-base font-bold text-[#111216] dark:text-[#F7F6F3] leading-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-[#4E525D] dark:text-[#9BA5B7] mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#848A96] dark:text-[#64748B] hover:text-[#111216] dark:hover:text-[#F7F6F3] hover:bg-[#EAE8E2] dark:hover:bg-[#1F2A3C] transition-colors cursor-pointer"
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
          <div className="px-4 sm:px-5 py-3 border-t border-[#DDD9D0] dark:border-[#2A364B] bg-[#F2F1ED]/50 dark:bg-[#0B0C0E]/50 flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
