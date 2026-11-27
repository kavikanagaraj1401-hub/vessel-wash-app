import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './Button';

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-[#141518] rounded-[20px] border border-black/[0.07] dark:border-white/[0.08] shadow-xs transition-colors font-sans ${className}`}>
      <div className="w-12 h-12 rounded-full bg-[#F5F5F7] dark:bg-[#1C1D21] border border-black/[0.07] dark:border-white/[0.08] flex items-center justify-center text-[#111214] dark:text-[#F5F5F7] mb-3">
        <Icon className="w-6 h-6 text-current" strokeWidth={1.75} />
      </div>
      <h3 className="text-sm font-semibold text-[#111214] dark:text-[#F5F5F7] mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] max-w-xs mb-4">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
