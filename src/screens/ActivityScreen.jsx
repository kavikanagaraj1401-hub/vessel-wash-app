import React, { useState, useMemo } from 'react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import {
  Activity,
  Search,
  CheckCircle2,
  XCircle,
  UtensilsCrossed,
  Users,
  UserCheck,
  ShieldCheck,
  Calendar,
  Clock,
  Trash2,
  Receipt,
} from 'lucide-react';

export function ActivityScreen({
  activityLogs = [],
  members = [],
  isAdmin = false,
  onClearLogs,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all'); // 'all' | 'attendance' | 'meal_status' | 'eaters' | 'member' | 'bill' | 'system'
  const [selectedActor, setSelectedActor] = useState('all');

  const categories = [
    { id: 'all', label: 'All Activity' },
    { id: 'bill', label: 'Bills & Expenses' },
    { id: 'attendance', label: 'Duty Marks' },
    { id: 'meal_status', label: 'Meal Availability' },
    { id: 'eaters', label: 'Eaters' },
    { id: 'member', label: 'Members' },
  ];

  const filteredLogs = useMemo(() => {
    return activityLogs
      .filter(log => {
        if (selectedCategory !== 'all' && log.category !== selectedCategory) {
          return false;
        }
        if (selectedActor !== 'all' && log.actorId !== selectedActor) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = (log.title || '').toLowerCase().includes(q);
          const matchDetails = (log.details || '').toLowerCase().includes(q);
          const matchActor = (log.actorName || '').toLowerCase().includes(q);
          const matchDate = (log.targetDate || '').toLowerCase().includes(q);
          return matchTitle || matchDetails || matchActor || matchDate;
        }
        return true;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [activityLogs, selectedCategory, selectedActor, searchQuery]);

  const formatTimestamp = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('en-US', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch (e) {
      return isoString;
    }
  };

  const getActionIcon = (log) => {
    if (log.actionType === 'MARK_WASHED' || log.actionType === 'MARK_ATTENDANCE_PRESENT') {
      return <CheckCircle2 className="w-4 h-4 text-current" />;
    }
    if (log.actionType === 'MARK_NOT_WASHED' || log.actionType === 'MARK_ATTENDANCE_ABSENT') {
      return <XCircle className="w-4 h-4 text-current" />;
    }
    if (log.category === 'meal_status') {
      return <UtensilsCrossed className="w-4 h-4 text-current" />;
    }
    if (log.category === 'eaters') {
      return <Users className="w-4 h-4 text-current" />;
    }
    if (log.category === 'member') {
      return <UserCheck className="w-4 h-4 text-current" />;
    }
    if (log.category === 'bill') {
      return <Receipt className="w-4 h-4 text-current" />;
    }
    return <Activity className="w-4 h-4 text-current" />;
  };

  const getActionBadgeVariant = (log) => {
    if (log.actionType === 'MARK_WASHED' || log.actionType === 'MARK_ATTENDANCE_PRESENT' || log.category === 'bill') {
      return 'completed';
    }
    if (log.actionType === 'MARK_NOT_WASHED' || log.actionType === 'MARK_ATTENDANCE_ABSENT') {
      return 'debt';
    }
    if (log.category === 'meal_status') {
      return 'active';
    }
    if (log.category === 'member') {
      return 'pending';
    }
    return 'neutral';
  };

  return (
    <div className="space-y-4 pb-24 px-4 pt-3 w-full max-w-full overflow-x-hidden font-sans">
      {/* 1. Top Editorial Header */}
      <div className="flex items-center justify-between pb-1">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#6E6E73] dark:text-[#8E8E93] flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            Audit Trail
          </span>
          <h2 className="text-2xl sm:text-[28px] font-semibold tracking-[-0.03em] text-[#111214] dark:text-[#F5F5F7] mt-0.5">
            User Activity History
          </h2>
          <p className="text-[13px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
            Chronological audit of duty marks, meal toggles, and member changes
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className="text-xs font-semibold tabular-nums text-[#111214] dark:text-[#F5F5F7] px-3 py-1 rounded-full bg-white dark:bg-[#141518] border border-black/[0.07] dark:border-white/[0.08] shadow-2xs">
            {filteredLogs.length} Events
          </span>
          {isAdmin && onClearLogs && (
            <button
              type="button"
              onClick={onClearLogs}
              className="text-[11px] font-medium text-[#6E6E73] hover:text-[#111214] dark:text-[#8E8E93] dark:hover:text-[#F5F5F7] flex items-center gap-1 cursor-pointer transition-colors"
              title="Clear activity history (Admin only)"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Admin Info Notice */}
      <div className="p-4 rounded-[20px] bg-white dark:bg-[#141518] border border-black/[0.07] dark:border-white/[0.08] flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-[#111214] text-white dark:bg-white dark:text-[#0B0C0E] flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs">
            👑
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-[#111214] dark:text-[#F5F5F7] block truncate">
              Admin: Kavipriyan (Primary Admin)
            </span>
            <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] block truncate">
              Designated Primary Admin with full roster edit and management authority.
            </span>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#111214] text-white dark:bg-white dark:text-[#0B0C0E] flex-shrink-0 flex items-center gap-1 shadow-2xs">
          <ShieldCheck className="w-3 h-3 text-current" />
          Admin Only
        </span>
      </div>

      {/* 3. Search & Filters */}
      <div className="space-y-2.5 w-full max-w-full overflow-hidden">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search activity by actor, action, date..."
            className="w-full h-10 px-4 pl-9 text-xs font-medium bg-[#F5F5F7] dark:bg-[#1C1D21] rounded-full border border-black/[0.07] dark:border-white/[0.08] text-[#111214] dark:text-[#F5F5F7] placeholder-[#8E8E93] outline-none focus:border-black dark:focus:border-white transition-colors"
          />
          <Search className="w-4 h-4 text-[#8E8E93] absolute left-3 top-3 pointer-events-none" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-[11px] font-medium text-[#6E6E73] hover:text-[#111214] dark:text-[#8E8E93] dark:hover:text-[#F5F5F7] absolute right-3.5 top-2.5 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar w-full max-w-full">
          {categories.map(cat => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap transition-all select-none active-scale cursor-pointer ${
                  isActive
                    ? 'bg-[#111214] text-white dark:bg-white dark:text-[#0B0C0E] shadow-xs font-bold'
                    : 'bg-white dark:bg-[#141518] text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#111214] dark:hover:text-[#F5F5F7] border border-black/[0.07] dark:border-white/[0.08] font-medium'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Activity Feed Timeline */}
      {filteredLogs.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No activity found"
          description="User actions (marking duties, toggling meals, editing members) will appear here in chronological order."
        />
      ) : (
        <div className="space-y-2.5">
          {filteredLogs.map(log => {
            const isActorAdmin = log.isAdmin || log.actorId === 'm1';

            return (
              <Card key={log.id} padding="default" className="space-y-2 transition-all hover:shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-2xs ${
                        isActorAdmin
                          ? 'bg-[#111214] text-white dark:bg-white dark:text-[#0B0C0E]'
                          : 'bg-[#F5F5F7] dark:bg-[#1C1D21] text-[#111214] dark:text-[#F5F5F7] border border-black/[0.07] dark:border-white/[0.08]'
                      }`}
                    >
                      {log.actorCode || 'M'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#111214] dark:text-[#F5F5F7] truncate">
                          {log.actorName || 'User'}
                        </span>
                        {isActorAdmin && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#111214] text-white dark:bg-white dark:text-[#0B0C0E] inline-flex items-center gap-0.5">
                            👑 Admin
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#6E6E73] dark:text-[#8E8E93] flex items-center gap-1 tabular-nums">
                        <Clock className="w-2.5 h-2.5" />
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                  </div>

                  <Badge variant={getActionBadgeVariant(log)} size="sm">
                    {log.title}
                  </Badge>
                </div>

                <div className="p-3 rounded-xl bg-[#F5F5F7] dark:bg-[#1C1D21] border border-black/[0.05] dark:border-white/[0.05] text-xs text-[#111214]/80 dark:text-[#F5F5F7]/80 flex items-start gap-2.5">
                  <div className="pt-0.5 flex-shrink-0 text-[#111214] dark:text-[#F5F5F7]">{getActionIcon(log)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[#111214] dark:text-[#F5F5F7] leading-snug">
                      {log.details}
                    </p>
                    {log.targetDate && (
                      <span className="text-[10px] font-medium tabular-nums text-[#6E6E73] dark:text-[#8E8E93] inline-flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        Target Date: {log.targetDate}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
