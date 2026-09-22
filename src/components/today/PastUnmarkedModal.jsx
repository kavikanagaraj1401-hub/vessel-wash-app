import React from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Calendar, CheckCircle2, XCircle, AlertCircle, Sun, Moon } from 'lucide-react';

export function PastUnmarkedModal({
  isOpen,
  onClose,
  unmarkedSlots = [],
  onMarkSlot,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Past Unmarked Attendance"
      subtitle="The following past dates require attendance verification."
      footer={
        <Button variant="secondary" size="sm" onClick={onClose}>
          Close
        </Button>
      }
    >
      {unmarkedSlots.length === 0 ? (
        <div className="text-center py-6">
          <CheckCircle2 className="w-8 h-8 text-status-success mx-auto mb-2" />
          <p className="text-xs font-semibold text-neutral-textPrimary">All past dates up to date!</p>
          <p className="text-[11px] text-neutral-textSecondary mt-0.5">No pending attendance from previous days.</p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {unmarkedSlots.map((slot) => {
            return (
              <div
                key={slot.id}
                className="p-3 rounded-xl border border-neutral-border bg-neutral-surfaceSecondary/50 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-textPrimary">
                    <Calendar className="w-3.5 h-3.5 text-neutral-textTertiary" />
                    <span>{slot.date}</span>
                    <span className="text-neutral-border">&middot;</span>
                    <span className="capitalize flex items-center gap-1 text-neutral-textSecondary">
                      {slot.meal === 'lunch' ? <Sun className="w-3 h-3 text-amber-500" /> : <Moon className="w-3 h-3 text-indigo-500" />}
                      {slot.meal} {slot.slotIndex === 2 ? '#2' : ''}
                    </span>
                  </div>
                  <Badge variant="pending" size="sm">Unmarked</Badge>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[11px] text-neutral-textTertiary block">Assigned Washer</span>
                    <span className="text-sm font-bold text-neutral-textPrimary">{slot.assignedMemberName}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onMarkSlot(slot, 'present')}
                    >
                      Present
                    </Button>
                    <Button
                      variant="outlineDestructive"
                      size="sm"
                      onClick={() => onMarkSlot(slot, 'absent')}
                    >
                      Absent
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
