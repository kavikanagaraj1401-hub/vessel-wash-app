import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Untitled UI Mobile Bottom Sheet / Modal
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
        className="fixed inset-0 bg-neutral-textPrimary/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Sheet Container */}
      <div
        className={`relative w-full max-w-md bg-white rounded-t-[26px] sm:rounded-[24px] shadow-2xl flex flex-col max-h-[85vh] z-10 transition-transform border-t sm:border border-neutral-border/60 ${className}`}
      >
        {/* Mobile Drag Indicator Bar */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-neutral-300" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-3.5 pb-3 border-b border-neutral-border/60">
          <div>
            {title && <h3 className="text-base font-bold text-neutral-textPrimary">{title}</h3>}
            {subtitle && <p className="text-xs text-neutral-textSecondary mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-textTertiary hover:text-neutral-textPrimary hover:bg-[#ECEEF0] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 overflow-y-auto flex-1 text-sm text-neutral-textSecondary">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-5 py-3.5 bg-[#F7F8FA] rounded-b-[24px] border-t border-neutral-border/60 flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
