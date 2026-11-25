import React from 'react';
import { LayoutGrid, Receipt, Users, History } from 'lucide-react';

/**
 * Version 2 ("v2") Bottom Navigation Bar
 * - Edge-to-edge docked navbar with no rounded corners (rounded-none)
 * - Spans left-to-right full width (w-full)
 * - Strict WCAG AA contrast for active & inactive states
 * - Warm sunset / coral-to-amber active top-line indicator
 * - Four navigation tabs: Dashboard, Bill, Members, History
 */
export function BottomNav({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'today', label: 'Dashboard', icon: LayoutGrid },
    { id: 'bill', label: 'Bill', icon: Receipt },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'history', label: 'History', icon: History },
  ];

  return (
    <nav
      aria-label="Bottom Navigation"
      className="flex-shrink-0 z-40 w-full bg-white dark:bg-[#121620] border-t border-[#DDD9D0] dark:border-[#263042] rounded-none pb-safe shadow-[0_-2px_12px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.45)] transition-colors duration-200"
    >
      <div className="w-full grid grid-cols-4 h-16 px-1 sm:px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center gap-1.5 h-full w-full select-none active-scale transition-colors duration-150 cursor-pointer rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/60 ${
                isActive
                  ? 'text-[#EA580C] dark:text-[#F59E0B]'
                  : 'text-[#52525B] dark:text-[#94A3B8] hover:text-[#18181B] dark:hover:text-[#F4F4F5]'
              }`}
            >
              {/* Active top line accent indicator bar */}
              {isActive && (
                <span className="absolute top-0 inset-x-3 sm:inset-x-8 h-[3px] bg-gradient-to-r from-[#EA580C] via-[#F97316] to-[#F59E0B] rounded-none shadow-[0_1px_4px_rgba(249,115,22,0.4)]" />
              )}
              <Icon
                className="w-5 h-5 sm:w-[22px] sm:h-[22px] transition-transform duration-150"
                strokeWidth={isActive ? 2.5 : 1.9}
              />
              <span
                className={`text-[11px] sm:text-xs tracking-tight leading-none ${
                  isActive ? 'font-extrabold text-[#EA580C] dark:text-[#F59E0B]' : 'font-semibold'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
