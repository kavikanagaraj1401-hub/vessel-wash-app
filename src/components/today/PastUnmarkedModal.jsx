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
          <CheckCircle2 className="w-8 h-8 text-[#22AC77] dark:text-[#4ADE80] mx-auto mb-2" />
          <p className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3]">All past dates up to date!</p>
          <p className="text-[11px] text-[#4E525D] dark:text-[#9BA5B7] mt-0.5">No pending attendance from previous days.</p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {unmarkedSlots.map((slot) => {
            return (
              <div
                key={slot.id}
                className="p-3.5 rounded-xl border border-[#DDD9D0] dark:border-[#2A364B] bg-[#F2F1ED] dark:bg-[#1F2A3C] flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#111216] dark:text-[#F7F6F3]">
                    <Calendar className="w-3.5 h-3.5 text-[#ECBD56]" />
                    <span>{slot.date}</span>
                    <span className="text-[#DDD9D0] dark:text-[#2A364B]">&middot;</span>
                    <span className="capitalize flex items-center gap-1 text-[#4E525D] dark:text-[#9BA5B7]">
                      {slot.meal === 'lunch' ? <Sun className="w-3 h-3 text-[#E0851A] dark:text-[#FF9F45]" /> : <Moon className="w-3 h-3 text-[#2563EB] dark:text-[#BFB4FF]" />}
                      {slot.meal} {slot.slotIndex === 2 ? '#2' : ''}
                    </span>
                  </div>
                  <Badge variant="pending" size="sm">Unmarked</Badge>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[11px] text-[#4E525D] dark:text-[#9BA5B7] block">Assigned Washer</span>
                    <span className="text-sm font-bold text-[#111216] dark:text-[#F7F6F3]">{slot.assignedMemberName}</span>
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
                      variant="destructive"
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
