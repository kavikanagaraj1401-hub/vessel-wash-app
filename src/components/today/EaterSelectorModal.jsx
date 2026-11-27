import React from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Check, Utensils } from 'lucide-react';

export function EaterSelectorModal({
  isOpen,
  onClose,
  mealName = 'Lunch',
  activeMembers = [],
  selectedEaterIds = [],
  onSaveEaters,
}) {
  const [eaterSet, setEaterSet] = React.useState(new Set(selectedEaterIds));

  React.useEffect(() => {
    setEaterSet(new Set(selectedEaterIds));
  }, [selectedEaterIds, isOpen]);

  const toggleEater = (id) => {
    const next = new Set(eaterSet);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setEaterSet(next);
  };

  const selectAll = () => {
    setEaterSet(new Set(activeMembers.map(m => m.id)));
  };

  const clearAll = () => {
    setEaterSet(new Set());
  };

  const handleSave = () => {
    onSaveEaters(Array.from(eaterSet));
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Who ate ${mealName}?`}
      subtitle="Only members who ate are eligible to wash vessels for this meal."
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave}>
            Apply Eaters ({eaterSet.size})
          </Button>
        </>
      }
    >
      <div className="space-y-3 font-sans">
        <div className="flex items-center justify-between pb-2 border-b border-black/[0.07] dark:border-white/[0.08]">
          <span className="text-xs font-semibold tabular-nums text-[#6E6E73] dark:text-[#8E8E93]">
            {eaterSet.size} of {activeMembers.length} attending
          </span>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="text-xs font-bold text-[#111214] dark:text-[#F5F5F7] hover:underline cursor-pointer"
            >
              All Ate
            </button>
            <span className="text-black/20 dark:text-white/20">|</span>
            <button
              onClick={clearAll}
              className="text-xs font-medium text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#111214] dark:hover:text-[#F5F5F7] cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
          {activeMembers.map(member => {
            const isEater = eaterSet.has(member.id);
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => toggleEater(member.id)}
                className={`flex items-center justify-between p-3 rounded-[16px] border text-left transition-all active-scale cursor-pointer ${
                  isEater
                    ? 'bg-black/5 dark:bg-white/10 border-black/20 dark:border-white/20 text-[#111214] dark:text-[#F5F5F7] font-semibold'
                    : 'bg-white dark:bg-[#141518] border-black/[0.07] dark:border-white/[0.08] text-[#6E6E73] dark:text-[#8E8E93]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      isEater
                        ? 'bg-[#111214] text-white dark:bg-white dark:text-[#0B0C0E]'
                        : 'bg-[#F5F5F7] dark:bg-[#1C1D21] text-[#6E6E73] dark:text-[#8E8E93]'
                    }`}
                  >
                    {member.code}
                  </div>
                  <span className="text-sm font-medium">{member.name}</span>
                </div>
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                    isEater
                      ? 'bg-[#111214] border-[#111214] text-white dark:bg-white dark:border-white dark:text-[#0B0C0E]'
                      : 'border-black/20 dark:border-white/20 bg-[#F5F5F7] dark:bg-[#1C1D21]'
                  }`}
                >
                  {isEater && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
