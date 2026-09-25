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
} from 'lucide-react';

export function ActivityScreen({
  activityLogs = [],
  members = [],
  isAdmin = false,
  onClearLogs,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all'); // 'all' | 'attendance' | 'meal_status' | 'eaters' | 'member' | 'system'
  const [selectedActor, setSelectedActor] = useState('all');

  const categories = [
    { id: 'all', label: 'All Activity' },
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
      }) + ' IST';
    } catch (e) {
      return isoString;
    }
  };

  const getActionIcon = (log) => {
    if (log.actionType === 'MARK_WASHED' || log.actionType === 'MARK_ATTENDANCE_PRESENT') {
      return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    }
    if (log.actionType === 'MARK_NOT_WASHED' || log.actionType === 'MARK_ATTENDANCE_ABSENT') {
      return <XCircle className="w-4 h-4 text-rose-600" />;
    }
    if (log.category === 'meal_status') {
      return <UtensilsCrossed className="w-4 h-4 text-amber-600" />;
    }
    if (log.category === 'eaters') {
      return <Users className="w-4 h-4 text-blue-600" />;
    }
    if (log.category === 'member') {
      return <UserCheck className="w-4 h-4 text-[#ECBD56]" />;
    }
    return <Activity className="w-4 h-4 text-cyan-600" />;
  };

  const getActionBadgeVariant = (log) => {
    if (log.actionType === 'MARK_WASHED' || log.actionType === 'MARK_ATTENDANCE_PRESENT') {
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
    <div className="space-y-3.5 pb-24 px-4 pt-3 w-full max-w-full overflow-x-hidden">
      {/* 1. Header Banner */}
      <div className="flex items-center justify-between pb-1">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#ECBD56] flex items-center gap-1">
            <Activity className="w-3.5 h-3.5" />
            Audit Trail
          </span>
          <h2 className="text-xl font-bold tracking-tight text-[#111216] dark:text-[#F7F6F3]">
            User Activity History
          </h2>
          <p className="text-xs text-[#4E525D] dark:text-[#9BA5B7] mt-0.5">
            Chronological audit of duty marks, meal toggles, and member changes
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3] px-2.5 py-1 rounded-full bg-[#F2F1ED] dark:bg-[#1F2A3C] border border-[#DDD9D0] dark:border-[#2A364B]">
            {filteredLogs.length} Events
          </span>
          {isAdmin && onClearLogs && (
            <button
              type="button"
              onClick={onClearLogs}
              className="text-[10px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-0.5"
              title="Clear activity history (Admin only)"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Admin Info Notice */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-[#171F2C] border border-[#DDD9D0] dark:border-[#2A364B] flex items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full admin-gradient text-white border border-[#ECBD56]/80 flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-2xs">
            👑
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3] block truncate">
              Admin: Kavipriyan (Member 1)
            </span>
            <span className="text-[11px] text-[#111216]/60 dark:text-[#F7F6F3]/60 block truncate">
              Designated Admin with roster edit and management access.
            </span>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full admin-gradient text-white border border-[#ECBD56]/80 flex-shrink-0 flex items-center gap-1 shadow-2xs">
          <ShieldCheck className="w-3 h-3 text-[#ECBD56]" />
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
            className="w-full h-10 px-4 pl-9 text-xs bg-white dark:bg-[#171F2C] rounded-full border border-[#DDD9D0] dark:border-[#2A364B] text-[#111216] dark:text-[#F7F6F3] placeholder:text-[#111216]/40 dark:placeholder:text-[#F7F6F3]/40 outline-none focus:border-[#ECBD56] focus:ring-2 focus:ring-[#ECBD56]/20 shadow-2xs transition-colors"
          />
          <Search className="w-4 h-4 text-[#111216]/40 dark:text-[#F7F6F3]/40 absolute left-3 top-3 pointer-events-none" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-[11px] font-semibold text-[#111216]/50 dark:text-[#F7F6F3]/50 hover:text-[#111216] dark:hover:text-[#F7F6F3] absolute right-3.5 top-2.5"
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
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all select-none active-scale ${
                  isActive
                    ? 'bg-[#111216] dark:bg-[#ECBD56] text-[#F7F6F3] dark:text-[#111216] shadow-xs font-bold'
                    : 'bg-white dark:bg-[#171F2C] text-[#111216]/70 dark:text-[#F7F6F3]/70 border border-[#DDD9D0] dark:border-[#2A364B] hover:bg-[#F2F1ED] dark:hover:bg-[#1F2A3C]'
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
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-2xs ${
                        isActorAdmin
                          ? 'admin-gradient text-white border border-[#ECBD56]/80'
                          : 'bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#111216] dark:text-[#F7F6F3] border border-[#DDD9D0] dark:border-[#2A364B]'
                      }`}
                    >
                      {log.actorCode || 'M'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3] truncate">
                          {log.actorName || 'User'}
                        </span>
                        {isActorAdmin && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full admin-gradient text-white border border-[#ECBD56]/80 inline-flex items-center gap-0.5">
                            👑 Admin
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#111216]/50 dark:text-[#F7F6F3]/50 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                  </div>

                  <Badge variant={getActionBadgeVariant(log)} size="sm">
                    {log.title}
                  </Badge>
                </div>

                <div className="p-2.5 rounded-2xl bg-[#F2F1ED] dark:bg-[#1F2A3C] border border-[#DDD9D0]/60 dark:border-[#2A364B]/60 text-xs text-[#111216]/80 dark:text-[#F7F6F3]/80 flex items-start gap-2">
                  <div className="pt-0.5 flex-shrink-0">{getActionIcon(log)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[#111216] dark:text-[#F7F6F3] leading-snug">
                      {log.details}
                    </p>
                    {log.targetDate && (
                      <span className="text-[10px] font-semibold text-[#111216]/50 dark:text-[#F7F6F3]/50 inline-flex items-center gap-1 mt-1">
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
