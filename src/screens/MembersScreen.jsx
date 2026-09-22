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
} from 'lucide-react';

export function MembersScreen({
  members = [],
  queue = [],
  attendanceLogs = [],
  isAdmin = false,
  onAddMember,
  onEditMember,
  onToggleMemberStatus,
}) {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModal, setEditModal] = useState({ isOpen: false, member: null });
  const [deactivateModal, setDeactivateModal] = useState({ isOpen: false, member: null });

  // Form states
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [formError, setFormError] = useState('');

  // Edit form state
  const [editName, setEditName] = useState('');
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
    setEditModal({ isOpen: false, member: null });
  };

  const handleConfirmDeactivate = () => {
    if (!deactivateModal.member) return;
    onToggleMemberStatus(deactivateModal.member.id);
    setDeactivateModal({ isOpen: false, member: null });
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
          <p className="text-xs text-neutral-textSecondary mt-0.5">
            {activeCount} active in current rotation queue
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
              <strong>Admin Access Only:</strong> Member editing and additions are restricted to <strong>Kavipriyan (Admin)</strong>.
            </span>
          </div>
        </div>
      )}

      {/* Member List */}
      <div className="space-y-2.5">
        {members.map((member) => {
          const isActive = member.status === 'active';
          const isMemberAdmin = member.id === 'm1';
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
                      isMemberAdmin
                        ? 'bg-[#A28EF9] text-[#1E1E1E] ring-2 ring-[#A28EF9]/40'
                        : isActive
                        ? 'bg-[#A4F5A6]/35 text-[#1E1E1E] border border-[#A4F5A6]/40'
                        : 'bg-[#ECEEF0] text-neutral-textTertiary border border-neutral-border'
                    }`}
                  >
                    {isMemberAdmin ? '👑' : member.code}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-neutral-textPrimary">
                        {member.name}
                      </h4>
                      {isMemberAdmin && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#A28EF9]/20 text-[#2C1885] border border-[#A28EF9]/40 inline-flex items-center gap-0.5">
                          Admin
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
                  </div>
                </div>

                {/* Member action buttons: enabled only for Admin */}
                {isAdmin ? (
                  <div className="flex items-center gap-1">
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
    </div>
  );
}
