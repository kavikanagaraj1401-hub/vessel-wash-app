import React, { useState } from 'react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Sun, Moon, Calendar, ArrowUpRight, Search } from 'lucide-react';
import { getTodayDateStr } from '../logic/dateUtils';

export function RotationScreen({
  computedDays = [],
  todayDateStr = getTodayDateStr(),
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
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#ECBD56]">
          Rotation Schedule
        </span>
        <h2 className="text-xl font-bold tracking-tight text-[#111216] dark:text-[#F7F6F3]">
          Continuous Schedule
        </h2>
        <p className="text-xs text-[#111216]/60 dark:text-[#F7F6F3]/60 mt-0.5">
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
          className="w-full h-10 px-4 pl-9 text-xs bg-white dark:bg-[#171F2C] rounded-full border border-[#DDD9D0] dark:border-[#2A364B] text-[#111216] dark:text-[#F7F6F3] placeholder:text-[#111216]/40 dark:placeholder:text-[#F7F6F3]/40 outline-none focus:border-[#ECBD56] focus:ring-2 focus:ring-[#ECBD56]/20 shadow-2xs transition-colors"
        />
        <Search className="w-4 h-4 text-[#111216]/40 dark:text-[#F7F6F3]/40 absolute left-3.5 top-3 pointer-events-none" />
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
              className={`transition-all ${isToday ? 'ring-2 ring-[#ECBD56]/50 border-[#ECBD56]' : ''}`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#DDD9D0]/60 dark:border-[#2A364B]/60">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-2xs ${
                      isToday
                        ? 'bg-[#ECBD56] text-[#111216]'
                        : 'bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#111216] dark:text-[#F7F6F3]'
                    }`}
                  >
                    {day.dayNumber}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3]">
                      {day.dayOfWeek}, {day.date}
                    </span>
                    {isToday && (
                      <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ECBD56]/20 text-[#ECBD56] border border-[#ECBD56]/40">
                        Today
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-[11px] font-medium text-[#111216]/50 dark:text-[#F7F6F3]/50">
                  {isPast ? 'Past' : isToday ? 'Current' : 'Upcoming'}
                </div>
              </div>

              {/* Slot Assignments */}
              <div className="space-y-2">
                {/* Lunch Row */}
                {day.lunchProvided ? (
                  <div className="flex items-start justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-[#111216]/70 dark:text-[#F7F6F3]/70 pt-0.5">
                      <Sun className="w-3.5 h-3.5 text-[#E0851A] dark:text-[#FF9F45] flex-shrink-0" />
                      <span className="font-medium">Lunch:</span>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {isFuture ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#111216]/40 dark:text-[#F7F6F3]/40 italic text-[11px]">
                            — (Assigned on that day)
                          </span>
                        </div>
                      ) : (
                        lunchSlots.map(slot => {
                          const log = logMap.get(slot.id);
                          return (
                            <div key={slot.id} className="flex items-center gap-1.5">
                              <span className="font-semibold text-[#111216] dark:text-[#F7F6F3]">
                                {slot.assignedMemberName || '-'}
                              </span>
                              {slot.slotIndex === 2 && (
                                <span className="text-[10px] text-[#111216]/50 dark:text-[#F7F6F3]/50">(#2)</span>
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
                  <div className="flex items-center justify-between text-xs text-[#111216]/40 dark:text-[#F7F6F3]/40">
                    <div className="flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-[#111216]/40 dark:text-[#F7F6F3]/40 flex-shrink-0" />
                      <span>Lunch:</span>
                    </div>
                    <span>No meal</span>
                  </div>
                )}

                {/* Dinner Row */}
                {day.dinnerProvided ? (
                  <div className="flex items-start justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-[#111216]/70 dark:text-[#F7F6F3]/70 pt-0.5">
                      <Moon className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#BFB4FF] flex-shrink-0" />
                      <span className="font-medium">Dinner:</span>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {isFuture ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#111216]/40 dark:text-[#F7F6F3]/40 italic text-[11px]">
                            — (Assigned on that day)
                          </span>
                        </div>
                      ) : (
                        dinnerSlots.map(slot => {
                          const log = logMap.get(slot.id);
                          return (
                            <div key={slot.id} className="flex items-center gap-1.5">
                              <span className="font-semibold text-[#111216] dark:text-[#F7F6F3]">
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
                  <div className="flex items-center justify-between text-xs text-[#111216]/40 dark:text-[#F7F6F3]/40">
                    <div className="flex items-center gap-1.5">
                      <Moon className="w-3.5 h-3.5 text-[#111216]/40 dark:text-[#F7F6F3]/40 flex-shrink-0" />
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
