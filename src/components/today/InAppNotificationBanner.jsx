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
      const triggered = notificationService.checkScheduledReminders('2026-09-18');
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
    <div className="space-y-2">
      {/* 1. In-App Pop-up Toast Alert (when alert fires or is tested) */}
      {activeAlert && (
        <div className="p-3.5 rounded-2xl bg-[#111216] dark:bg-[#171F2C] text-[#F7F6F3] shadow-lg border border-[#ECBD56]/80 animate-in fade-in slide-in-from-top duration-300 relative">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#ECBD56]/20 text-[#ECBD56] flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#ECBD56]/30">
                <BellRing className="w-4 h-4 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#ECBD56] text-[#111216]">
                    {activeAlert.time}
                  </span>
                  <h4 className="text-xs font-bold text-[#F7F6F3]">
                    {activeAlert.title}
                  </h4>
                </div>
                <p className="text-xs text-[#F7F6F3]/80 mt-1 leading-relaxed">
                  {activeAlert.body}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveAlert(null)}
              className="text-[#F7F6F3]/60 hover:text-[#F7F6F3] p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Sleek Notification Banner Bar */}
      <div className="rounded-2xl border border-[#DDD9D0] dark:border-[#2A364B] bg-white dark:bg-[#171F2C] p-3 shadow-2xs transition-all">
        <div className="flex items-center justify-between gap-2">
          {/* Status Indicator */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                timeStage === 'between_11_1130'
                  ? 'bg-[#E0851A]/10 text-[#E0851A] dark:text-[#FF9F45] border border-[#E0851A]/30 animate-pulse'
                  : 'bg-[#ECBD56]/15 text-[#111216] dark:text-[#ECBD56] border border-[#ECBD56]/30'
              }`}
            >
              {timeStage === 'between_11_1130' ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <Clock className="w-4 h-4" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-[#111216] dark:text-[#F7F6F3] truncate">
                  {timeStage === 'between_11_1130'
                    ? '11:00 AM Active Reminder'
                    : timeStage === 'before_11'
                    ? '11:00 & 11:30 AM Reminders'
                    : '11:30 AM Cutoff Passed'}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#4E525D] dark:text-[#9BA5B7] border border-[#DDD9D0] dark:border-[#2A364B]">
                  IST {currentTimeStr}
                </span>
              </div>
              <p className="text-[11px] text-[#4E525D] dark:text-[#9BA5B7] truncate mt-0.5">
                {timeStage === 'between_11_1130'
                  ? 'Mark lunch eaters before 11:30 AM cutoff!'
                  : 'Automated push alerts sent at 11:00 & 11:30 AM'}
              </p>
            </div>
          </div>

          {/* Push Permission Toggle / Indicator */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {permission === 'granted' ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#22AC77] dark:text-[#4ADE80] bg-[#22AC77]/10 dark:bg-[#4ADE80]/15 px-2.5 py-1 rounded-full border border-[#22AC77]/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Push ON</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleRequestPermission}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#111216] bg-[#ECBD56] hover:bg-[#DEAA3E] px-2.5 py-1 rounded-full shadow-2xs transition-all active-scale cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Enable Push</span>
              </button>
            )}
          </div>
        </div>

        {/* Test Buttons Row */}
        <div className="mt-2.5 pt-2.5 border-t border-[#DDD9D0]/60 dark:border-[#2A364B]/60 flex items-center justify-between text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#4E525D] dark:text-[#9BA5B7]">
            Test Reminders:
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTest1100}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#111216] dark:text-[#F7F6F3] border border-[#DDD9D0] dark:border-[#2A364B] hover:border-[#ECBD56] transition-colors active-scale cursor-pointer"
            >
              Test 11:00 AM
            </button>
            <button
              type="button"
              onClick={handleTest1130}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#F2F1ED] dark:bg-[#1F2A3C] text-[#111216] dark:text-[#F7F6F3] border border-[#DDD9D0] dark:border-[#2A364B] hover:border-[#ECBD56] transition-colors active-scale cursor-pointer"
            >
              Test 11:30 AM
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
