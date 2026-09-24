import React from 'react';
import { LayoutGrid, Receipt, Users, History } from 'lucide-react';

/**
 * Floating Bottom Navigation Bar
 * Matching exact design token system:
 * - Floating deep dark charcoal pill (#111216 light / #171F2C dark, border-radius: 9999px)
 * - Inner padding: 8px 16px, centered with bottom margin
 * - Strictly 4 tabs: Dashboard, Bill, Members, History
 * - Inactive state: Muted ink / gray text & icon (#848A96 light / #A1A1AA dark)
 * - Active state: Exact Gold Accent (#ECBD56) with crisp font-bold highlight
 * - Smooth transition: transition-colors duration-200 ease-in-out
 */
export function BottomNav({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'today', label: 'Dashboard', icon: LayoutGrid },
    { id: 'bill', label: 'Bill', icon: Receipt },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'history', label: 'History', icon: History },
  ];

  return (
    <div className="fixed bottom-4 left-0 right-0 z-40 flex justify-center pointer-events-none px-3 pb-safe">
      {/* Floating Dark Pill Container */}
      <nav
        aria-label="Bottom Navigation"
        className="pointer-events-auto bg-[#111216] dark:bg-[#171F2C] rounded-full py-2 px-3 sm:px-6 shadow-2xl shadow-black/50 flex items-center justify-between border border-white/10 dark:border-[#2A364B] w-full max-w-[360px] transition-colors duration-200"
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
              className={`flex flex-col items-center justify-center gap-1 py-1 px-2 sm:px-3 flex-1 select-none active-scale transition-colors duration-200 ease-in-out cursor-pointer ${
                isActive
                  ? 'text-[#ECBD56]'
                  : 'text-[#848A96] dark:text-[#A1A1AA] hover:text-[#ECBD56]/80 dark:hover:text-[#F7F6F3]'
              }`}
            >
              <Icon
                className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200"
                strokeWidth={isActive ? 2.4 : 1.8}
              />
              <span
                className={`text-[10px] sm:text-[11px] tracking-tight leading-none font-sans ${
                  isActive ? 'font-bold' : 'font-medium'
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
