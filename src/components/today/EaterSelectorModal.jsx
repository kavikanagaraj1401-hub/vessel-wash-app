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
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#DDD9D0] dark:border-[#2A364B]">
          <span className="text-xs font-medium text-[#4E525D] dark:text-[#9BA5B7]">
            {eaterSet.size} of {activeMembers.length} attending
          </span>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="text-xs font-bold text-[#ECBD56] hover:underline cursor-pointer"
            >
              All Ate
            </button>
            <span className="text-[#DDD9D0] dark:text-[#2A364B]">|</span>
            <button
              onClick={clearAll}
              className="text-xs font-semibold text-[#111216]/60 dark:text-[#F7F6F3]/60 hover:text-[#111216] dark:hover:text-[#F7F6F3] cursor-pointer"
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
                className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all active-scale cursor-pointer ${
                  isEater
                    ? 'bg-[#ECBD56]/15 border-[#ECBD56] text-[#111216] dark:text-[#F7F6F3] font-semibold'
                    : 'bg-white dark:bg-[#171F2C] border-[#DDD9D0] dark:border-[#2A364B] text-[#4E525D] dark:text-[#9BA5B7]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      isEater
                        ? 'bg-[#ECBD56] text-[#111216]'
                        : 'bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#111216]/60 dark:text-[#F7F6F3]/60'
                    }`}
                  >
                    {member.code}
                  </div>
                  <span className="text-sm font-medium">{member.name}</span>
                </div>
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                    isEater
                      ? 'bg-[#ECBD56] border-[#ECBD56] text-[#111216]'
                      : 'border-[#DDD9D0] dark:border-[#2A364B] bg-[#F2F1ED] dark:bg-[#1F2A3C]'
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
