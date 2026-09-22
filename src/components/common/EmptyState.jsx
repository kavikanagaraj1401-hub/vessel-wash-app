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
    <div className={`flex flex-col items-center justify-center text-center p-8 bg-white rounded-xl border border-neutral-border shadow-sm ${className}`}>
      <div className="w-12 h-12 rounded-full bg-neutral-surfaceSecondary border border-neutral-border flex items-center justify-center text-neutral-textSecondary mb-3">
        <Icon className="w-6 h-6" strokeWidth={1.75} />
      </div>
      <h3 className="text-sm font-semibold text-neutral-textPrimary mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-neutral-textSecondary max-w-xs mb-4">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
