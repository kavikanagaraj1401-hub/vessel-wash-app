import React, { useState } from 'react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Sun, Moon, Calendar, ArrowUpRight, Search } from 'lucide-react';

export function RotationScreen({
  computedDays = [],
  todayDateStr = '2026-09-21',
  attendanceLogs = [],
  onSelectDay,
}) {
  const [filterQuery, setFilterQuery] = useState('');

  // Find attendance for any slot
  const logMap = new Map(attendanceLogs.map(log => [log.slotId, log]));

  const filteredDays = computedDays.filter(day => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    const matchesDate = day.date.toLowerCase().includes(q) || day.dayOfWeek.toLowerCase().includes(q);
    const matchesMember = day.slots?.some(s => s.assignedMemberName?.toLowerCase().includes(q));
    return matchesDate || matchesMember;
  });

  return (
    <div className="space-y-4 pb-24 px-4 pt-3">
      {/* Header */}
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#7D64F6]">
          Rotation Schedule
        </span>
        <h2 className="text-xl font-bold tracking-tight text-neutral-textPrimary">
          Continuous Schedule
        </h2>
        <p className="text-xs text-neutral-textSecondary mt-0.5">
          Derived rotation sequence based on single shared FIFO queue across all dates
        </p>
      </div>

      {/* Quick Search */}
      <div className="relative">
        <input
          type="text"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder="Filter by member or date..."
          className="w-full h-10 px-4 pl-9 text-xs bg-white rounded-full border border-neutral-border text-neutral-textPrimary placeholder:text-neutral-textTertiary outline-none focus:border-[#A28EF9] focus:ring-2 focus:ring-[#A28EF9]/20 shadow-2xs"
        />
        <Search className="w-4 h-4 text-neutral-textTertiary absolute left-3.5 top-3 pointer-events-none" />
      </div>

      {/* Rotation List */}
      <div className="space-y-2.5">
        {filteredDays.map((day) => {
          const isToday = day.date === todayDateStr;
          const isPast = day.date < todayDateStr;
          const isFuture = day.date > todayDateStr;

          const lunchSlots = (day.slots || []).filter(s => s.meal === 'lunch');
          const dinnerSlots = (day.slots || []).filter(s => s.meal === 'dinner');

          return (
            <Card
              key={day.date}
              highlight={isToday}
              padding="default"
              className={`transition-all ${isToday ? 'ring-2 ring-[#A28EF9]/40 border-[#A28EF9]' : ''}`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-neutral-border/60">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-2xs ${
                      isToday
                        ? 'bg-[#A28EF9] text-[#1E1E1E]'
                        : 'bg-[#ECEEF0] text-neutral-textSecondary'
                    }`}
                  >
                    {day.dayNumber}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-neutral-textPrimary">
                      {day.dayOfWeek}, {day.date}
                    </span>
                    {isToday && (
                      <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#A28EF9]/25 text-[#2C1885] border border-[#A28EF9]/40">
                        Today
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-[11px] font-medium text-neutral-textTertiary">
                  {isPast ? 'Past' : isToday ? 'Current' : 'Upcoming'}
                </div>
              </div>

              {/* Slot Assignments */}
              <div className="space-y-2">
                {/* Lunch Row */}
                {day.lunchProvided ? (
                  <div className="flex items-start justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-neutral-textSecondary pt-0.5">
                      <Sun className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      <span className="font-medium">Lunch:</span>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {isFuture ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-neutral-textTertiary italic text-[11px]">
                            — (Assigned on that day)
                          </span>
                        </div>
                      ) : (
                        lunchSlots.map(slot => {
                          const log = logMap.get(slot.id);
                          return (
                            <div key={slot.id} className="flex items-center gap-1.5">
                              <span className="font-semibold text-neutral-textPrimary">
                                {slot.assignedMemberName || '-'}
                              </span>
                              {slot.slotIndex === 2 && (
                                <span className="text-[10px] text-neutral-textTertiary">(#2)</span>
                              )}
                              {log ? (
                                <Badge variant={log.status} size="sm">
                                  {log.status}
                                </Badge>
                              ) : isToday ? (
                                <Badge variant="pending" size="sm">
                                  Due
                                </Badge>
                              ) : null}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs text-neutral-textTertiary">
                    <div className="flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-neutral-textTertiary flex-shrink-0" />
                      <span>Lunch:</span>
                    </div>
                    <span>No meal</span>
                  </div>
                )}

                {/* Dinner Row */}
                {day.dinnerProvided ? (
                  <div className="flex items-start justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-neutral-textSecondary pt-0.5">
                      <Moon className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                      <span className="font-medium">Dinner:</span>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {isFuture ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-neutral-textTertiary italic text-[11px]">
                            — (Assigned on that day)
                          </span>
                        </div>
                      ) : (
                        dinnerSlots.map(slot => {
                          const log = logMap.get(slot.id);
                          return (
                            <div key={slot.id} className="flex items-center gap-1.5">
                              <span className="font-semibold text-neutral-textPrimary">
                                {slot.assignedMemberName || '-'}
                              </span>
                              {log ? (
                                <Badge variant={log.status} size="sm">
                                  {log.status}
                                </Badge>
                              ) : isToday ? (
                                <Badge variant="pending" size="sm">
                                  Due
                                </Badge>
                              ) : null}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs text-neutral-textTertiary">
                    <div className="flex items-center gap-1.5">
                      <Moon className="w-3.5 h-3.5 text-neutral-textTertiary flex-shrink-0" />
                      <span>Dinner:</span>
                    </div>
                    <span>No meal</span>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
