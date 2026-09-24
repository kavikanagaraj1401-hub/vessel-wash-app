import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { TextInput } from '../components/common/Inputs';
import {
  UserPlus,
  Edit2,
  UserX,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Users,
  Lock,
  ShieldCheck,
  ShieldAlert,
  Crown,
  KeyRound,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  Trash2,
  Search,
  X,
  Shield,
  Utensils,
  Hash,
} from 'lucide-react';
import {
  generateTemporaryPassword,
  generateDefaultUsername,
} from '../logic/authUtils';
import { supabaseService } from '../services/supabaseService';

export function MembersScreen({
  members = [],
  queue = [],
  attendanceLogs = [],
  isAdmin = false,
  adminUserIds = ['m1'],
  onToggleAdminRole,
  onAddMember,
  onEditMember,
  onToggleMemberStatus,
  onRemoveMember,
  onRefreshMembers,
}) {
  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModal, setEditModal] = useState({ isOpen: false, member: null });
  const [deactivateModal, setDeactivateModal] = useState({ isOpen: false, member: null });
  const [adminModal, setAdminModal] = useState({ isOpen: false, member: null, action: 'grant' });
  const [removeModal, setRemoveModal] = useState({ isOpen: false, member: null });

  // Credential Creation Modal state
  const [credentialModal, setCredentialModal] = useState({
    isOpen: false,
    member: null,
    step: 'form', // 'form' | 'success'
  });
  const [credEmail, setCredEmail] = useState('');
  const [credUsername, setCredUsername] = useState('');
  const [credPassword, setCredPassword] = useState('');
  const [showCredPassword, setShowCredPassword] = useState(false);
  const [credLoading, setCredLoading] = useState(false);
  const [credError, setCredError] = useState('');
  const [copiedCreds, setCopiedCreds] = useState(false);

  // Admin Password Reset Modal state
  const [resetModal, setResetModal] = useState({
    isOpen: false,
    member: null,
    step: 'form', // 'form' | 'success'
  });
  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [copiedReset, setCopiedReset] = useState(false);

  // Live Member Login Status cache (loaded from database member_login_status view)
  const [loginStatusMap, setLoginStatusMap] = useState(new Map());

  const loadLoginStatus = useCallback(async () => {
    try {
      const rows = await supabaseService.fetchMemberLoginStatus();
      if (rows && rows.length > 0) {
        const map = new Map();
        rows.forEach((r) => {
          if (r.id) map.set(r.id, r);
          if (r.email) map.set(r.email.toLowerCase().trim(), r);
          if (r.full_name) map.set(r.full_name.toLowerCase().trim(), r);
        });
        setLoginStatusMap(map);
      }
    } catch (e) {
      console.warn('Could not load member_login_status:', e);
    }
  }, []);

  useEffect(() => {
    loadLoginStatus();
  }, [loadLoginStatus, members]);

  // Dynamic credential status resolver combining member props, member_login_status view, and canonical mapping
  const getMemberCredentialStatus = useCallback((member) => {
    if (!member) return { hasLogin: false, email: null };

    const cleanName = (member.name || '').toLowerCase().trim();
    const cleanEmail = (member.email || '').toLowerCase().trim();

    // Canonical active accounts for our in-house team
    const knownLogins = {
      kavipriyan: 'kavipriyan@vesselwash.app',
      marudhu: 'marudhu@vesselwash.app',
      perumal: 'perumal@vesselwash.app',
      ponneelan: 'ponneelan@vesselwash.app',
    };

    // Lookup in live member_login_status view
    const viewMatch =
      loginStatusMap.get(member.id) ||
      (cleanEmail ? loginStatusMap.get(cleanEmail) : null) ||
      (cleanName ? loginStatusMap.get(cleanName) : null);

    const hasViewLogin = viewMatch?.has_login_set === true || Boolean(viewMatch?.email);
    const viewEmail = viewMatch?.email || null;
    const knownEmail = knownLogins[cleanName] || null;

    const hasLogin =
      member.has_login_set === true ||
      hasViewLogin ||
      Boolean(cleanEmail && cleanEmail.includes('@')) ||
      Boolean(knownEmail);

    const resolvedEmail = member.email || viewEmail || knownEmail || null;

    return {
      hasLogin,
      email: resolvedEmail,
    };
  }, [loginStatusMap]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'active' | 'inactive' | 'admins'

  // Helpers to identify primary admin and delegated admins
  const isKavipriyan = (m) =>
    m?.id === 'm1' || (m?.name && m.name.trim().toLowerCase().includes('kavipriyan'));
  const isMemberAdmin = (m) =>
    isKavipriyan(m) || m?.role === 'admin' || (adminUserIds && adminUserIds.includes(m?.id));

  // Add Member Form state
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [formError, setFormError] = useState('');

  // Edit Member Form state
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('member');
  const [editError, setEditError] = useState('');

  // Calculate wash counts for each member
  const getMemberWashStats = (memberId) => {
    const logs = attendanceLogs.filter((l) => l.memberId === memberId && l.status === 'present');
    const lunchCount = logs.filter((l) => l.meal === 'lunch').length;
    const dinnerCount = logs.filter((l) => l.meal === 'dinner').length;
    return {
      lunch: lunchCount,
      dinner: dinnerCount,
      total: logs.length,
    };
  };

  const handleOpenAdd = () => {
    const nextNum = members.length + 1;
    setNewName('');
    setNewCode(`M${nextNum}`);
    setFormError('');
    setAddModalOpen(true);
  };

  const handleSaveNewMember = () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setFormError('Member name is required.');
      return;
    }
    if (members.some((m) => m.name.toLowerCase() === trimmed.toLowerCase())) {
      setFormError('A member with this name already exists.');
      return;
    }

    onAddMember({
      name: trimmed,
      code: newCode.trim() || `M${members.length + 1}`,
      status: 'active',
    });

    setAddModalOpen(false);
  };

  const handleOpenEdit = (member) => {
    setEditModal({ isOpen: true, member });
    setEditName(member.name);
    setEditRole(isMemberAdmin(member) ? 'admin' : 'member');
    setEditError('');
  };

  const handleSaveEdit = () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError('Member name cannot be empty.');
      return;
    }
    if (
      members.some(
        (m) => m.id !== editModal.member.id && m.name.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      setEditError('Another member with this name already exists.');
      return;
    }

    onEditMember(editModal.member.id, trimmed);

    // If role changed in edit modal, trigger role update
    if (!isKavipriyan(editModal.member) && onToggleAdminRole) {
      const currentlyAdmin = isMemberAdmin(editModal.member);
      if (editRole === 'admin' && !currentlyAdmin) {
        onToggleAdminRole(editModal.member.id, 'admin');
      } else if (editRole === 'member' && currentlyAdmin) {
        onToggleAdminRole(editModal.member.id, 'member');
      }
    }

    setEditModal({ isOpen: false, member: null });
  };

  const handleConfirmDeactivate = () => {
    if (!deactivateModal.member) return;
    onToggleMemberStatus(deactivateModal.member.id);
    setDeactivateModal({ isOpen: false, member: null });
  };

  const handleOpenRemove = (member) => {
    if (isKavipriyan(member)) return;
    setRemoveModal({ isOpen: true, member });
  };

  const handleConfirmRemove = () => {
    if (!removeModal.member) return;
    if (onRemoveMember) {
      onRemoveMember(removeModal.member.id);
    }
    setRemoveModal({ isOpen: false, member: null });
  };

  const handleOpenCreateCredentials = (member) => {
    const credStatus = getMemberCredentialStatus(member);
    const resolvedMember = {
      ...member,
      email: member.email || credStatus.email,
    };
    const suggestedUsername = generateDefaultUsername(resolvedMember.name);
    const suggestedEmail = resolvedMember.email || `${suggestedUsername}@vesselwash.app`;
    const generatedPass = generateTemporaryPassword();

    setCredentialModal({
      isOpen: true,
      member: resolvedMember,
      step: 'form',
    });
    setCredEmail(suggestedEmail);
    setCredUsername(suggestedUsername);
    setCredPassword(generatedPass);
    setShowCredPassword(false);
    setCredError('');
    setCopiedCreds(false);
  };

  const handleSaveCredentials = async () => {
    const cleanEmail = credEmail.trim().toLowerCase();
    const cleanUsername = credUsername.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setCredError('Please enter a valid email address.');
      return;
    }
    if (!cleanUsername) {
      setCredError('Username (display name) is required.');
      return;
    }
    if (!credPassword || credPassword.length < 6) {
      setCredError('Password must be at least 6 characters.');
      return;
    }

    setCredLoading(true);
    setCredError('');

    try {
      const role = isMemberAdmin(credentialModal.member) ? 'admin' : 'member';
      const res = await supabaseService.createMemberCredentials({
        memberId: credentialModal.member.id,
        name: credentialModal.member.name,
        username: cleanUsername,
        email: cleanEmail,
        password: credPassword,
        role,
      });

      if (!res.success) {
        setCredError(res.error?.message || 'Failed to create member credentials.');
      } else {
        credentialModal.member.email = cleanEmail;
        credentialModal.member.has_login_set = true;
        // Instantly reflect in local loginStatusMap so UI updates without lag
        setLoginStatusMap((prev) => {
          const next = new Map(prev);
          const info = {
            id: credentialModal.member.id,
            full_name: credentialModal.member.name,
            email: cleanEmail,
            has_login_set: true,
            role,
          };
          if (credentialModal.member.id) next.set(credentialModal.member.id, info);
          next.set(cleanEmail, info);
          if (credentialModal.member.name) next.set(credentialModal.member.name.toLowerCase().trim(), info);
          return next;
        });
        if (onRefreshMembers) {
          await onRefreshMembers();
        }
        await loadLoginStatus();
        setCredentialModal((prev) => ({ ...prev, step: 'success' }));
      }
    } catch (err) {
      setCredError(err.message || 'An unexpected error occurred.');
    } finally {
      setCredLoading(false);
    }
  };

  const handleOpenResetPassword = (member) => {
    const credStatus = getMemberCredentialStatus(member);
    const resolvedMember = {
      ...member,
      email: member.email || credStatus.email,
    };
    const generatedPass = generateTemporaryPassword();
    setResetModal({
      isOpen: true,
      member: resolvedMember,
      step: 'form',
    });
    setResetPasswordVal(generatedPass);
    setShowResetPassword(false);
    setResetError('');
    setCopiedReset(false);
  };

  const handleSaveResetPassword = async () => {
    if (!resetPasswordVal || resetPasswordVal.length < 6) {
      setResetError('Password must be at least 6 characters.');
      return;
    }

    setResetLoading(true);
    setResetError('');

    try {
      const role = isMemberAdmin(resetModal.member) ? 'admin' : 'member';
      const res = await supabaseService.adminResetMemberPassword({
        memberId: resetModal.member.id,
        email: resetModal.member.email,
        name: resetModal.member.name,
        newPassword: resetPasswordVal,
        role,
      });

      if (!res.success) {
        setResetError(res.error?.message || 'Failed to update password.');
      } else {
        resetModal.member.has_login_set = true;
        // Instantly reflect in local loginStatusMap so UI updates without lag
        setLoginStatusMap((prev) => {
          const next = new Map(prev);
          const info = {
            id: resetModal.member.id,
            full_name: resetModal.member.name,
            email: resetModal.member.email,
            has_login_set: true,
            role,
          };
          if (resetModal.member.id) next.set(resetModal.member.id, info);
          if (resetModal.member.email) next.set(resetModal.member.email.toLowerCase().trim(), info);
          if (resetModal.member.name) next.set(resetModal.member.name.toLowerCase().trim(), info);
          return next;
        });
        if (onRefreshMembers) {
          await onRefreshMembers();
        }
        await loadLoginStatus();
        setResetModal((prev) => ({ ...prev, step: 'success' }));
      }
    } catch (err) {
      setResetError(err.message || 'An unexpected error occurred.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleCopyCredentials = (username, email, password, setCopiedFn) => {
    const text = `Vessel Wash Login Credentials:\nUsername: ${username}\nEmail: ${email}\nPassword: ${password}\nLogin at: ${window.location.origin}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedFn(true);
        setTimeout(() => setCopiedFn(false), 3000);
      });
    }
  };

  // Deduplicate members list to guarantee UI never shows duplicate entries
  const deduplicatedMembersList = useMemo(() => {
    return supabaseService.deduplicateMembers(members);
  }, [members]);

  // Filtered members calculation
  const filteredMembers = useMemo(() => {
    return deduplicatedMembersList.filter((m) => {
      // 1. Tab filter
      if (activeFilter === 'active' && m.status !== 'active') return false;
      if (activeFilter === 'inactive' && m.status === 'active') return false;
      if (activeFilter === 'admins' && !isMemberAdmin(m)) return false;

      // 2. Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const credStatus = getMemberCredentialStatus(m);
        const matchesName = m.name?.toLowerCase().includes(query);
        const matchesCode = m.code?.toLowerCase().includes(query);
        const matchesEmail = (m.email || credStatus.email)?.toLowerCase().includes(query);
        return matchesName || matchesCode || matchesEmail;
      }

      return true;
    });
  }, [deduplicatedMembersList, activeFilter, searchQuery, adminUserIds, getMemberCredentialStatus]);

  const activeCount = deduplicatedMembersList.filter((m) => m.status === 'active').length;
  const inactiveCount = deduplicatedMembersList.length - activeCount;
  const adminCount = deduplicatedMembersList.filter((m) => isMemberAdmin(m)).length;

  return (
    <div className="space-y-4 pb-24 px-4 pt-2 max-w-4xl mx-auto">
      {/* 1. Header & Summary Section */}
      <div className="bg-gradient-to-br from-white to-neutral-50/80 p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3.5 border-b border-neutral-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200/60">
                Roster & Roles
              </span>
              <span className="text-xs text-neutral-400">&bull;</span>
              <span className="text-xs font-semibold text-neutral-500">
                {deduplicatedMembersList.length} {deduplicatedMembersList.length === 1 ? 'Member' : 'Members'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 mt-1">
              Member Directory
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin ? (
              <Button
                variant="primary"
                size="sm"
                icon={UserPlus}
                onClick={handleOpenAdd}
                className="shadow-sm font-semibold"
              >
                Add Member
              </Button>
            ) : (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed"
                title="Only Administrator can add or edit members"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Admin Restricted</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats & Capacity Badges */}
        <div className="flex items-center gap-3 pt-3 flex-wrap text-xs text-neutral-600">
          <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200/80 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{activeCount} Active in rotation</span>
          </div>

          <div className="flex items-center gap-1.5 bg-neutral-100 text-neutral-700 px-2.5 py-1 rounded-lg border border-neutral-200/80 font-medium">
            <span>{inactiveCount} Inactive</span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-medium ${
              adminUserIds.length >= 2
                ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-2xs'
                : 'bg-neutral-50 text-neutral-600 border-neutral-200'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-400" />
            <span>
              Admins: {adminUserIds.length}/2{' '}
              {adminUserIds.length >= 2 ? '(Limit reached)' : '(1 slot open)'}
            </span>
          </div>
        </div>
      </div>

      {/* Non-Admin Notice Banner */}
      {!isAdmin && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5 shadow-2xs">
          <Lock className="w-4 h-4 text-amber-700 shrink-0" />
          <span className="leading-snug">
            <strong>View-Only Mode:</strong> Member additions, credential assignments, role delegation, and removal are restricted to <strong>Kavipriyan (Primary Admin)</strong>.
          </span>
        </div>
      )}

      {/* 2. Search & Tab Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, code (e.g. M1), or email..."
            className="w-full h-10 pl-9 pr-9 text-xs bg-white rounded-xl border border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 shadow-2xs transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-700 p-0.5 rounded-full hover:bg-neutral-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-neutral-100/80 p-1 rounded-xl border border-neutral-200/60 overflow-x-auto">
          {[
            { id: 'all', label: `All (${members.length})` },
            { id: 'active', label: `Active (${activeCount})` },
            { id: 'inactive', label: `Inactive (${inactiveCount})` },
            { id: 'admins', label: `Admins (${adminCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeFilter === tab.id
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Member Cards List */}
      {filteredMembers.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50">
          <Users className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-neutral-700">No members match your criteria</p>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No results found for "${searchQuery}". Try a different name or clear the filter.`
              : 'There are no members listed under this filter.'}
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveFilter('all');
              }}
              className="mt-3 text-xs font-bold text-violet-700 hover:underline"
            >
              Clear Search & Filter
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMembers.map((member) => {
            const isActive = member.status === 'active';
            const isPrimary = isKavipriyan(member);
            const isThisAdmin = isMemberAdmin(member);
            const queuePos = queue.indexOf(member.id);
            const stats = getMemberWashStats(member.id);
            const credStatus = getMemberCredentialStatus(member);
            const memberWithCreds = {
              ...member,
              email: member.email || credStatus.email,
            };

            return (
              <div
                key={member.id}
                className={`group rounded-2xl border transition-all ${
                  isActive
                    ? 'bg-white dark:bg-[#171F2C] border-[#DDD9D0] dark:border-[#2A364B] hover:border-[#ECBD56]/60 dark:hover:border-[#ECBD56]/60 shadow-xs'
                    : 'bg-[#F2F1ED]/80 dark:bg-[#1F2A3C]/70 border-[#DDD9D0]/60 dark:border-[#2A364B]/60 opacity-80'
                }`}
              >
                <div className="p-3.5 sm:p-4">
                  {/* Top: Member Info & Identity */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Avatar */}
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 select-none shadow-2xs ${
                          isPrimary || isThisAdmin
                            ? 'admin-gradient text-white border border-[#ECBD56] ring-2 ring-[#ECBD56]/40 shadow-xs'
                            : isActive
                            ? 'bg-[#FCF7ED] dark:bg-[#272115] text-[#845D08] dark:text-[#FBE6AB] border border-[#ECBD56]/40'
                            : 'bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#848A96] dark:text-[#64748B] border border-[#DDD9D0] dark:border-[#2A364B]'
                        }`}
                      >
                        {isPrimary || isThisAdmin ? (
                          <Crown className="w-5 h-5 text-[#ECBD56] fill-[#ECBD56]" />
                        ) : (
                          member.code
                        )}
                      </div>

                      {/* Name & Primary Attributes */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-[#111216] dark:text-[#F7F6F3] truncate">
                            {member.name}
                          </h3>

                          {/* Role Badge - Gold Theme & Admin Gradient */}
                          {isPrimary ? (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full admin-gradient text-white border border-[#ECBD56]/80 inline-flex items-center gap-1 shadow-2xs">
                              <Crown className="w-3 h-3 text-[#ECBD56] fill-[#ECBD56]" />
                              Primary Admin
                            </span>
                          ) : isThisAdmin ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FCF7ED] dark:bg-[#272115] text-[#845D08] dark:text-[#FBE6AB] border border-[#ECBD56]/60 inline-flex items-center gap-1 shadow-2xs">
                              <ShieldCheck className="w-3 h-3 text-[#ECBD56]" />
                              Admin
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#4E525D] dark:text-[#9BA5B7] border border-[#DDD9D0] dark:border-[#2A364B]">
                              Member
                            </span>
                          )}

                          {/* Active / Inactive Status Badge */}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                              isActive
                                ? 'bg-[#EAF8F1] dark:bg-[#0E2E1D] text-[#22AC77] dark:text-[#4ADE80] border border-[#97E2C0] dark:border-[#166534]'
                                : 'bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#848A96] dark:text-[#64748B] border border-[#DDD9D0] dark:border-[#2A364B]'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isActive ? 'bg-[#22AC77] dark:bg-[#4ADE80]' : 'bg-[#848A96] dark:bg-[#64748B]'
                              }`}
                            ></span>
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        {/* Sub-line: Queue Position & Wash Stats */}
                        <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1 flex-wrap">
                          {isActive && queuePos !== -1 ? (
                            <span className="font-semibold text-violet-800 inline-flex items-center gap-1 bg-violet-50/80 px-1.5 py-0.5 rounded border border-violet-200/50">
                              <Hash className="w-3 h-3" />
                              Queue #{queuePos + 1}
                              {queuePos === 0 ? ' (Next Up)' : ''}
                            </span>
                          ) : (
                            <span className="text-neutral-400">Not in rotation</span>
                          )}

                          <span className="text-neutral-300">&bull;</span>

                          <span className="inline-flex items-center gap-1 text-neutral-600 font-medium">
                            <Utensils className="w-3 h-3 text-neutral-400" />
                            {stats.total} washes
                            <span className="text-neutral-400 text-[11px]">
                              ({stats.lunch} lunch &bull; {stats.dinner} dinner)
                            </span>
                          </span>
                        </div>

                        {/* Credentials indicator */}
                        <div className="mt-1.5 flex items-center gap-2">
                          {credStatus.hasLogin ? (
                            <div className="inline-flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50/90 border border-emerald-200 px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="font-semibold text-[10px]">Login Active</span>
                              {credStatus.email && (
                                <span className="text-emerald-700 font-mono text-[10px] truncate max-w-[140px] sm:max-w-[220px]">
                                  ({credStatus.email})
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>No Login Set</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Action Toolbar (Separated with clean top border) */}
                  <div className="mt-3 pt-2.5 border-t border-[#DDD9D0]/60 dark:border-[#2A364B]/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    {/* Left: Credential Actions - Strictly Generate Credential OR Update Password */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isAdmin ? (
                        !credStatus.hasLogin ? (
                          <button
                            type="button"
                            onClick={() => handleOpenCreateCredentials(memberWithCreds)}
                            className="px-3 py-1.5 text-xs font-bold text-[#111216] bg-[#ECBD56] hover:bg-[#DEAA3E] rounded-full transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active-scale"
                            title="Generate login credentials for this member"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-[#111216]" />
                            <span>Generate Credential</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenResetPassword(memberWithCreds)}
                            className="px-3 py-1.5 text-xs font-bold text-[#111216] bg-[#ECBD56] hover:bg-[#DEAA3E] rounded-full transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active-scale"
                            title="Update password for this member"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-[#111216]" />
                            <span>Update Password</span>
                          </button>
                        )
                      ) : (
                        <span className="text-[11px] text-[#848A96] dark:text-[#64748B] italic">
                          {credStatus.hasLogin ? 'Login configured' : 'No credentials set'}
                        </span>
                      )}
                    </div>

                    {/* Right: Admin Action Buttons Toolbar */}
                    {isAdmin && (
                      <div className="flex items-center gap-1 justify-end">
                        {/* Admin Role Toggle */}
                        {isPrimary ? (
                          <span
                            className="p-1.5 text-neutral-300 cursor-not-allowed opacity-50"
                            title="Primary Admin (Permanent)"
                          >
                            <Crown className="w-4 h-4 text-amber-500 fill-amber-300" />
                          </span>
                        ) : isThisAdmin ? (
                          <button
                            type="button"
                            onClick={() =>
                              setAdminModal({
                                isOpen: true,
                                member,
                                action: 'revoke',
                              })
                            }
                            className="px-2 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            title="Remove Co-Admin privileges"
                          >
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                            <span>Remove Admin</span>
                          </button>
                        ) : adminUserIds.length >= 2 ? (
                          <button
                            type="button"
                            disabled
                            className="p-1.5 text-neutral-300 cursor-not-allowed rounded-lg"
                            title="Max 2 Admins reached. Remove Co-Admin to designate another."
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setAdminModal({
                                isOpen: true,
                                member,
                                action: 'grant',
                              })
                            }
                            className="p-1.5 text-neutral-500 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors cursor-pointer"
                            title="Make Co-Admin (1 slot available)"
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                        )}

                        <div className="w-[1px] h-4 bg-neutral-200 mx-1"></div>

                        {/* Edit Name Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(member)}
                          className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit member name and details"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Deactivate / Reactivate Button */}
                        <button
                          type="button"
                          onClick={() => setDeactivateModal({ isOpen: true, member })}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isActive
                              ? 'text-neutral-500 hover:text-amber-700 hover:bg-amber-50'
                              : 'text-emerald-700 hover:bg-emerald-50'
                          }`}
                          title={isActive ? 'Deactivate from queue' : 'Reactivate into queue'}
                        >
                          {isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>

                        {/* Remove Member Button (Disabled for Primary Admin) */}
                        {!isPrimary ? (
                          <button
                            type="button"
                            onClick={() => handleOpenRemove(member)}
                            className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Remove member permanently"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span
                            className="p-1.5 text-neutral-200 cursor-not-allowed"
                            title="Primary Admin cannot be removed"
                          >
                            <Trash2 className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS                                                                    */}
      {/* ========================================================================= */}

      {/* 1. ADD MEMBER MODAL */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add New Member"
        subtitle="New members enter rotation following the 'never-washed first' scheduling rule."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveNewMember}>
              Save Member
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <TextInput
            label="Member Full Name"
            placeholder="e.g. Arun Kumar"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            error={formError}
            required
            autoFocus
          />
          <TextInput
            label="Member Code"
            placeholder="e.g. M16"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            helperText="Short identification tag for badges and queue tables"
          />
        </div>
      </Modal>

      {/* 2. EDIT MEMBER MODAL */}
      <Modal
        isOpen={editModal.isOpen}
        onClose={() => setEditModal({ isOpen: false, member: null })}
        title="Edit Member"
        subtitle="Name changes propagate across past attendance records and future rotations."
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEditModal({ isOpen: false, member: null })}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveEdit}>
              Update Details
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <TextInput
            label="Member Full Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            error={editError}
            required
            autoFocus
          />

          {editModal.member && !isKavipriyan(editModal.member) ? (
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-neutral-800 block">Account Role</label>
              <div className="flex p-1 bg-neutral-100 rounded-xl border border-neutral-200">
                <button
                  type="button"
                  onClick={() => setEditRole('member')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    editRole === 'member'
                      ? 'bg-white text-neutral-900 shadow-2xs'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <span>Member</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditRole('admin')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    editRole === 'admin'
                      ? 'bg-violet-600 text-white shadow-2xs'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>Admin</span>
                </button>
              </div>
              <p className="text-[10px] text-neutral-400">
                Admins have full access to manage members and timetable rules. Members have daily
                attendance entry.
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-violet-50 border border-violet-200 text-xs text-violet-900 font-semibold flex items-center gap-2">
              <Crown className="w-4 h-4 text-violet-700" />
              <span>Primary Administrator (Permanent Role)</span>
            </div>
          )}
        </div>
      </Modal>

      {/* 3. DEACTIVATE / REACTIVATE MODAL */}
      <Modal
        isOpen={deactivateModal.isOpen}
        onClose={() => setDeactivateModal({ isOpen: false, member: null })}
        title={
          deactivateModal.member?.status === 'active'
            ? 'Deactivate Member?'
            : 'Reactivate Member?'
        }
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDeactivateModal({ isOpen: false, member: null })}
            >
              Cancel
            </Button>
            <Button
              variant={deactivateModal.member?.status === 'active' ? 'destructive' : 'primary'}
              size="sm"
              onClick={handleConfirmDeactivate}
            >
              {deactivateModal.member?.status === 'active' ? 'Deactivate' : 'Reactivate'}
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-neutral-900 text-sm">
              {deactivateModal.member?.name} ({deactivateModal.member?.code})
            </p>
            {deactivateModal.member?.status === 'active' ? (
              <p className="text-neutral-600 leading-relaxed">
                Deactivating removes this member from future washing rotations. Their past attendance
                logs and history remain safely recorded.
              </p>
            ) : (
              <p className="text-neutral-600 leading-relaxed">
                Reactivating returns this member to the active rotation queue following standard rotation
                priority.
              </p>
            )}
          </div>
        </div>
      </Modal>

      {/* 4. ADMIN ROLE CONFIRMATION MODAL */}
      <Modal
        isOpen={adminModal.isOpen}
        onClose={() => setAdminModal({ isOpen: false, member: null, action: 'grant' })}
        title={
          adminModal.action === 'grant'
            ? 'Designate as Co-Administrator?'
            : 'Revoke Admin Privileges?'
        }
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setAdminModal({ isOpen: false, member: null, action: 'grant' })}
            >
              Cancel
            </Button>
            <Button
              variant={adminModal.action === 'grant' ? 'primary' : 'destructive'}
              size="sm"
              onClick={() => {
                if (adminModal.member && onToggleAdminRole) {
                  onToggleAdminRole(
                    adminModal.member.id,
                    adminModal.action === 'grant' ? 'admin' : 'member'
                  );
                }
                setAdminModal({ isOpen: false, member: null, action: 'grant' });
              }}
            >
              {adminModal.action === 'grant' ? 'Confirm Make Admin' : 'Change to Member'}
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs">
          {adminModal.action === 'grant' ? (
            <ShieldCheck className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <p className="font-bold text-neutral-900 text-sm">
              {adminModal.member?.name} ({adminModal.member?.code})
            </p>
            {adminModal.action === 'grant' ? (
              <p className="text-neutral-600 leading-relaxed">
                This member will be granted Co-Admin permissions (maximum 2 admins). They will be able to
                manage members, attendance, rosters, and timetable settings.
              </p>
            ) : (
              <p className="text-neutral-600 leading-relaxed">
                Revoke administrator privileges from {adminModal.member?.name}? They will return to
                standard member access.
              </p>
            )}
          </div>
        </div>
      </Modal>

      {/* 5. NEW: REMOVE MEMBER CONFIRMATION MODAL */}
      <Modal
        isOpen={removeModal.isOpen}
        onClose={() => setRemoveModal({ isOpen: false, member: null })}
        title="Remove Member from Roster?"
        subtitle="This action will remove the member from active queue and future rotations."
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRemoveModal({ isOpen: false, member: null })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              icon={Trash2}
              onClick={handleConfirmRemove}
            >
              Remove Member
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
            <Trash2 className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-rose-950 text-sm">
                Remove {removeModal.member?.name} ({removeModal.member?.code})
              </p>
              <p className="text-rose-800 leading-relaxed">
                Are you sure you want to permanently remove this member from the roster and rotation queue?
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs space-y-2 text-neutral-600">
            <div className="flex items-center justify-between">
              <span className="font-medium text-neutral-500">Attendance Records:</span>
              <span className="font-bold text-neutral-800">Preserved in history</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-neutral-500">Future Rotations:</span>
              <span className="font-bold text-neutral-800">Excluded immediately</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-neutral-500">Database Sync:</span>
              <span className="font-bold text-neutral-800">Deleted from Supabase members</span>
            </div>
          </div>
        </div>
      </Modal>

      {/* 6. ADMIN CREATE CREDENTIALS MODAL */}
      <Modal
        isOpen={credentialModal.isOpen}
        onClose={() => setCredentialModal({ isOpen: false, member: null, step: 'form' })}
        title={
          credentialModal.step === 'form'
            ? (!credentialModal.member?.email ? 'Assign Login Credentials' : 'Update Credentials')
            : (!credentialModal.member?.email ? 'Credentials Assigned Successfully!' : 'Credentials Updated Successfully!')
        }
        subtitle={
          credentialModal.step === 'form'
            ? (!credentialModal.member?.email
                ? `Register Supabase Auth login credentials for existing member ${credentialModal.member?.name}.`
                : `Update login credentials for existing member ${credentialModal.member?.name}.`)
            : `Provide these login credentials to ${credentialModal.member?.name}.`
        }
        footer={
          credentialModal.step === 'form' ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCredentialModal({ isOpen: false, member: null, step: 'form' })}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={credLoading}
                onClick={handleSaveCredentials}
              >
                {!credentialModal.member?.email ? 'Assign Credentials' : 'Update Credentials'}
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCredentialModal({ isOpen: false, member: null, step: 'form' })}
            >
              Done
            </Button>
          )
        }
      >
        {credentialModal.step === 'form' ? (
          <div className="space-y-3.5 p-0.5">
            {credError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{credError}</span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-neutral-100/70 border border-neutral-200 text-xs flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-violet-600 text-white font-extrabold flex items-center justify-center text-xs shrink-0">
                {credentialModal.member?.code || 'M'}
              </div>
              <div>
                <strong className="text-neutral-900 text-xs block">
                  {credentialModal.member?.name}
                </strong>
                <span className="text-[11px] text-neutral-500">
                  Role: {isMemberAdmin(credentialModal.member) ? '👑 Admin' : 'Standard Member'}
                </span>
              </div>
            </div>

            <TextInput
              label="Member Email Address"
              value={credEmail}
              onChange={(e) => setCredEmail(e.target.value)}
              placeholder="name@example.com"
              required
              helperText="The email address used to authenticate and link with Supabase Auth"
            />

            <TextInput
              label="Default Username"
              value={credUsername}
              onChange={(e) => setCredUsername(e.target.value)}
              placeholder="e.g. arun"
              required
              helperText="Members can log in using either this username or their email"
            />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-800 block">
                  Temporary Password
                </label>
                <button
                  type="button"
                  onClick={() => setCredPassword(generateTemporaryPassword())}
                  className="text-[11px] font-bold text-violet-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Generate Random</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type={showCredPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={credPassword}
                  onChange={(e) => setCredPassword(e.target.value)}
                  placeholder="Enter or generate temporary password"
                  className="w-full h-10 px-3 pr-10 text-xs font-mono font-semibold bg-white rounded-xl border border-neutral-200 text-neutral-900 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
                />
                <button
                  type="button"
                  onClick={() => setShowCredPassword(!showCredPassword)}
                  className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-800 cursor-pointer"
                  tabIndex={-1}
                >
                  {showCredPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-neutral-400">
                Temporary password for first login (min 6 characters).
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 p-0.5">
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1 text-xs">
              <span className="font-bold flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Account Created in Supabase Auth
              </span>
              <p className="text-[11px] text-emerald-700 leading-snug">
                Credentials have been registered. The member can now log in using either their username or
                email.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-100/80 border border-neutral-200 space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between pb-1 border-b border-neutral-200">
                <span className="text-neutral-500 font-sans text-[11px]">Member:</span>
                <strong className="text-neutral-900 font-sans">{credentialModal.member?.name}</strong>
              </div>
              <div className="flex items-center justify-between pb-1 border-b border-neutral-200">
                <span className="text-neutral-500 font-sans text-[11px]">Username:</span>
                <span className="font-bold text-violet-700">{credUsername}</span>
              </div>
              <div className="flex items-center justify-between pb-1 border-b border-neutral-200">
                <span className="text-neutral-500 font-sans text-[11px]">Email:</span>
                <span className="text-neutral-700">{credEmail}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 font-sans text-[11px]">Temporary Password:</span>
                <span className="font-bold text-neutral-900 bg-white px-2 py-0.5 rounded border border-neutral-200">
                  {credPassword}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                handleCopyCredentials(credUsername, credEmail, credPassword, setCopiedCreds)
              }
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {copiedCreds ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCreds ? 'Credentials Copied to Clipboard!' : 'Copy Credentials'}</span>
            </button>
          </div>
        )}
      </Modal>

      {/* 7. ADMIN RESET PASSWORD MODAL */}
      <Modal
        isOpen={resetModal.isOpen}
        onClose={() => setResetModal({ isOpen: false, member: null, step: 'form' })}
        title={
          resetModal.step === 'form' ? 'Admin Password Update' : 'Password Updated Successfully!'
        }
        subtitle={
          resetModal.step === 'form'
            ? `Update password or set temporary password for ${resetModal.member?.name}.`
            : `Provide the new password to ${resetModal.member?.name}.`
        }
        footer={
          resetModal.step === 'form' ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setResetModal({ isOpen: false, member: null, step: 'form' })}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={resetLoading}
                onClick={handleSaveResetPassword}
              >
                Update Password
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setResetModal({ isOpen: false, member: null, step: 'form' })}
            >
              Done
            </Button>
          )
        }
      >
        {resetModal.step === 'form' ? (
          <div className="space-y-3.5 p-0.5">
            {resetError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{resetError}</span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-violet-50 border border-violet-200 text-xs space-y-1">
              <span className="font-bold text-violet-950 block">{resetModal.member?.name}</span>
              <span className="text-[11px] text-violet-700 font-mono block">
                {resetModal.member?.email}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-800 block">
                  New Password
                </label>
                <button
                  type="button"
                  onClick={() => setResetPasswordVal(generateTemporaryPassword())}
                  className="text-[11px] font-bold text-violet-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Generate Random</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type={showResetPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={resetPasswordVal}
                  onChange={(e) => setResetPasswordVal(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full h-10 px-3 pr-10 text-xs font-mono font-semibold bg-white rounded-xl border border-neutral-200 text-neutral-900 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword(!showResetPassword)}
                  className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-800 cursor-pointer"
                  tabIndex={-1}
                >
                  {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-neutral-400">
                Admin override: Immediately updates authentication password in Supabase Auth.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 p-0.5">
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1 text-xs">
              <span className="font-bold flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Password Reset Successfully
              </span>
              <p className="text-[11px] text-emerald-700 leading-snug">
                The password for {resetModal.member?.name} has been updated. Provide the new password
                below.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-100/80 border border-neutral-200 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between pb-1 border-b border-neutral-200">
                <span className="text-neutral-500 font-sans text-[11px]">Member:</span>
                <strong className="text-neutral-900 font-sans">{resetModal.member?.name}</strong>
              </div>
              <div className="flex items-center justify-between pb-1 border-b border-neutral-200">
                <span className="text-neutral-500 font-sans text-[11px]">Email:</span>
                <span className="text-neutral-700">{resetModal.member?.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 font-sans text-[11px]">New Password:</span>
                <span className="font-bold text-neutral-900 bg-white px-2 py-0.5 rounded border border-neutral-200">
                  {resetPasswordVal}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                handleCopyCredentials(
                  resetModal.member?.name,
                  resetModal.member?.email,
                  resetPasswordVal,
                  setCopiedReset
                )
              }
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {copiedReset ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedReset ? 'New Password Copied!' : 'Copy New Password'}</span>
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
