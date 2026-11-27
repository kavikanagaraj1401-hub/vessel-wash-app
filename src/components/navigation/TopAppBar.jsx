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
import { isKavipriyan, isSuryakumar } from '../../logic/authUtils';

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
  adminUserIds = ['m5'],
  onSettingsClick,
  isLiveConnected = false,
}) {
  const { isDark, toggleTheme, brandClasses } = useTheme();
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

  const isPrimaryAdmin = (m) => !isSuryakumar(m) && isKavipriyan(m);
  const isMemberAdmin = (m) => !isSuryakumar(m) && (isPrimaryAdmin(m) || (adminUserIds && adminUserIds.includes(m?.id)));

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options = {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      };
      setIstTime(now.toLocaleTimeString('en-US', options));
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
      {/* Top Header: Dorme Reference Bento Header (Strictly Static shrink-0) */}
      <header className="shrink-0 z-40 bg-white dark:bg-[#141518] border-b border-black/[0.07] dark:border-white/[0.08] pt-safe transition-colors duration-200">
        <div className="flex items-center justify-between px-4 sm:px-6 h-16 gap-3">
          {/* Left: Clean Greeting / Page Title + Date Subtitle */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.03em] text-[#111214] dark:text-[#F5F5F7] leading-tight truncate">
                {title || 'Vessel Wash'}
              </h1>
              {/* Connection Status Dot */}
              <span
                className="relative flex h-2 w-2 flex-shrink-0"
                title={isLiveConnected ? "Supabase Live Synchronization Active" : "Connecting to Supabase..."}
              >
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isLiveConnected ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isLiveConnected ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[12px] sm:text-[13px] text-[#6E6E73] dark:text-[#8E8E93] font-normal tracking-normal truncate mt-0.5">
              <span className="tabular-nums">{currentDateStr}</span>
              <span>&bull;</span>
              <span className="tabular-nums">{resolvedName} ({resolvedCode})</span>
              {isAdmin && (
                <>
                  <span>&bull;</span>
                  <span className="font-medium text-[#111214] dark:text-[#F5F5F7]">Primary Admin</span>
                </>
              )}
            </div>
          </div>

          {/* Right: Compact Circular Icon Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-9 h-9 rounded-full bg-black/[0.04] dark:bg-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] text-[#111214] dark:text-[#F5F5F7] flex items-center justify-center border border-black/[0.07] dark:border-white/[0.08] active-scale transition-all cursor-pointer"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-[#F5F5F7]" strokeWidth={2} />
              ) : (
                <Moon className="w-4 h-4 text-[#111214]" strokeWidth={2} />
              )}
            </button>

            {/* Profile Avatar Trigger Button */}
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              aria-label="User profile & account"
              title={`Logged in as ${resolvedName} (${resolvedCode}) - ${userEmail || 'Active session'}`}
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs select-none active-scale transition-all cursor-pointer ${
                isAdmin
                  ? 'bg-[#111214] dark:bg-white text-white dark:text-[#0B0C0E] border border-black dark:border-white shadow-xs'
                  : 'bg-black/[0.04] dark:bg-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] text-[#111214] dark:text-[#F5F5F7] border border-black/[0.07] dark:border-white/[0.08]'
              }`}
            >
              {isAdmin ? '👑' : (resolvedCode || resolvedName.charAt(0) || 'U')}
            </button>

            {/* Menu / Settings Button */}
            {onSettingsClick && (
              <button
                type="button"
                onClick={onSettingsClick}
                aria-label="Open menu and settings"
                title="Menu & Settings"
                className="w-9 h-9 rounded-full bg-black/[0.04] dark:bg-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] text-[#111214] dark:text-[#F5F5F7] flex items-center justify-center border border-black/[0.07] dark:border-white/[0.08] active-scale transition-all cursor-pointer"
              >
                <Menu className="w-4 h-4" strokeWidth={2} />
              </button>
            )}
          </div>
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
              ? 'bg-[#111214] dark:bg-white text-white dark:text-[#0B0C0E] border-black/10 dark:border-white/10 shadow-xs'
              : 'bg-[#EFEFF1] dark:bg-[#1C1D21] border-black/[0.07] dark:border-white/[0.08]'
          }`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isAdmin ? 'bg-white/20 dark:bg-black/10 text-current font-bold' : 'bg-black/5 dark:bg-white/5 text-[#6E6E73] dark:text-[#8E8E93]'
              }`}>
                {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <span className={`text-xs font-bold block truncate ${isAdmin ? 'text-current' : 'text-[#111214] dark:text-[#F5F5F7]'}`}>
                  {isAdmin ? 'Admin Mode (Kavipriyan)' : 'Standard Member View'}
                </span>
                <span className={`text-[10px] block truncate ${isAdmin ? 'opacity-80' : 'text-[#6E6E73] dark:text-[#8E8E93]'}`}>
                  {isAdmin
                    ? 'Full edit access: meals, attendance, Excel, members'
                    : 'Wash history, meal status & attendance enabled'}
                </span>
              </div>
            </div>

            {isAdmin ? (
              <button
                type="button"
                onClick={() => onToggleAdminMode && onToggleAdminMode(false)}
                className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-white text-[#111214] dark:bg-[#0B0C0E] dark:text-[#F5F5F7] flex-shrink-0 shadow-2xs active-scale cursor-pointer"
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
                className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-[#111214] dark:bg-white text-white dark:text-[#0B0C0E] hover:opacity-90 flex-shrink-0 shadow-2xs active-scale cursor-pointer"
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
                    className="w-full p-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#141518] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                          isPrimary || isThisAdmin
                            ? 'bg-[#111214] dark:bg-white text-white dark:text-[#0B0C0E] border border-black/10 dark:border-white/10 shadow-2xs'
                            : 'bg-black/[0.04] dark:bg-white/[0.06] text-[#6E6E73] dark:text-[#8E8E93]'
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
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#111214] dark:bg-white text-white dark:text-[#0B0C0E] border border-black/10 dark:border-white/10">
                          👑 Primary Admin
                        </span>
                      ) : isThisAdmin ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[#111214] dark:text-[#F5F5F7] border border-black/10 dark:border-white/10">
                          👑 Admin
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-[#6E6E73] dark:text-[#8E8E93] border border-black/[0.06] dark:border-white/[0.08]">
                          Member
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-black/10 dark:bg-white/15 text-[#111214] dark:text-[#F5F5F7] border border-black/10 dark:border-white/10'
                          : 'bg-black/[0.03] dark:bg-white/[0.04] text-[#8E8E93] dark:text-[#636366] border border-black/[0.06] dark:border-white/[0.08]'
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
          <div className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] flex items-start gap-2">
            <KeyRound className="w-4 h-4 text-[#111214] dark:text-[#F5F5F7] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] leading-snug">
              Administrative permissions allow modifying meal availability, washer requirements, Excel sync, and member additions. Default PIN is <strong>1401</strong>.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#111214] dark:text-[#F5F5F7] block">
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
              className="w-full h-11 px-4 text-sm font-bold tracking-widest text-center bg-white dark:bg-[#141518] rounded-xl border border-black/[0.08] dark:border-white/[0.1] text-[#111214] dark:text-[#F5F5F7] focus:outline-none focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10"
              autoFocus
            />
            {pinError && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 mt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{pinError}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setPinPromptOpen(false)}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-black/[0.08] dark:border-white/[0.1] text-[#6E6E73] dark:text-[#8E8E93] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleVerifyPin}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-[#111214] dark:bg-white text-white dark:text-[#0B0C0E] hover:opacity-90 shadow-xs active-scale cursor-pointer"
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
          <div className="p-4 rounded-2xl bg-white dark:bg-[#141518] border border-black/[0.08] dark:border-white/[0.1] shadow-xs flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shadow-xs flex-shrink-0 ${
                isAdmin
                  ? 'bg-[#111214] dark:bg-white text-white dark:text-[#0B0C0E] border border-black/10 dark:border-white/10'
                  : 'bg-black/5 dark:bg-white/10 text-[#111214] dark:text-[#F5F5F7]'
              }`}
            >
              {isAdmin ? '👑' : (userName.charAt(0) || 'U')}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm font-extrabold text-[#111214] dark:text-[#F5F5F7] truncate">
                  {userName}
                </h3>
                {isAdmin ? (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#111214] dark:bg-white text-white dark:text-[#0B0C0E] border border-black/10 dark:border-white/10 shadow-2xs">
                    👑 Admin
                  </span>
                ) : (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-[#6E6E73] dark:text-[#8E8E93] border border-black/[0.06] dark:border-white/[0.08]">
                    Member
                  </span>
                )}
              </div>
              <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] block truncate mt-0.5">
                {userEmail || 'Authenticated Session'}
              </span>
            </div>
          </div>

          {/* Role Description Card */}
          <div className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.07] dark:border-white/[0.08] text-xs space-y-1">
            <span className="font-bold text-[#111214] dark:text-[#F5F5F7] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#111214] dark:text-[#F5F5F7]" />
              Role &amp; Permissions
            </span>
            <p className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] leading-snug">
              {isAdmin
                ? 'You have full administrative privileges: modifying meal availability, washer requirements, Excel sync, and managing roster members.'
                : 'You have member privileges: marking meal availability and selecting attending eaters in the roster.'}
            </p>
          </div>

          {/* Account Security / Change Password Card */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#141518] border border-black/[0.08] dark:border-white/[0.1] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[#111214] dark:text-[#F5F5F7] flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-[#111214] dark:text-[#F5F5F7]" />
                Account Security
              </span>
              <button
                type="button"
                onClick={() => {
                  setChangePassOpen(!changePassOpen);
                  setPassError('');
                  setPassSuccess('');
                }}
                className="text-[11px] font-bold text-[#111214] dark:text-[#F5F5F7] hover:underline cursor-pointer"
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
                className="space-y-2.5 pt-2 border-t border-black/[0.08] dark:border-white/[0.08] animate-fadeIn"
              >
                {passError && (
                  <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/15 dark:border-white/15 text-[#111214] dark:text-[#F5F5F7] text-[11px] flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{passError}</span>
                  </div>
                )}

                {passSuccess && (
                  <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/15 dark:border-white/15 text-[#111214] dark:text-[#F5F5F7] text-[11px] flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{passSuccess}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#6E6E73] dark:text-[#8E8E93] block">
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
                      className="w-full h-9 px-3 pr-9 text-xs bg-black/[0.03] dark:bg-white/[0.05] rounded-xl border border-black/[0.08] dark:border-white/[0.1] text-[#111214] dark:text-[#F5F5F7] focus:outline-none focus:bg-white dark:focus:bg-[#141518] focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-2 text-[#8E8E93] dark:text-[#636366] hover:text-[#111214] dark:hover:text-[#F5F5F7] cursor-pointer"
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#6E6E73] dark:text-[#8E8E93] block">
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
                    className="w-full h-9 px-3 text-xs bg-black/[0.03] dark:bg-white/[0.05] rounded-xl border border-black/[0.08] dark:border-white/[0.1] text-[#111214] dark:text-[#F5F5F7] focus:outline-none focus:bg-white dark:focus:bg-[#141518] focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={passLoading}
                    className="flex-1 h-9 rounded-xl bg-[#111214] dark:bg-white hover:opacity-90 text-white dark:text-[#0B0C0E] text-xs font-bold transition-all flex items-center justify-center gap-1.5 active-scale cursor-pointer disabled:opacity-60"
                  >
                    {passLoading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
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
                    className="h-9 px-3 rounded-xl border border-black/[0.08] dark:border-white/[0.1] text-[#6E6E73] dark:text-[#8E8E93] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">
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
              className="w-full py-2.5 px-4 rounded-xl bg-black/[0.04] dark:bg-white/[0.04] hover:bg-black/10 dark:hover:bg-white/10 text-[#111214] dark:text-[#F5F5F7] font-bold text-xs border border-black/[0.08] dark:border-white/[0.08] transition-colors flex items-center justify-center gap-2 active-scale cursor-pointer"
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
