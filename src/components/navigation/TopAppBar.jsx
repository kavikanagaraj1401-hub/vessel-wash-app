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
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { supabaseService } from '../../services/supabaseService';

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
      <header className="flex-shrink-0 z-40 bg-white border-b border-neutral-border pt-safe shadow-2xs">
        {/* Tier 1: App Title & Action Icons (Members & Burger Menu) */}
        <div className="flex items-center justify-between px-4 h-14 gap-3">
          {/* App Brand & Logged-in Member Identity */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[#A28EF9] flex items-center justify-center text-[#1E1E1E] shadow-2xs flex-shrink-0 font-extrabold text-xs">
              {resolvedCode || 'VW'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-[#1E1E1E] leading-tight truncate">
                  {resolvedName}
                </h1>
                {resolvedCode && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-violet-100 text-violet-800 text-[10px] font-extrabold border border-violet-200 shadow-2xs flex-shrink-0">
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
                      isLiveConnected ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                      isLiveConnected ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                </span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-neutral-textTertiary font-medium block truncate">
                {isAdmin ? 'Primary Admin • Live Roster' : 'Member • Daily Roster'}
              </span>
            </div>
          </div>

          {/* Right: User Profile Avatar & Burger Menu (Redundant name chip removed) */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* User Profile Avatar Trigger */}
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              aria-label="User profile & account"
              title={`Logged in as ${resolvedName} (${resolvedCode}) - ${userEmail || 'Active session'}`}
              className={`w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-xs select-none active-scale transition-all cursor-pointer ${
                isAdmin
                  ? 'bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-500 text-amber-950 border border-amber-400 ring-2 ring-amber-400/40 shadow-xs'
                  : 'bg-[#ECEEF0] hover:bg-neutral-200 text-[#1E1E1E] border border-neutral-border/70'
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
                className="w-9 h-9 rounded-full bg-[#ECEEF0] hover:bg-neutral-200 text-[#1E1E1E] flex items-center justify-center border border-neutral-border/60 active-scale transition-all cursor-pointer"
              >
                <Menu className="w-4 h-4" strokeWidth={2.2} />
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
                isAdmin
                  ? 'bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-500 text-amber-950 border border-amber-400 ring-2 ring-amber-400/30'
                  : 'bg-[#1E1E1E] text-white'
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
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-950 border border-amber-300 shadow-2xs">
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

          {/* Account Security / Change Password Card */}
          <div className="p-3.5 rounded-2xl bg-white border border-neutral-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[#1E1E1E] flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-violet-600" />
                Account Security
              </span>
              <button
                type="button"
                onClick={() => {
                  setChangePassOpen(!changePassOpen);
                  setPassError('');
                  setPassSuccess('');
                }}
                className="text-[11px] font-bold text-[#7D64F6] hover:underline cursor-pointer"
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
                className="space-y-2.5 pt-2 border-t border-neutral-border/60 animate-fadeIn"
              >
                {passError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                    <span>{passError}</span>
                  </div>
                )}

                {passSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{passSuccess}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-textSecondary block">
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
                      className="w-full h-9 px-3 pr-9 text-xs bg-[#ECEEF0]/60 rounded-xl border border-neutral-border text-[#1E1E1E] focus:outline-none focus:bg-white focus:border-[#7D64F6] focus:ring-1 focus:ring-[#7D64F6]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-textSecondary block">
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
                    className="w-full h-9 px-3 text-xs bg-[#ECEEF0]/60 rounded-xl border border-neutral-border text-[#1E1E1E] focus:outline-none focus:bg-white focus:border-[#7D64F6] focus:ring-1 focus:ring-[#7D64F6]"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={passLoading}
                    className="flex-1 h-9 rounded-xl bg-[#1E1E1E] hover:bg-black text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 active-scale cursor-pointer disabled:opacity-60"
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
                    className="h-9 px-3 rounded-xl border border-neutral-border text-neutral-600 hover:bg-neutral-100 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-[11px] text-neutral-textTertiary">
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
