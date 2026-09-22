import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { TextInput } from '../common/Inputs';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export function AttendanceConfirmModal({
  isOpen,
  onClose,
  type = 'absent', // 'absent' | 'present'
  memberName = '',
  slotTitle = '',
  onConfirm,
}) {
  const [remarks, setRemarks] = useState('');

  const handleConfirm = () => {
    onConfirm(remarks);
    setRemarks('');
    onClose();
  };

  const isAbsent = type === 'absent';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAbsent ? 'Confirm Washer Absence' : 'Mark Attendance'}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={isAbsent ? 'destructive' : 'success'}
            size="sm"
            onClick={handleConfirm}
          >
            {isAbsent ? 'Confirm Absent' : 'Confirm Present'}
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-neutral-surfaceSecondary border border-neutral-border">
          {isAbsent ? (
            <AlertTriangle className="w-5 h-5 text-status-warning flex-shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-status-success flex-shrink-0 mt-0.5" />
          )}
          <div className="text-xs">
            <p className="font-semibold text-neutral-textPrimary text-sm mb-0.5">
              {memberName} &middot; {slotTitle}
            </p>
            {isAbsent ? (
              <p className="text-neutral-textSecondary">
                Marking <strong className="text-neutral-textPrimary">{memberName}</strong> as absent will keep their place at the front of the queue for the next meal they attend.
              </p>
            ) : (
              <p className="text-neutral-textSecondary">
                Confirming that <strong className="text-neutral-textPrimary">{memberName}</strong> has washed the vessels. They will move to the back of the queue.
              </p>
            )}
          </div>
        </div>

        <TextInput
          label="Remarks (Optional)"
          placeholder={isAbsent ? "e.g. Swapped slot, On leave, Vessel washed by stand-in" : "e.g. Heavy lunch vessels, Cleaned sink"}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />
      </div>
    </Modal>
  );
}
