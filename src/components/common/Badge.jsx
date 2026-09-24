import React from 'react';
import { CheckCircle2, XCircle, Clock, AlertCircle, UserX, Sparkles, Crown } from 'lucide-react';

/**
 * Design System Status Badge
 * Fully rounded pill tags supporting Light & Dark tokens, Gold accents, and Admin gradient
 */
export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  showIcon = true,
  className = '',
}) {
  const configs = {
    // Semantic OK (Success) - Light #22AC77 | Dark #4ADE80
    present: {
      bg: 'bg-[#EAF8F1] dark:bg-[#0E2E1D]',
      text: 'text-[#22AC77] dark:text-[#4ADE80]',
      border: 'border-[#97E2C0] dark:border-[#166534]',
      icon: CheckCircle2,
      label: 'Present',
    },
    completed: {
      bg: 'bg-[#EAF8F1] dark:bg-[#0E2E1D]',
      text: 'text-[#22AC77] dark:text-[#4ADE80]',
      border: 'border-[#97E2C0] dark:border-[#166534]',
      icon: CheckCircle2,
      label: 'Completed',
    },
    // Semantic Error - Light #D9483B | Dark #FF5A4E
    absent: {
      bg: 'bg-[#FDF1F0] dark:bg-[#331310]',
      text: 'text-[#D9483B] dark:text-[#FF5A4E]',
      border: 'border-[#F5A9A2] dark:border-[#991B1B]',
      icon: XCircle,
      label: 'Absent',
    },
    // Semantic Warn - Light #E0851A | Dark #FF9F45
    pending: {
      bg: 'bg-[#FDF3E8] dark:bg-[#331C08]',
      text: 'text-[#E0851A] dark:text-[#FF9F45]',
      border: 'border-[#F7C68B] dark:border-[#854D0E]',
      icon: Clock,
      label: 'Pending',
    },
    // Admin Gradient Badge (#ECBD56 to #111216)
    admin: {
      bg: 'admin-gradient',
      text: 'text-white',
      border: 'border-[#ECBD56]/60',
      icon: Crown,
      label: 'Admin',
    },
    // Gold Accent Badge (#ECBD56)
    gold: {
      bg: 'bg-[#FCF7ED] dark:bg-[#272115]',
      text: 'text-[#845D08] dark:text-[#FBE6AB]',
      border: 'border-[#ECBD56]/60 dark:border-[#ECBD56]/40',
      icon: Sparkles,
      label: 'Gold',
    },
    // Semantic Info - Light #2563EB | Dark #BFB4FF
    info: {
      bg: 'bg-[#EFF6FF] dark:bg-[#1B1E3B]',
      text: 'text-[#2563EB] dark:text-[#BFB4FF]',
      border: 'border-[#93C5FD] dark:border-[#4338CA]',
      icon: AlertCircle,
      label: 'Info',
    },
    inactive: {
      bg: 'bg-[#EAE8E2] dark:bg-[#1F2A3C]',
      text: 'text-[#848A96] dark:text-[#64748B]',
      border: 'border-[#DDD9D0] dark:border-[#2A364B]',
      icon: UserX,
      label: 'Inactive',
    },
    neutral: {
      bg: 'bg-[#EAE8E2] dark:bg-[#1F2A3C]',
      text: 'text-[#111216] dark:text-[#F7F6F3]',
      border: 'border-[#DDD9D0] dark:border-[#2A364B]',
      icon: null,
      label: '',
    },
    dark: {
      bg: 'bg-[#111216] dark:bg-[#171F2C]',
      text: 'text-[#F7F6F3]',
      border: 'border-[#333333] dark:border-[#2A364B]',
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
      className={`inline-flex items-center font-bold rounded-full border shadow-2xs ${config.bg} ${config.text} ${config.border} ${sizeStyles[size]} ${className}`}
    >
      {showIcon && IconComponent && <IconComponent className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2.2} />}
      <span>{children || config.label}</span>
    </span>
  );
}
