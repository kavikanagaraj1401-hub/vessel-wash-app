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
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#F2F1ED] dark:bg-[#1F2A3C] border border-[#DDD9D0] dark:border-[#2A364B]">
          {isAbsent ? (
            <AlertTriangle className="w-5 h-5 text-[#E0851A] dark:text-[#FF9F45] flex-shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-[#22AC77] dark:text-[#4ADE80] flex-shrink-0 mt-0.5" />
          )}
          <div className="text-xs">
            <p className="font-bold text-[#111216] dark:text-[#F7F6F3] text-sm mb-0.5">
              {memberName} &middot; {slotTitle}
            </p>
            {isAbsent ? (
              <p className="text-[#4E525D] dark:text-[#9BA5B7] leading-relaxed">
                Marking <strong className="text-[#111216] dark:text-[#F7F6F3]">{memberName}</strong> as absent will keep their place at the front of the queue for the next meal they attend.
              </p>
            ) : (
              <p className="text-[#4E525D] dark:text-[#9BA5B7] leading-relaxed">
                Confirming that <strong className="text-[#111216] dark:text-[#F7F6F3]">{memberName}</strong> has washed the vessels. They will move to the back of the queue.
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
