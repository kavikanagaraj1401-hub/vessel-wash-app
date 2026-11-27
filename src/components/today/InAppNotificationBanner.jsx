import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  Volume2,
  Sparkles,
} from 'lucide-react';
import { notificationService, getISTDate } from '../../services/notificationService';
import { getTodayDateStr } from '../../logic/dateUtils';

export function InAppNotificationBanner({ onTriggerAlert }) {
  const [permission, setPermission] = useState('default');
  const [activeAlert, setActiveAlert] = useState(null);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [timeStage, setTimeStage] = useState('before_11'); // 'before_11' | 'between_11_1130' | 'after_1130'

  useEffect(() => {
    setPermission(notificationService.getPermissionStatus());

    // Update time and stage every 5 seconds
    const updateTimeStage = () => {
      const ist = getISTDate();
      const hours = ist.getHours();
      const minutes = ist.getMinutes();

      setCurrentTimeStr(
        ist.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );

      const totalMinutes = hours * 60 + minutes;
      const min1100 = 11 * 60;
      const min1130 = 11 * 60 + 30;

      if (totalMinutes < min1100) {
        setTimeStage('before_11');
      } else if (totalMinutes >= min1100 && totalMinutes < min1130) {
        setTimeStage('between_11_1130');
      } else {
        setTimeStage('after_1130');
      }

      // Check scheduled push
      const triggered = notificationService.checkScheduledReminders(getTodayDateStr());
      if (triggered) {
        setActiveAlert(triggered);
      }
    };

    updateTimeStage();
    const interval = setInterval(updateTimeStage, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRequestPermission = async () => {
    const res = await notificationService.requestPermission();
    setPermission(res);
  };

  const handleTest1100 = () => {
    const alert = notificationService.trigger1100Reminder(true);
    setActiveAlert(alert);
    if (onTriggerAlert) onTriggerAlert(alert);
  };

  const handleTest1130 = () => {
    const alert = notificationService.trigger1130Reminder(true);
    setActiveAlert(alert);
    if (onTriggerAlert) onTriggerAlert(alert);
  };

  return (
    <div className="space-y-2 font-sans">
      {/* 1. In-App Pop-up Toast Alert (when alert fires or is tested) */}
      {activeAlert && (
        <div className="p-3.5 rounded-[20px] bg-[#141518] text-[#F5F5F7] shadow-lg border border-white/[0.12] animate-in fade-in slide-in-from-top duration-300 relative">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/10 text-white flex items-center justify-center flex-shrink-0 mt-0.5 border border-white/10">
                <BellRing className="w-4 h-4 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white text-[#0B0C0E]">
                    {activeAlert.time}
                  </span>
                  <h4 className="text-xs font-bold text-[#F5F5F7]">
                    {activeAlert.title}
                  </h4>
                </div>
                <p className="text-xs text-[#8E8E93] mt-1 leading-relaxed">
                  {activeAlert.body}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveAlert(null)}
              className="text-[#8E8E93] hover:text-[#F5F5F7] p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Sleek Notification Banner Bar */}
      <div className="rounded-[20px] border border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-[#141518] p-3 shadow-2xs transition-all">
        <div className="flex items-center justify-between gap-2">
          {/* Status Indicator */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-black/5 dark:bg-white/10 text-[#111214] dark:text-[#F5F5F7] flex items-center justify-center flex-shrink-0 border border-black/[0.05] dark:border-white/[0.05]">
              {timeStage === 'between_11_1130' ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <Clock className="w-4 h-4" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-[#111214] dark:text-[#F5F5F7] truncate">
                  {timeStage === 'between_11_1130'
                    ? '11:00 AM Active Reminder'
                    : timeStage === 'before_11'
                    ? '11:00 & 11:30 AM Reminders'
                    : '11:30 AM Cutoff Passed'}
                </span>
                <span className="text-[10px] font-semibold tabular-nums px-2 py-0.5 rounded-full bg-[#F5F5F7] dark:bg-[#1C1D21] text-[#6E6E73] dark:text-[#8E8E93] border border-black/[0.07] dark:border-white/[0.08]">
                  {currentTimeStr}
                </span>
              </div>
              <p className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] truncate mt-0.5">
                {timeStage === 'between_11_1130'
                  ? 'Mark lunch eaters before 11:30 AM cutoff!'
                  : 'Automated push alerts sent at 11:00 & 11:30 AM'}
              </p>
            </div>
          </div>

          {/* Push Permission Toggle / Indicator */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {permission === 'granted' ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#111214] dark:text-[#F5F5F7] bg-black/5 dark:bg-white/10 px-2.5 py-1 rounded-full border border-black/[0.07] dark:border-white/[0.08]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Push ON</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleRequestPermission}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-white dark:text-[#0B0C0E] bg-[#111214] dark:bg-white hover:bg-black dark:hover:bg-neutral-200 px-2.5 py-1 rounded-full shadow-2xs transition-all active-scale cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Enable Push</span>
              </button>
            )}
          </div>
        </div>

        {/* Test Buttons Row */}
        <div className="mt-2.5 pt-2.5 border-t border-black/[0.05] dark:border-white/[0.05] flex items-center justify-between text-xs">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#6E6E73] dark:text-[#8E8E93]">
            Test Reminders:
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTest1100}
              className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#F5F5F7] dark:bg-[#1C1D21] text-[#111214] dark:text-[#F5F5F7] border border-black/[0.07] dark:border-white/[0.08] hover:border-black/30 dark:hover:border-white/30 transition-colors active-scale cursor-pointer"
            >
              Test 11:00 AM
            </button>
            <button
              type="button"
              onClick={handleTest1130}
              className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#F5F5F7] dark:bg-[#1C1D21] text-[#111214] dark:text-[#F5F5F7] border border-black/[0.07] dark:border-white/[0.08] hover:border-black/30 dark:hover:border-white/30 transition-colors active-scale cursor-pointer"
            >
              Test 11:30 AM
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
