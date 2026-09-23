import React, { useState } from 'react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { TextInput, Toggle } from '../components/common/Inputs';
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
}) {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModal, setEditModal] = useState({ isOpen: false, member: null });
  const [deactivateModal, setDeactivateModal] = useState({ isOpen: false, member: null });
  const [adminModal, setAdminModal] = useState({ isOpen: false, member: null, action: 'grant' });

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

  // Helpers to identify primary admin and delegated admins
  const isKavipriyan = (m) => m?.id === 'm1' || (m?.name && m.name.trim().toLowerCase().includes('kavipriyan'));
  const isMemberAdmin = (m) => isKavipriyan(m) || m?.role === 'admin' || (adminUserIds && adminUserIds.includes(m?.id));

  // Form states
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [formError, setFormError] = useState('');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('member');
  const [editError, setEditError] = useState('');

  // Calculate wash counts for each member
  const getMemberWashStats = (memberId) => {
    const logs = attendanceLogs.filter(l => l.memberId === memberId && l.status === 'present');
    const lunchCount = logs.filter(l => l.meal === 'lunch').length;
    const dinnerCount = logs.filter(l => l.meal === 'dinner').length;
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
    // Check duplicates
    if (members.some(m => m.name.toLowerCase() === trimmed.toLowerCase())) {
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
        m => m.id !== editModal.member.id && m.name.toLowerCase() === trimmed.toLowerCase()
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

  const handleOpenCreateCredentials = (member) => {
    const suggestedUsername = generateDefaultUsername(member.name);
    const suggestedEmail = member.email || `${suggestedUsername}@vesselwash.app`;
    const generatedPass = generateTemporaryPassword();

    setCredentialModal({
      isOpen: true,
      member,
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
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setCredError('Please enter a valid email address.');
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
        email: cleanEmail,
        password: credPassword,
        role,
      });

      if (!res.success) {
        setCredError(res.error?.message || 'Failed to create member credentials.');
      } else {
        // Link email locally
        credentialModal.member.email = cleanEmail;
        setCredentialModal(prev => ({ ...prev, step: 'success' }));
      }
    } catch (err) {
      setCredError(err.message || 'An unexpected error occurred.');
    } finally {
      setCredLoading(false);
    }
  };

  const handleOpenResetPassword = (member) => {
    const generatedPass = generateTemporaryPassword();
    setResetModal({
      isOpen: true,
      member,
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
      const res = await supabaseService.adminResetMemberPassword({
        memberId: resetModal.member.id,
        email: resetModal.member.email,
        newPassword: resetPasswordVal,
      });

      if (!res.success) {
        setResetError(res.error?.message || 'Failed to reset password.');
      } else {
        setResetModal(prev => ({ ...prev, step: 'success' }));
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

  const activeCount = members.filter(m => m.status === 'active').length;

  return (
    <div className="space-y-4 pb-24 px-4 pt-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Roster & Management
          </span>
          <h2 className="text-xl font-bold tracking-tight text-neutral-textPrimary">
            Members ({members.length})
          </h2>
          <p className="text-xs text-neutral-textSecondary mt-0.5 flex items-center gap-2 flex-wrap">
            <span>{activeCount} active in queue</span>
            <span>&middot;</span>
            <span className={adminUserIds.length >= 2 ? 'text-violet-700 font-bold' : 'text-neutral-600 font-medium'}>
              Admins: {adminUserIds.length}/2 ({adminUserIds.length >= 2 ? 'Max 2 reached' : '1 slot available'})
            </span>
          </p>
        </div>
        {isAdmin ? (
          <Button
            variant="primary"
            size="sm"
            icon={UserPlus}
            onClick={handleOpenAdd}
          >
            Add Member
          </Button>
        ) : (
          <button
            type="button"
            disabled
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-[#ECEEF0] text-neutral-textTertiary border border-neutral-border cursor-not-allowed opacity-75"
            title="Only Admin (Kavipriyan) can add members"
          >
            <Lock className="w-3 h-3 text-neutral-textTertiary" />
            <span>Add Member</span>
          </button>
        )}
      </div>

      {/* Non-Admin Notice Banner */}
      {!isAdmin && (
        <div className="p-3 rounded-[22px] bg-[#FFD89D]/20 border border-[#FFD89D]/50 text-[#1E1E1E] text-xs flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <Lock className="w-4 h-4 text-amber-700 flex-shrink-0" />
            <span className="text-[11px] font-medium leading-tight">
              <strong>Admin Access Only:</strong> Member editing, additions, and admin delegation are restricted to <strong>Kavipriyan (Admin)</strong> and designated Admins.
            </span>
          </div>
        </div>
      )}

      {/* Member List */}
      <div className="space-y-2.5">
        {members.map((member) => {
          const isActive = member.status === 'active';
          const isPrimary = isKavipriyan(member);
          const isThisAdmin = isMemberAdmin(member);
          const queuePos = queue.indexOf(member.id);
          const stats = getMemberWashStats(member.id);

          return (
            <Card
              key={member.id}
              padding="default"
              className={!isActive ? 'opacity-70 bg-[#ECEEF0]/40' : ''}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-2xs ${
                      isPrimary || isThisAdmin
                        ? 'bg-[#A28EF9] text-[#1E1E1E] ring-2 ring-[#A28EF9]/40'
                        : isActive
                        ? 'bg-[#A4F5A6]/35 text-[#1E1E1E] border border-[#A4F5A6]/40'
                        : 'bg-[#ECEEF0] text-neutral-textTertiary border border-neutral-border'
                    }`}
                  >
                    {isPrimary || isThisAdmin ? '👑' : member.code}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-neutral-textPrimary">
                        {member.name}
                      </h4>
                      {isPrimary ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#A28EF9]/25 text-[#2C1885] border border-[#A28EF9]/50 inline-flex items-center gap-0.5">
                          👑 Primary Admin
                        </span>
                      ) : isThisAdmin ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#A28EF9]/20 text-[#2C1885] border border-[#A28EF9]/40 inline-flex items-center gap-0.5">
                          👑 Admin
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200 inline-flex items-center gap-0.5">
                          Member
                        </span>
                      )}
                      <Badge variant={isActive ? 'completed' : 'inactive'} size="sm" showIcon={false}>
                        {isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    {/* Queue position or status */}
                    <div className="flex items-center gap-2 text-xs text-neutral-textSecondary mt-0.5">
                      {isActive && queuePos !== -1 ? (
                        <span className="text-[#2C1885] font-semibold">
                          Queue position: #{queuePos + 1}
                          {queuePos === 0 ? ' (Next Up)' : ''}
                        </span>
                      ) : (
                        <span className="text-neutral-textTertiary">Excluded from queue</span>
                      )}
                      <span>&middot;</span>
                      <span className="text-neutral-textTertiary">
                        {stats.total} washes ({stats.lunch}L / {stats.dinner}D)
                      </span>
                    </div>

                    {/* Member Credentials Status */}
                    {member.email ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-neutral-textSecondary mt-1">
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-md font-semibold text-[10px] border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Credentials Active
                        </span>
                        <span className="truncate max-w-[130px] sm:max-w-[200px] text-neutral-500 font-mono text-[10px]">
                          {member.email}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded-md font-semibold mt-1 border border-amber-200 w-fit">
                        <span>⚠️ No Credentials Created</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Member action buttons: enabled only for Admin */}
                {isAdmin ? (
                  <div className="flex items-center gap-1 flex-wrap justify-end">
                    {/* Create Credentials / Reset Password Button */}
                    {!member.email ? (
                      <button
                        type="button"
                        onClick={() => handleOpenCreateCredentials(member)}
                        className="px-2.5 py-1 rounded-full text-[10px] font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 transition-colors flex items-center gap-1 active-scale shadow-2xs cursor-pointer"
                        title="Create Login Credentials for this member"
                      >
                        <KeyRound className="w-3 h-3 text-violet-600" />
                        <span>Create Credentials</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenResetPassword(member)}
                        className="px-2 py-1 rounded-full text-[10px] font-bold text-neutral-700 bg-[#ECEEF0] hover:bg-neutral-200 border border-neutral-border transition-colors flex items-center gap-1 active-scale cursor-pointer"
                        title="Reset Password for this member (Admin)"
                      >
                        <KeyRound className="w-3 h-3 text-neutral-600" />
                        <span>Reset Pass</span>
                      </button>
                    )}

                    {/* Admin Delegation Button (Only on non-primary members) */}
                    {isPrimary ? (
                      <span
                        className="p-1.5 text-neutral-textTertiary cursor-not-allowed opacity-50 flex items-center"
                        title="Primary Admin (Permanent)"
                      >
                        <Crown className="w-4 h-4 text-[#7D64F6]" />
                      </span>
                    ) : isThisAdmin ? (
                      /* Co-Admin row: Explicit 'Remove from Admin' option */
                      <button
                        type="button"
                        onClick={() =>
                          setAdminModal({
                            isOpen: true,
                            member,
                            action: 'revoke',
                          })
                        }
                        className="px-2.5 py-1 rounded-full text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors flex items-center gap-1 active-scale shadow-2xs"
                        title="Remove from Admin"
                      >
                        <ShieldAlert className="w-3 h-3 text-rose-600" />
                        <span>Remove from Admin</span>
                      </button>
                    ) : adminUserIds.length >= 2 ? (
                      /* Max 2 Admins reached -> disabled */
                      <button
                        type="button"
                        disabled
                        className="p-2 rounded-full text-neutral-300 cursor-not-allowed opacity-50"
                        title="Maximum 2 Admins reached. Remove Co-Admin to designate another member."
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </button>
                    ) : (
                      /* 1 slot available -> Make Admin */
                      <button
                        type="button"
                        onClick={() =>
                          setAdminModal({
                            isOpen: true,
                            member,
                            action: 'grant',
                          })
                        }
                        className="p-2 rounded-full text-neutral-textTertiary hover:text-[#7D64F6] hover:bg-neutral-100 transition-colors active-scale"
                        title="Make this member an Admin (1 slot available)"
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(member)}
                      className="p-2 rounded-full text-neutral-textSecondary hover:text-neutral-textPrimary hover:bg-[#ECEEF0] transition-colors"
                      title="Edit name (Admin)"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeactivateModal({ isOpen: true, member })}
                      className={`p-2 rounded-full transition-colors ${
                        isActive
                          ? 'text-neutral-textSecondary hover:text-status-error hover:bg-status-errorBg/40'
                          : 'text-status-success hover:bg-status-successBg/40'
                      }`}
                      title={isActive ? 'Deactivate member' : 'Reactivate member'}
                    >
                      {isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <span
                      className="p-1 text-neutral-textTertiary cursor-not-allowed opacity-50"
                      title="Only Admin can modify members"
                    >
                      <Lock className="w-3.5 h-3.5" />
                    </span>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* ADD MEMBER MODAL */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add New Member"
        subtitle="New members enter the queue following the 'never-washed first' rotation rule."
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
        <div className="space-y-3">
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
            placeholder="e.g. M6"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            helperText="Short tag for cards and queue preview"
          />
        </div>
      </Modal>

      {/* EDIT MEMBER MODAL */}
      <Modal
        isOpen={editModal.isOpen}
        onClose={() => setEditModal({ isOpen: false, member: null })}
        title="Edit Member Name"
        subtitle="Renaming will update across all past and future assignments safely."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setEditModal({ isOpen: false, member: null })}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveEdit}>
              Update Name
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <TextInput
            label="Member Full Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            error={editError}
            required
            autoFocus
          />

          {/* Role Selection for Non-Primary Members */}
          {editModal.member && !isKavipriyan(editModal.member) ? (
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-[#1E1E1E] block">
                Account Role
              </label>
              <div className="flex p-1 bg-[#ECEEF0] rounded-xl border border-neutral-border/60">
                <button
                  type="button"
                  onClick={() => setEditRole('member')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    editRole === 'member'
                      ? 'bg-white text-[#1E1E1E] shadow-2xs'
                      : 'text-neutral-textSecondary hover:text-[#1E1E1E]'
                  }`}
                >
                  <span>Member</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditRole('admin')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    editRole === 'admin'
                      ? 'bg-[#A28EF9] text-[#1E1E1E] shadow-2xs'
                      : 'text-neutral-textSecondary hover:text-[#1E1E1E]'
                  }`}
                >
                  <span>👑 Admin</span>
                </button>
              </div>
              <p className="text-[10px] text-neutral-textTertiary">
                Admins have full access to manage members and timetable rules. Members have daily attendance tools.
              </p>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-violet-50 border border-violet-200 text-[11px] text-violet-800 font-semibold flex items-center gap-1.5">
              <span>👑 Primary Administrator (Permanent)</span>
            </div>
          )}
        </div>
      </Modal>

      {/* DEACTIVATE / REACTIVATE CONFIRMATION MODAL */}
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
            <Button variant="secondary" size="sm" onClick={() => setDeactivateModal({ isOpen: false, member: null })}>
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
        <div className="flex items-start gap-3 p-3 rounded-lg bg-neutral-surfaceSecondary border border-neutral-border">
          <AlertTriangle className="w-5 h-5 text-status-warning flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold text-neutral-textPrimary text-sm mb-0.5">
              {deactivateModal.member?.name} ({deactivateModal.member?.code})
            </p>
            {deactivateModal.member?.status === 'active' ? (
              <p className="text-neutral-textSecondary">
                Deactivating this member will remove them from future washing rotations. Their past attendance records and history remain intact.
              </p>
            ) : (
              <p className="text-neutral-textSecondary">
                Reactivating this member will return them to the active rotation queue according to standard rules.
              </p>
            )}
          </div>
        </div>
      </Modal>

      {/* ADMIN ROLE CONFIRMATION MODAL */}
      <Modal
        isOpen={adminModal.isOpen}
        onClose={() => setAdminModal({ isOpen: false, member: null, action: 'grant' })}
        title={
          adminModal.action === 'grant'
            ? 'Designate as Co-Administrator?'
            : 'Remove from Admin Role?'
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
        <div className="flex items-start gap-3 p-3 rounded-lg bg-neutral-surfaceSecondary border border-neutral-border">
          {adminModal.action === 'grant' ? (
            <ShieldCheck className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-status-warning flex-shrink-0 mt-0.5" />
          )}
          <div className="text-xs">
            <p className="font-semibold text-neutral-textPrimary text-sm mb-0.5">
              {adminModal.member?.name} ({adminModal.member?.code})
            </p>
            {adminModal.action === 'grant' ? (
              <p className="text-neutral-textSecondary">
                This member will be given administrator permissions as Co-Admin (maximum 2 admins limit). They will be able to edit meal settings, attendance, members, and Excel rosters.
              </p>
            ) : (
              <p className="text-neutral-textSecondary">
                Remove administrator permissions from {adminModal.member?.name}? They will return to standard member access (attendance entry only).
              </p>
            )}
          </div>
        </div>
      </Modal>

      {/* 1. ADMIN CREATE CREDENTIALS MODAL */}
      <Modal
        isOpen={credentialModal.isOpen}
        onClose={() => setCredentialModal({ isOpen: false, member: null, step: 'form' })}
        title={credentialModal.step === 'form' ? 'Create Member Credentials' : 'Credentials Created Successfully!'}
        subtitle={
          credentialModal.step === 'form'
            ? `Register Supabase Auth login credentials for ${credentialModal.member?.name}.`
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
                Register Credentials
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

            <div className="p-3 rounded-xl bg-[#ECEEF0]/60 border border-neutral-border text-xs flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#A28EF9] text-[#1E1E1E] font-extrabold flex items-center justify-center text-xs shrink-0">
                {credentialModal.member?.code || 'M'}
              </div>
              <div>
                <strong className="text-neutral-textPrimary text-xs block">{credentialModal.member?.name}</strong>
                <span className="text-[11px] text-neutral-textTertiary">
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
                <label className="text-xs font-bold text-[#1E1E1E] block">
                  Temporary Password
                </label>
                <button
                  type="button"
                  onClick={() => setCredPassword(generateTemporaryPassword())}
                  className="text-[11px] font-bold text-[#7D64F6] hover:underline flex items-center gap-1 cursor-pointer"
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
                  className="w-full h-10 px-3 pr-10 text-xs font-mono font-semibold bg-white rounded-xl border border-neutral-border text-[#1E1E1E] focus:outline-none focus:border-[#A28EF9] focus:ring-2 focus:ring-[#A28EF9]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowCredPassword(!showCredPassword)}
                  className="absolute right-3 top-2.5 text-neutral-400 hover:text-[#1E1E1E] cursor-pointer"
                  tabIndex={-1}
                >
                  {showCredPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-neutral-textTertiary">
                Temporary password for first login (min 6 characters).
              </p>
            </div>
          </div>
        ) : (
          /* Success View with 1-click Copy Credentials */
          <div className="space-y-4 p-0.5 animate-fadeIn">
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1 text-xs">
              <span className="font-bold flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Account Created in Supabase Auth
              </span>
              <p className="text-[11px] text-emerald-700 leading-snug">
                Credentials have been registered. The member can now log in using either their username or email.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#ECEEF0]/80 border border-neutral-border space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between pb-1 border-b border-neutral-border/60">
                <span className="text-neutral-500 font-sans text-[11px]">Member:</span>
                <strong className="text-neutral-800 font-sans">{credentialModal.member?.name}</strong>
              </div>
              <div className="flex items-center justify-between pb-1 border-b border-neutral-border/60">
                <span className="text-neutral-500 font-sans text-[11px]">Username:</span>
                <span className="font-bold text-violet-700">{credUsername}</span>
              </div>
              <div className="flex items-center justify-between pb-1 border-b border-neutral-border/60">
                <span className="text-neutral-500 font-sans text-[11px]">Email:</span>
                <span className="text-neutral-700">{credEmail}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 font-sans text-[11px]">Temporary Password:</span>
                <span className="font-bold text-neutral-900 bg-white px-2 py-0.5 rounded border border-neutral-border">
                  {credPassword}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleCopyCredentials(credUsername, credEmail, credPassword, setCopiedCreds)}
              className="w-full py-2.5 px-4 rounded-xl bg-[#1E1E1E] hover:bg-black text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 active-scale transition-all cursor-pointer"
            >
              {copiedCreds ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCreds ? 'Credentials Copied to Clipboard!' : 'Copy Credentials'}</span>
            </button>
          </div>
        )}
      </Modal>

      {/* 2. ADMIN RESET PASSWORD MODAL */}
      <Modal
        isOpen={resetModal.isOpen}
        onClose={() => setResetModal({ isOpen: false, member: null, step: 'form' })}
        title={resetModal.step === 'form' ? 'Admin Password Reset' : 'Password Reset Successfully!'}
        subtitle={
          resetModal.step === 'form'
            ? `Set or generate a new temporary password for ${resetModal.member?.name}.`
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
                variant="destructive"
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
              <span className="font-bold text-violet-900 block">{resetModal.member?.name}</span>
              <span className="text-[11px] text-violet-700 font-mono block">{resetModal.member?.email}</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1E1E1E] block">
                  New Temporary Password
                </label>
                <button
                  type="button"
                  onClick={() => setResetPasswordVal(generateTemporaryPassword())}
                  className="text-[11px] font-bold text-[#7D64F6] hover:underline flex items-center gap-1 cursor-pointer"
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
                  className="w-full h-10 px-3 pr-10 text-xs font-mono font-semibold bg-white rounded-xl border border-neutral-border text-[#1E1E1E] focus:outline-none focus:border-[#A28EF9] focus:ring-2 focus:ring-[#A28EF9]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword(!showResetPassword)}
                  className="absolute right-3 top-2.5 text-neutral-400 hover:text-[#1E1E1E] cursor-pointer"
                  tabIndex={-1}
                >
                  {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-neutral-textTertiary">
                Admin-controlled override: Changes password directly or dispatches reset token.
              </p>
            </div>
          </div>
        ) : (
          /* Reset Success View */
          <div className="space-y-4 p-0.5 animate-fadeIn">
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1 text-xs">
              <span className="font-bold flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Password Reset Successfully
              </span>
              <p className="text-[11px] text-emerald-700 leading-snug">
                The password for {resetModal.member?.name} has been updated. Provide the new password below so they can log in.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#ECEEF0]/80 border border-neutral-border space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between pb-1 border-b border-neutral-border/60">
                <span className="text-neutral-500 font-sans text-[11px]">Member:</span>
                <strong className="text-neutral-800 font-sans">{resetModal.member?.name}</strong>
              </div>
              <div className="flex items-center justify-between pb-1 border-b border-neutral-border/60">
                <span className="text-neutral-500 font-sans text-[11px]">Email:</span>
                <span className="text-neutral-700">{resetModal.member?.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 font-sans text-[11px]">New Password:</span>
                <span className="font-bold text-neutral-900 bg-white px-2 py-0.5 rounded border border-neutral-border">
                  {resetPasswordVal}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleCopyCredentials(resetModal.member?.name, resetModal.member?.email, resetPasswordVal, setCopiedReset)}
              className="w-full py-2.5 px-4 rounded-xl bg-[#1E1E1E] hover:bg-black text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 active-scale transition-all cursor-pointer"
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
