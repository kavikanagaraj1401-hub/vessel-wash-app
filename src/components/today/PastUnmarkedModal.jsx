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
        <div className="text-center py-6 font-sans">
          <CheckCircle2 className="w-8 h-8 text-current mx-auto mb-2" />
          <p className="text-xs font-bold text-[#111214] dark:text-[#F5F5F7]">All past dates up to date!</p>
          <p className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">No pending attendance from previous days.</p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 font-sans">
          {unmarkedSlots.map((slot) => {
            return (
              <div
                key={slot.id}
                className="p-3.5 rounded-[16px] border border-black/[0.07] dark:border-white/[0.08] bg-[#F5F5F7] dark:bg-[#1C1D21] flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#111214] dark:text-[#F5F5F7]">
                    <Calendar className="w-3.5 h-3.5 text-current" />
                    <span className="tabular-nums">{slot.date}</span>
                    <span className="text-black/20 dark:text-white/20">&middot;</span>
                    <span className="capitalize flex items-center gap-1 text-[#6E6E73] dark:text-[#8E8E93]">
                      {slot.meal === 'lunch' ? <Sun className="w-3 h-3 text-current" /> : <Moon className="w-3 h-3 text-current" />}
                      {slot.meal} {slot.slotIndex === 2 ? '#2' : ''}
                    </span>
                  </div>
                  <Badge variant="pending" size="sm">Unmarked</Badge>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] block">Assigned Washer</span>
                    <span className="text-sm font-bold text-[#111214] dark:text-[#F5F5F7]">{slot.assignedMemberName}</span>
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
                      variant="secondary"
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
