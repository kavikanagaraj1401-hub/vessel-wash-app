import React from 'react';
import { CheckCircle2, XCircle, Clock, AlertCircle, UserX, Sparkles } from 'lucide-react';

/**
 * Design System Status Badge
 * Fully rounded pill tags using pastel accents (#A28EF9, #FFD89D, #A4F5A6, #ECEEF0, #1E1E1E)
 */
export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  showIcon = true,
  className = '',
}) {
  const configs = {
    present: {
      bg: 'bg-[#A4F5A6]',
      text: 'text-[#0C4E10]',
      border: 'border-[#8DEB90]',
      icon: CheckCircle2,
      label: 'Present',
    },
    completed: {
      bg: 'bg-[#A4F5A6]',
      text: 'text-[#0C4E10]',
      border: 'border-[#8DEB90]',
      icon: CheckCircle2,
      label: 'Completed',
    },
    absent: {
      bg: 'bg-[#FFE2E2]',
      text: 'text-[#8C1414]',
      border: 'border-[#FFBABA]',
      icon: XCircle,
      label: 'Absent',
    },
    pending: {
      bg: 'bg-[#FFD89D]',
      text: 'text-[#613500]',
      border: 'border-[#F8C67B]',
      icon: Clock,
      label: 'Pending',
    },
    inactive: {
      bg: 'bg-[#ECEEF0]',
      text: 'text-neutral-textTertiary',
      border: 'border-neutral-border',
      icon: UserX,
      label: 'Inactive',
    },
    periwinkle: {
      bg: 'bg-[#A28EF9]',
      text: 'text-[#1E1E1E]',
      border: 'border-[#9079F7]',
      icon: Sparkles,
      label: 'Accent',
    },
    info: {
      bg: 'bg-[#A28EF9]/20',
      text: 'text-[#4730A3]',
      border: 'border-[#A28EF9]/40',
      icon: AlertCircle,
      label: 'Info',
    },
    neutral: {
      bg: 'bg-[#ECEEF0]',
      text: 'text-[#1E1E1E]',
      border: 'border-neutral-border/60',
      icon: null,
      label: '',
    },
    dark: {
      bg: 'bg-[#1E1E1E]',
      text: 'text-white',
      border: 'border-[#333333]',
      icon: null,
      label: '',
    },
  };

  const config = configs[variant] || configs.neutral;
  const IconComponent = config.icon;

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[11px] gap-1',
    md: 'px-2.5 py-0.8 text-xs gap-1.5',
    lg: 'px-3.5 py-1.5 text-sm gap-2',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border shadow-2xs ${config.bg} ${config.text} ${config.border} ${sizeStyles[size]} ${className}`}
    >
      {showIcon && IconComponent && <IconComponent className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2.2} />}
      <span>{children || config.label}</span>
    </span>
  );
}
