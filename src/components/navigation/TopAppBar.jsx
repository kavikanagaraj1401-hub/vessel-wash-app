import React, { useState, useEffect } from 'react';
import { Calendar, Menu, Clock, ShieldCheck, Lock, Users, KeyRound, AlertCircle, LogOut, User } from 'lucide-react';
import { Modal } from '../common/Modal';

export function TopAppBar({
  title = 'Vessel Washing',
  currentDateStr = '',
  isAdmin = false,
  userName = 'Kavipriyan',
  userEmail = '',
  onSignOut,
  onToggleAdminMode,
  allMembers = [],
  adminUserIds = ['m1'],
  onSettingsClick,
  isLiveConnected = false,
}) {
  const [istTime, setIstTime] = useState('');
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [pinPromptOpen, setPinPromptOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const isPrimaryAdmin = (m) => m?.id === 'm1' || (m?.name && m.name.toLowerCase().includes('kavipriyan'));
  const isMemberAdmin = (m) => isPrimaryAdmin(m) || (adminUserIds && adminUserIds.includes(m?.id));

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

  const handleVerifyPin = () => {
    if (pinInput.trim() === '1401') {
      if (onToggleAdminMode) onToggleAdminMode(true);
      setPinPromptOpen(false);
      setPinInput('');
      setPinError('');
    } else {
      setPinError('Incorrect admin passcode. Please enter 1401.');
    }
  };

  return (
    <>
      {/* Static Non-Scrolling Header Bar */}
      <header className="flex-shrink-0 z-40 bg-white border-b border-neutral-border pt-safe shadow-2xs">
        {/* Tier 1: App Title & Action Icons (Members & Burger Menu) */}
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

          {/* Right: User Profile Badge, Members Directory Button & Burger Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Logged-in User Profile Badge */}
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              aria-label="User profile & account"
              title={`Logged in as ${userName} (${userEmail || 'Active session'})`}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ECEEF0] hover:bg-neutral-200 text-[#1E1E1E] border border-neutral-border/70 active-scale transition-all"
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold flex-shrink-0 ${
                  isAdmin ? 'bg-violet-600 text-white shadow-2xs' : 'bg-[#1E1E1E] text-white'
                }`}
              >
                {isAdmin ? '👑' : (userName.charAt(0) || 'U')}
              </div>
              <span className="text-xs font-bold text-[#1E1E1E] max-w-[70px] sm:max-w-[120px] truncate leading-none">
                {userName}
              </span>
            </button>

            {/* Direct Log Out Button in Navigation Header */}
            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                aria-label="Log Out"
                title={`Log Out (${userName})`}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold active-scale transition-all cursor-pointer shadow-2xs"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            )}

            {/* Application Members Button (Shows directory without switching) */}
            <button
              type="button"
              onClick={() => setMembersModalOpen(true)}
              aria-label="View application members and admins"
              title="Members & Admins Directory"
              className="w-8 h-8 rounded-full bg-[#ECEEF0] hover:bg-neutral-200 text-[#1E1E1E] flex items-center justify-center border border-neutral-border/60 active-scale transition-all"
            >
              <Users className="w-3.5 h-3.5" strokeWidth={2.2} />
            </button>

            {/* Burger Menu Button */}
            {onSettingsClick && (
              <button
                type="button"
                onClick={onSettingsClick}
                aria-label="Open menu and settings"
                title="Menu & Settings"
                className="w-8 h-8 rounded-full bg-[#ECEEF0] hover:bg-neutral-200 text-[#1E1E1E] flex items-center justify-center border border-neutral-border/60 active-scale transition-all"
              >
                <Menu className="w-3.5 h-3.5" strokeWidth={2.2} />
              </button>
            )}
          </div>
        </div>

        {/* Tier 2: Static Dedicated Date & Time Placement Bar */}
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

      {/* Application Members & Admins Directory Modal (Read-Only Directory - No Profile Switching) */}
      <Modal
        isOpen={membersModalOpen}
        onClose={() => setMembersModalOpen(false)}
        title="Application Members & Admins"
        subtitle="Directory of members and administrative roles."
      >
        <div className="space-y-3.5 p-1">
          {/* Admin Role Status Card */}
          <div className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
            isAdmin
              ? 'bg-violet-50/80 border-violet-200'
              : 'bg-[#ECEEF0]/60 border-neutral-border'
          }`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isAdmin ? 'bg-violet-600 text-white' : 'bg-neutral-200 text-neutral-600'
              }`}>
                {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-[#1E1E1E] block truncate">
                  {isAdmin ? 'Admin Mode (Kavipriyan)' : 'Standard Member View'}
                </span>
                <span className="text-[10px] text-neutral-textSecondary block truncate">
                  {isAdmin
                    ? 'Full edit access: meals, attendance, Excel, members'
                    : 'Meal status & attendance entry enabled'}
                </span>
              </div>
            </div>

            {isAdmin ? (
              <button
                type="button"
                onClick={() => onToggleAdminMode && onToggleAdminMode(false)}
                className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-white border border-violet-200 text-violet-800 hover:bg-violet-100 flex-shrink-0 shadow-2xs active-scale"
              >
                Member View
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setPinPromptOpen(true);
                  setPinError('');
                  setPinInput('');
                }}
                className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-[#A28EF9] text-[#1E1E1E] border border-[#7D64F6]/40 hover:bg-[#8F78F5] flex-shrink-0 shadow-2xs active-scale"
              >
                Unlock Admin
              </button>
            )}
          </div>

          {/* Members List (Informative Only) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1E1E1E]">
                All Members ({allMembers.length})
              </span>
              <span className="text-[10px] font-semibold text-neutral-textTertiary">
                Admins: {adminUserIds.length}/2
              </span>
            </div>

            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
              {allMembers.map(m => {
                const isPrimary = isPrimaryAdmin(m);
                const isThisAdmin = isMemberAdmin(m);
                const isActive = m.status === 'active';

                return (
                  <div
                    key={m.id}
                    className="w-full p-2.5 rounded-xl border border-neutral-border bg-white flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                          isPrimary || isThisAdmin
                            ? 'bg-[#A28EF9] text-[#1E1E1E] shadow-2xs'
                            : 'bg-[#ECEEF0] text-neutral-textSecondary'
                        }`}
                      >
                        {isPrimary || isThisAdmin ? '👑' : m.code}
                      </div>
                      <div className="text-left min-w-0">
                        <span className="font-bold text-[#1E1E1E] block truncate">{m.name}</span>
                        <span className="text-[10px] text-neutral-textTertiary block truncate">
                          {isPrimary
                            ? 'Primary Admin (Permanent)'
                            : isThisAdmin
                            ? 'Co-Admin'
                            : 'Standard Member'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isPrimary ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#A28EF9]/25 text-[#2C1885] border border-[#A28EF9]/40">
                          👑 Primary Admin
                        </span>
                      ) : isThisAdmin ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#A28EF9]/20 text-[#2C1885] border border-[#A28EF9]/30">
                          👑 Admin
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#ECEEF0] text-neutral-textSecondary border border-neutral-border">
                          Member
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-neutral-100 text-neutral-500'
                      }`}>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      {/* PIN Unlock Modal for Admin Access */}
      <Modal
        isOpen={pinPromptOpen}
        onClose={() => setPinPromptOpen(false)}
        title="Admin Authentication"
        subtitle="Enter the administrator passcode to unlock edit controls."
      >
        <div className="space-y-3 p-1">
          <div className="p-3 rounded-xl bg-violet-50 border border-violet-200 flex items-start gap-2">
            <KeyRound className="w-4 h-4 text-violet-700 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-violet-900 leading-snug">
              Administrative permissions allow modifying meal availability, washer requirements, Excel sync, and member additions. Default PIN is <strong>1401</strong>.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1E1E1E] block">
              Admin Passcode
            </label>
            <input
              type="password"
              maxLength={8}
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setPinError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleVerifyPin();
              }}
              placeholder="Enter passcode (1401)"
              className="w-full h-11 px-4 text-sm font-bold tracking-widest text-center bg-white rounded-xl border border-neutral-border text-[#1E1E1E] focus:outline-none focus:border-[#A28EF9] focus:ring-2 focus:ring-[#A28EF9]/20"
              autoFocus
            />
            {pinError && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 mt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{pinError}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setPinPromptOpen(false)}
              className="px-3 py-2 text-xs font-bold rounded-xl border border-neutral-border text-neutral-textSecondary hover:bg-neutral-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleVerifyPin}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-[#1E1E1E] text-white hover:bg-black shadow-xs active-scale"
            >
              Unlock Controls
            </button>
          </div>
        </div>
      </Modal>

      {/* User Profile & Log Out Modal */}
      <Modal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        title="User Account"
        subtitle="Signed in to Vessel Wash via Supabase Auth."
      >
        <div className="space-y-4 p-1">
          {/* User Info Card */}
          <div className="p-4 rounded-2xl bg-white border border-neutral-border/80 shadow-xs flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shadow-xs flex-shrink-0 ${
                isAdmin ? 'bg-[#A28EF9] text-[#1E1E1E]' : 'bg-[#1E1E1E] text-white'
              }`}
            >
              {isAdmin ? '👑' : (userName.charAt(0) || 'U')}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm font-extrabold text-[#1E1E1E] truncate">
                  {userName}
                </h3>
                {isAdmin ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200">
                    👑 Admin
                  </span>
                ) : (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
                    Member
                  </span>
                )}
              </div>
              <span className="text-[11px] text-neutral-textSecondary block truncate mt-0.5">
                {userEmail || 'Authenticated Session'}
              </span>
            </div>
          </div>

          {/* Role Description Card */}
          <div className="p-3 rounded-xl bg-[#ECEEF0]/60 border border-neutral-border text-xs space-y-1">
            <span className="font-bold text-[#1E1E1E] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-violet-700" />
              Role &amp; Permissions
            </span>
            <p className="text-[11px] text-neutral-textSecondary leading-snug">
              {isAdmin
                ? 'You have full administrative privileges: modifying meal availability, washer requirements, Excel sync, and managing roster members.'
                : 'You have member privileges: marking meal availability and selecting attending eaters in the roster.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={async () => {
                setProfileModalOpen(false);
                if (onSignOut) await onSignOut();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-colors flex items-center justify-center gap-2 active-scale cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
