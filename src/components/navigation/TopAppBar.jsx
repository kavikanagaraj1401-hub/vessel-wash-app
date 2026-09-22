import React, { useState, useEffect } from 'react';
import { Calendar, Menu, Clock, ShieldCheck, Check, User } from 'lucide-react';
import { Modal } from '../common/Modal';

export function TopAppBar({
  title = 'Vessel Washing',
  currentDateStr = 'Monday, 21 September 2026',
  currentUserId = 'm1',
  onSelectUser,
  allMembers = [],
  onSettingsClick,
  isLiveConnected = false,
}) {
  const [istTime, setIstTime] = useState('');
  const [userModalOpen, setUserModalOpen] = useState(false);

  const activeMember = allMembers.find(m => m.id === currentUserId) || {
    id: 'm1',
    name: 'Kavipriyan',
    code: 'M1',
  };
  const isAdmin = currentUserId === 'm1';

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options = {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      };
      setIstTime(now.toLocaleTimeString('en-US', options) + ' IST');
    };

    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-border pt-safe shadow-2xs">
        {/* Tier 1: App Title & Action Icons (Profile & Burger Menu) */}
        <div className="flex items-center justify-between px-4 h-14 gap-3">
          {/* App Brand */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[#A28EF9] flex items-center justify-center text-[#1E1E1E] shadow-2xs flex-shrink-0">
              <span className="text-xs font-extrabold tracking-tight">VW</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-bold tracking-tight text-[#1E1E1E] leading-tight truncate">
                  {title}
                </h1>
                {isLiveConnected && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Sync
                  </span>
                )}
              </div>
              <span className="text-[11px] text-neutral-textTertiary font-medium block truncate">
                Daily Roster System
              </span>
            </div>
          </div>

          {/* Right: Active Profile Switcher (Icon Alone) + Burger Menu */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* User Profile Icon Button (Icon Alone - opens profile modal) */}
            <button
              type="button"
              onClick={() => setUserModalOpen(true)}
              aria-label="Switch user profile"
              title={`Active Profile: ${activeMember.name}${isAdmin ? ' (Admin)' : ''}`}
              className="w-9 h-9 rounded-full bg-[#ECEEF0] hover:bg-neutral-200 text-[#1E1E1E] flex items-center justify-center border border-neutral-border/60 active-scale transition-all"
            >
              <User className="w-4 h-4" strokeWidth={2.2} />
            </button>

            {/* Burger Menu Button */}
            {onSettingsClick && (
              <button
                type="button"
                onClick={onSettingsClick}
                aria-label="Open menu and settings"
                title="Menu & Settings"
                className="w-9 h-9 rounded-full bg-[#ECEEF0] hover:bg-neutral-200 text-[#1E1E1E] flex items-center justify-center border border-neutral-border/60 active-scale transition-all"
              >
                <Menu className="w-4 h-4" strokeWidth={2.2} />
              </button>
            )}
          </div>
        </div>

        {/* Tier 2: Dedicated Date & Time Placement Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#ECEEF0]/60 border-t border-neutral-border/60 text-[11px]">
          <div className="flex items-center gap-2 text-[#1E1E1E] font-semibold truncate">
            <Calendar className="w-3.5 h-3.5 text-[#7D64F6] flex-shrink-0" />
            <span className="truncate">{currentDateStr}</span>
          </div>

          {istTime && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white text-[#1E1E1E] font-bold text-[10px] border border-neutral-border/70 shadow-2xs flex-shrink-0">
              <Clock className="w-2.5 h-2.5 text-[#7D64F6]" />
              <span>{istTime}</span>
            </div>
          )}
        </div>
      </header>

      {/* Profile Switcher Modal */}
      <Modal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title="Active User Profile"
        subtitle="Select who is currently using the application."
      >
        <div className="space-y-3 p-1">
          {/* Admin Notice */}
          <div className="p-3 rounded-xl bg-violet-50 border border-violet-200 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-violet-900">
              <ShieldCheck className="w-4 h-4 text-violet-600" />
              <span>Administrator: Kavipriyan (Member 1)</span>
            </div>
            <p className="text-[11px] text-violet-700">
              Only Kavipriyan has edit and administrative permissions (adding/editing members, modifying system settings). Other profiles are restricted to standard member actions.
            </p>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-neutral-textPrimary block">
              Choose Profile:
            </span>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {allMembers.map(m => {
                const isSelected = m.id === currentUserId;
                const isThisAdmin = m.id === 'm1';

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onSelectUser && onSelectUser(m.id);
                      setUserModalOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                      isSelected
                        ? 'bg-primary-50 border-primary text-primary font-bold shadow-xs'
                        : 'bg-white border-neutral-border text-neutral-textPrimary hover:bg-neutral-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isThisAdmin
                            ? 'bg-violet-600 text-white shadow-xs'
                            : 'bg-neutral-surfaceSecondary text-neutral-textSecondary'
                        }`}
                      >
                        {isThisAdmin ? '👑' : m.code}
                      </div>
                      <div className="text-left">
                        <span className="font-bold block">{m.name}</span>
                        <span className="text-[10px] text-neutral-textTertiary block">
                          {isThisAdmin ? 'Admin (Member 1) · Full Edit Access' : 'Standard Member · Restricted Access'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isThisAdmin && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-violet-100 text-violet-800 border border-violet-200">
                          Admin
                        </span>
                      )}
                      {isSelected && <Check className="w-4 h-4 text-primary" strokeWidth={2.5} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
