import React from 'react';
import { CheckCircle2, XCircle, Clock, AlertCircle, UserX, Sparkles, Crown } from 'lucide-react';

/**
 * Design System Status Badge (Dorme Architecture)
 * Crisp pill tags supporting Light & Dark monochrome tokens
 */
export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  showIcon = true,
  className = '',
}) {
  const configs = {
    // Semantic OK (Success)
    present: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-500/20',
      icon: CheckCircle2,
      label: 'Present',
    },
    completed: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-500/20',
      icon: CheckCircle2,
      label: 'Completed',
    },
    // Semantic Error
    absent: {
      bg: 'bg-red-500/10 dark:bg-red-500/15',
      text: 'text-red-700 dark:text-red-400',
      border: 'border-red-500/20',
      icon: XCircle,
      label: 'Absent',
    },
    // Semantic Warn / Pending
    pending: {
      bg: 'bg-black/[0.04] dark:bg-white/[0.06]',
      text: 'text-[#6E6E73] dark:text-[#8E8E93]',
      border: 'border-black/[0.07] dark:border-white/[0.08]',
      icon: Clock,
      label: 'Pending',
    },
    // Admin Badge
    admin: {
      bg: 'bg-[#111214] dark:bg-white',
      text: 'text-white dark:text-[#0B0C0E]',
      border: 'border-black/10 dark:border-white/10',
      icon: Crown,
      label: 'Admin',
    },
    // Highlight / Accent Badge
    gold: {
      bg: 'bg-[#111214] dark:bg-white',
      text: 'text-white dark:text-[#0B0C0E]',
      border: 'border-black/10 dark:border-white/10',
      icon: Sparkles,
      label: 'Featured',
    },
    info: {
      bg: 'bg-black/[0.04] dark:bg-white/[0.06]',
      text: 'text-[#111214] dark:text-[#F5F5F7]',
      border: 'border-black/[0.07] dark:border-white/[0.08]',
      icon: AlertCircle,
      label: 'Info',
    },
    inactive: {
      bg: 'bg-black/[0.03] dark:bg-white/[0.04]',
      text: 'text-[#8E8E93] dark:text-[#636366]',
      border: 'border-black/[0.06] dark:border-white/[0.08]',
      icon: UserX,
      label: 'Inactive',
    },
    neutral: {
      bg: 'bg-black/[0.04] dark:bg-white/[0.06]',
      text: 'text-[#111214] dark:text-[#F5F5F7]',
      border: 'border-black/[0.07] dark:border-white/[0.08]',
      icon: null,
      label: '',
    },
    dark: {
      bg: 'bg-[#111214] dark:bg-white',
      text: 'text-white dark:text-[#0B0C0E]',
      border: 'border-black/10 dark:border-white/10',
      icon: null,
      label: '',
    },
  };

  const config = configs[variant] || configs.neutral;
  const IconComponent = config.icon;

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10.5px] gap-1',
    md: 'px-2.5 py-0.5 text-[11px] gap-1.5',
    lg: 'px-3.5 py-1 text-xs gap-2',
  };

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border shadow-2xs ${config.bg} ${config.text} ${config.border} ${sizeStyles[size]} ${className}`}
    >
      {showIcon && IconComponent && <IconComponent className="w-3 h-3 flex-shrink-0" strokeWidth={2.2} />}
      <span>{children || config.label}</span>
    </span>
  );
}
