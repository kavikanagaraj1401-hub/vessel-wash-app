import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Menu,
  Clock,
  ShieldCheck,
  Lock,
  Users,
  KeyRound,
  AlertCircle,
  LogOut,
  User,
  Eye,
  EyeOff,
  CheckCircle2,
  Sun,
  Moon,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { supabaseService } from '../../services/supabaseService';
import { useTheme } from '../../context/ThemeContext';

export function TopAppBar({
  title = 'Vessel Washing',
  currentDateStr = '',
  isAdmin = false,
  userName = 'Kavipriyan',
  userEmail = '',
  currentMember = null,
  memberCode = '',
  onSignOut,
  onToggleAdminMode,
  allMembers = [],
  adminUserIds = ['m1'],
  onSettingsClick,
  isLiveConnected = false,
}) {
  const { isDark, toggleTheme } = useTheme();
  const [istTime, setIstTime] = useState('');
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [pinPromptOpen, setPinPromptOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Change Password state for logged-in user
  const [changePassOpen, setChangePassOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

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

  const resolvedName = currentMember?.name || userName || 'Kavipriyan';
  const resolvedCode =
    currentMember?.code ||
    memberCode ||
    allMembers.find(
      (m) =>
        m.name === resolvedName ||
        (m.email && userEmail && m.email.toLowerCase() === userEmail.toLowerCase())
    )?.code ||
    'M1';

  return (
    <>
      {/* Static Non-Scrolling Header Bar */}
      <header className="flex-shrink-0 z-40 bg-white dark:bg-[#171F2C] border-b border-[#DDD9D0] dark:border-[#2A364B] pt-safe shadow-2xs transition-colors duration-200">
        {/* Tier 1: App Title & Action Icons (Members, Theme Toggle & Burger Menu) */}
        <div className="flex items-center justify-between px-4 h-14 gap-3">
          {/* App Brand & Logged-in Member Identity */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[#ECBD56] flex items-center justify-center text-[#111216] shadow-2xs flex-shrink-0 font-extrabold text-xs">
              {resolvedCode || 'VW'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-[#111216] dark:text-[#F7F6F3] leading-tight truncate">
                  {resolvedName}
                </h1>
                {resolvedCode && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#FCF7ED] dark:bg-[#272115] text-[#845D08] dark:text-[#FBE6AB] text-[10px] font-extrabold border border-[#ECBD56]/40 shadow-2xs flex-shrink-0">
                    {resolvedCode}
                  </span>
                )}
                {/* Blinking connection status dot indicator representing live Supabase sync */}
                <span
                  className="relative flex h-2.5 w-2.5 flex-shrink-0"
                  title={isLiveConnected ? "Supabase Live Synchronization Active" : "Connecting to Supabase..."}
                >
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isLiveConnected ? 'bg-[#22AC77] dark:bg-[#4ADE80]' : 'bg-[#E0851A] dark:bg-[#FF9F45]'
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                      isLiveConnected ? 'bg-[#22AC77] dark:bg-[#4ADE80]' : 'bg-[#E0851A] dark:bg-[#FF9F45]'
                    }`}
                  />
                </span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-[#4E525D] dark:text-[#9BA5B7] font-medium block truncate">
                {isAdmin ? 'Primary Admin • Live Roster' : 'Member • Daily Roster'}
              </span>
            </div>
          </div>

          {/* Right: Theme Toggle, Profile Avatar & Burger Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Dark / Light Mode Switcher */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-9 h-9 rounded-full bg-[#F2F1ED] dark:bg-[#1F2A3C] hover:bg-[#EAE8E2] dark:hover:bg-[#253248] text-[#111216] dark:text-[#F7F6F3] flex items-center justify-center border border-[#DDD9D0] dark:border-[#2A364B] active-scale transition-all cursor-pointer"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-[#ECBD56]" strokeWidth={2.2} />
              ) : (
                <Moon className="w-4 h-4 text-[#111216]" strokeWidth={2.2} />
              )}
            </button>

            {/* User Profile Avatar Trigger */}
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              aria-label="User profile & account"
              title={`Logged in as ${resolvedName} (${resolvedCode}) - ${userEmail || 'Active session'}`}
              className={`w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-xs select-none active-scale transition-all cursor-pointer ${
                isAdmin
                  ? 'admin-gradient text-white border border-[#ECBD56] ring-2 ring-[#ECBD56]/40 shadow-xs'
                  : 'bg-[#F2F1ED] dark:bg-[#1F2A3C] hover:bg-[#EAE8E2] dark:hover:bg-[#253248] text-[#111216] dark:text-[#F7F6F3] border border-[#DDD9D0] dark:border-[#2A364B]'
              }`}
            >
              {isAdmin ? '👑' : (resolvedCode || resolvedName.charAt(0) || 'U')}
            </button>

            {/* Burger Menu Button (Access Menu, WhatsApp-style Settings, and Log Out) */}
            {onSettingsClick && (
              <button
                type="button"
                onClick={onSettingsClick}
                aria-label="Open menu and settings"
                title="Menu & Settings"
                className="w-9 h-9 rounded-full bg-[#F2F1ED] dark:bg-[#1F2A3C] hover:bg-[#EAE8E2] dark:hover:bg-[#253248] text-[#111216] dark:text-[#F7F6F3] flex items-center justify-center border border-[#DDD9D0] dark:border-[#2A364B] active-scale transition-all cursor-pointer"
              >
                <Menu className="w-4 h-4" strokeWidth={2.2} />
              </button>
            )}
          </div>
        </div>

        {/* Tier 2: Static Dedicated Date & Time Placement Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#F2F1ED]/80 dark:bg-[#0B0C0E]/80 border-t border-[#DDD9D0]/60 dark:border-[#2A364B]/60 text-[11px]">
          <div className="flex items-center gap-2 text-[#111216] dark:text-[#F7F6F3] font-semibold truncate">
            <Calendar className="w-3.5 h-3.5 text-[#ECBD56] flex-shrink-0" />
            <span className="truncate">{currentDateStr}</span>
          </div>

          {istTime && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white dark:bg-[#171F2C] text-[#111216] dark:text-[#F7F6F3] font-bold text-[10px] border border-[#DDD9D0] dark:border-[#2A364B] shadow-2xs flex-shrink-0">
              <Clock className="w-2.5 h-2.5 text-[#ECBD56]" />
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
              ? 'admin-gradient text-white border-[#ECBD56]/60 shadow-xs'
              : 'bg-[#F2F1ED] dark:bg-[#1F2A3C] border-[#DDD9D0] dark:border-[#2A364B]'
          }`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isAdmin ? 'bg-[#ECBD56] text-[#111216] font-bold' : 'bg-[#DDD9D0] dark:bg-[#2A364B] text-[#4E525D] dark:text-[#9BA5B7]'
              }`}>
                {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <span className={`text-xs font-bold block truncate ${isAdmin ? 'text-white' : 'text-[#111216] dark:text-[#F7F6F3]'}`}>
                  {isAdmin ? 'Admin Mode (Kavipriyan)' : 'Standard Member View'}
                </span>
                <span className={`text-[10px] block truncate ${isAdmin ? 'text-white/80' : 'text-[#4E525D] dark:text-[#9BA5B7]'}`}>
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
                className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-white text-[#111216] hover:bg-[#F2F1ED] flex-shrink-0 shadow-2xs active-scale cursor-pointer"
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
                className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-[#ECBD56] text-[#111216] hover:bg-[#DEAA3E] flex-shrink-0 shadow-2xs active-scale cursor-pointer"
              >
                Unlock Admin
              </button>
            )}
          </div>

          {/* Members List (Informative Only) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3]">
                All Members ({allMembers.length})
              </span>
              <span className="text-[10px] font-semibold text-[#848A96] dark:text-[#64748B]">
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
                    className="w-full p-2.5 rounded-xl border border-[#DDD9D0] dark:border-[#2A364B] bg-white dark:bg-[#171F2C] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                          isPrimary || isThisAdmin
                            ? 'admin-gradient text-white border border-[#ECBD56]/40 shadow-2xs'
                            : 'bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#4E525D] dark:text-[#9BA5B7]'
                        }`}
                      >
                        {isPrimary || isThisAdmin ? '👑' : m.code}
                      </div>
                      <div className="text-left min-w-0">
                        <span className="font-bold text-[#111216] dark:text-[#F7F6F3] block truncate">{m.name}</span>
                        <span className="text-[10px] text-[#848A96] dark:text-[#64748B] block truncate">
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
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full admin-gradient text-white border border-[#ECBD56]/60">
                          👑 Primary Admin
                        </span>
                      ) : isThisAdmin ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FCF7ED] dark:bg-[#272115] text-[#845D08] dark:text-[#FBE6AB] border border-[#ECBD56]/40">
                          👑 Admin
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#4E525D] dark:text-[#9BA5B7] border border-[#DDD9D0] dark:border-[#2A364B]">
                          Member
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-[#EAF8F1] dark:bg-[#0E2E1D] text-[#22AC77] dark:text-[#4ADE80] border border-[#97E2C0] dark:border-[#166534]'
                          : 'bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#848A96] dark:text-[#64748B] border border-[#DDD9D0] dark:border-[#2A364B]'
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
          <div className="p-3 rounded-xl bg-[#FCF7ED] dark:bg-[#272115] border border-[#ECBD56]/40 flex items-start gap-2">
            <KeyRound className="w-4 h-4 text-[#ECBD56] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[#845D08] dark:text-[#FBE6AB] leading-snug">
              Administrative permissions allow modifying meal availability, washer requirements, Excel sync, and member additions. Default PIN is <strong>1401</strong>.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3] block">
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
              className="w-full h-11 px-4 text-sm font-bold tracking-widest text-center bg-white dark:bg-[#171F2C] rounded-xl border border-[#DDD9D0] dark:border-[#2A364B] text-[#111216] dark:text-[#F7F6F3] focus:outline-none focus:border-[#ECBD56] focus:ring-2 focus:ring-[#ECBD56]/20"
              autoFocus
            />
            {pinError && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#D9483B] dark:text-[#FF5A4E] mt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{pinError}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setPinPromptOpen(false)}
              className="px-3 py-2 text-xs font-bold rounded-xl border border-[#DDD9D0] dark:border-[#2A364B] text-[#4E525D] dark:text-[#9BA5B7] hover:bg-[#F2F1ED] dark:hover:bg-[#1F2A3C] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleVerifyPin}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-[#111216] dark:bg-[#ECBD56] text-[#F7F6F3] dark:text-[#111216] hover:opacity-90 shadow-xs active-scale cursor-pointer"
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
          <div className="p-4 rounded-2xl bg-white dark:bg-[#171F2C] border border-[#DDD9D0] dark:border-[#2A364B] shadow-xs flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shadow-xs flex-shrink-0 ${
                isAdmin
                  ? 'admin-gradient text-white border border-[#ECBD56] ring-2 ring-[#ECBD56]/30'
                  : 'bg-[#111216] dark:bg-[#ECBD56] text-[#F7F6F3] dark:text-[#111216]'
              }`}
            >
              {isAdmin ? '👑' : (userName.charAt(0) || 'U')}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm font-extrabold text-[#111216] dark:text-[#F7F6F3] truncate">
                  {userName}
                </h3>
                {isAdmin ? (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full admin-gradient text-white border border-[#ECBD56]/80 shadow-2xs">
                    👑 Admin
                  </span>
                ) : (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#4E525D] dark:text-[#9BA5B7] border border-[#DDD9D0] dark:border-[#2A364B]">
                    Member
                  </span>
                )}
              </div>
              <span className="text-[11px] text-[#4E525D] dark:text-[#9BA5B7] block truncate mt-0.5">
                {userEmail || 'Authenticated Session'}
              </span>
            </div>
          </div>

          {/* Role Description Card */}
          <div className="p-3 rounded-xl bg-[#F2F1ED] dark:bg-[#1F2A3C] border border-[#DDD9D0] dark:border-[#2A364B] text-xs space-y-1">
            <span className="font-bold text-[#111216] dark:text-[#F7F6F3] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#ECBD56]" />
              Role &amp; Permissions
            </span>
            <p className="text-[11px] text-[#4E525D] dark:text-[#9BA5B7] leading-snug">
              {isAdmin
                ? 'You have full administrative privileges: modifying meal availability, washer requirements, Excel sync, and managing roster members.'
                : 'You have member privileges: marking meal availability and selecting attending eaters in the roster.'}
            </p>
          </div>

          {/* Account Security / Change Password Card */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#171F2C] border border-[#DDD9D0] dark:border-[#2A364B] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[#111216] dark:text-[#F7F6F3] flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-[#ECBD56]" />
                Account Security
              </span>
              <button
                type="button"
                onClick={() => {
                  setChangePassOpen(!changePassOpen);
                  setPassError('');
                  setPassSuccess('');
                }}
                className="text-[11px] font-bold text-[#ECBD56] hover:underline cursor-pointer"
              >
                {changePassOpen ? 'Close' : 'Change Password'}
              </button>
            </div>

            {changePassOpen ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setPassError('');
                  setPassSuccess('');

                  if (!newPassword || newPassword.length < 6) {
                    setPassError('New password must be at least 6 characters long.');
                    return;
                  }
                  if (newPassword !== confirmPassword) {
                    setPassError('Passwords do not match. Please verify and re-enter.');
                    return;
                  }

                  setPassLoading(true);
                  try {
                    const res = await supabaseService.updateUserPassword(newPassword);
                    if (!res.success) {
                      setPassError(res.error?.message || 'Failed to update password.');
                    } else {
                      setPassSuccess('✓ Password updated successfully! You can now use your new password on next login.');
                      setNewPassword('');
                      setConfirmPassword('');
                    }
                  } catch (err) {
                    setPassError(err.message || 'An unexpected error occurred while updating password.');
                  } finally {
                    setPassLoading(false);
                  }
                }}
                className="space-y-2.5 pt-2 border-t border-[#DDD9D0]/60 dark:border-[#2A364B]/60 animate-fadeIn"
              >
                {passError && (
                  <div className="p-2.5 rounded-xl bg-[#FDF1F0] dark:bg-[#331310] border border-[#F5A9A2] dark:border-[#991B1B] text-[#D9483B] dark:text-[#FF5A4E] text-[11px] flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{passError}</span>
                  </div>
                )}

                {passSuccess && (
                  <div className="p-2.5 rounded-xl bg-[#EAF8F1] dark:bg-[#0E2E1D] border border-[#97E2C0] dark:border-[#166534] text-[#22AC77] dark:text-[#4ADE80] text-[11px] flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{passSuccess}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#4E525D] dark:text-[#9BA5B7] block">
                    New Password (min 6 characters)
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      disabled={passLoading}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (passError) setPassError('');
                      }}
                      placeholder="Enter new password"
                      className="w-full h-9 px-3 pr-9 text-xs bg-[#F2F1ED] dark:bg-[#1F2A3C] rounded-xl border border-[#DDD9D0] dark:border-[#2A364B] text-[#111216] dark:text-[#F7F6F3] focus:outline-none focus:bg-white dark:focus:bg-[#171F2C] focus:border-[#ECBD56] focus:ring-1 focus:ring-[#ECBD56]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-2 text-[#848A96] dark:text-[#64748B] hover:text-[#111216] dark:hover:text-[#F7F6F3] cursor-pointer"
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#4E525D] dark:text-[#9BA5B7] block">
                    Confirm New Password
                  </label>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    disabled={passLoading}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (passError) setPassError('');
                    }}
                    placeholder="Re-enter new password"
                    className="w-full h-9 px-3 text-xs bg-[#F2F1ED] dark:bg-[#1F2A3C] rounded-xl border border-[#DDD9D0] dark:border-[#2A364B] text-[#111216] dark:text-[#F7F6F3] focus:outline-none focus:bg-white dark:focus:bg-[#171F2C] focus:border-[#ECBD56] focus:ring-1 focus:ring-[#ECBD56]"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={passLoading}
                    className="flex-1 h-9 rounded-xl bg-[#111216] dark:bg-[#ECBD56] hover:bg-black dark:hover:bg-[#DEAA3E] text-white dark:text-[#111216] text-xs font-bold transition-all flex items-center justify-center gap-1.5 active-scale cursor-pointer disabled:opacity-60"
                  >
                    {passLoading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Save New Password</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={passLoading}
                    onClick={() => {
                      setChangePassOpen(false);
                      setNewPassword('');
                      setConfirmPassword('');
                      setPassError('');
                    }}
                    className="h-9 px-3 rounded-xl border border-[#DDD9D0] dark:border-[#2A364B] text-[#4E525D] dark:text-[#9BA5B7] hover:bg-[#F2F1ED] dark:hover:bg-[#1F2A3C] text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-[11px] text-[#4E525D] dark:text-[#9BA5B7]">
                Update your login password anytime using Supabase Auth.
              </p>
            )}
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
