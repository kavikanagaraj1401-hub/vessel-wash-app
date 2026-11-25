import React from 'react';
import { LayoutGrid, Receipt, Users, History } from 'lucide-react';

/**
 * Version 2 ("v2") Floating Bottom Navigation Bar
 * - Warm sunset / coral-to-amber gradient active accent
 * - Soft elevated neutral surfaces in Light Mode (bg-white/95 backdrop-blur-md)
 * - Deep slate / obsidian surfaces in Dark Mode (dark:bg-[#121620]/95)
 * - Strict WCAG AA contrast for active & inactive states
 * - Four-item icon-above-label layout with active pill elevation
 */
export function BottomNav({ activeTab, onTabChange, onOpenSettings }) {
  const tabs = [
    { id: 'today', label: 'Dashboard', icon: LayoutGrid },
    { id: 'bill', label: 'Bill', icon: Receipt },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'history', label: 'History', icon: History },
  ];

  return (
    <div className="fixed bottom-4 left-0 right-0 z-40 flex justify-center pointer-events-none px-3 pb-safe">
      {/* Floating Pill Container with Glass / Elevation */}
      <nav
        aria-label="Bottom Navigation"
        className="pointer-events-auto bg-white/95 dark:bg-[#121620]/95 backdrop-blur-md rounded-full py-1.5 px-2 sm:px-3 shadow-[0_10px_35px_rgba(0,0,0,0.12)] dark:shadow-[0_14px_40px_rgba(0,0,0,0.65)] flex items-center justify-between border border-[#E5E2DA] dark:border-[#273244] w-full max-w-[368px] transition-all duration-200"
      >
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
              className={`relative flex flex-col items-center justify-center gap-1 py-1.5 px-2.5 sm:px-3.5 rounded-full select-none active-scale transition-all duration-200 cursor-pointer flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/60 ${
                isActive
                  ? 'bg-gradient-to-r from-[#EA580C] via-[#F97316] to-[#F59E0B] text-white shadow-[0_3px_12px_rgba(249,115,22,0.38)]'
                  : 'text-[#52525B] dark:text-[#94A3B8] hover:text-[#18181B] dark:hover:text-[#F4F4F5] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Icon
                className="w-4 h-4 sm:w-[18px] sm:h-[18px] transition-transform duration-200"
                strokeWidth={isActive ? 2.4 : 1.9}
              />
              <span
                className={`text-[10px] sm:text-[11px] tracking-tight leading-none ${
                  isActive ? 'font-extrabold text-white' : 'font-semibold'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
