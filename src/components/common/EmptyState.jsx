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
    <div className={`flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-[#171F2C] rounded-2xl border border-[#DDD9D0] dark:border-[#2A364B] shadow-sm transition-colors ${className}`}>
      <div className="w-12 h-12 rounded-full bg-[#F2F1ED] dark:bg-[#1F2A3C] border border-[#DDD9D0] dark:border-[#2A364B] flex items-center justify-center text-[#111216]/60 dark:text-[#F7F6F3]/60 mb-3">
        <Icon className="w-6 h-6" strokeWidth={1.75} />
      </div>
      <h3 className="text-sm font-semibold text-[#111216] dark:text-[#F7F6F3] mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-[#111216]/60 dark:text-[#F7F6F3]/60 max-w-xs mb-4">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
