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
        <div className="p-3 rounded-xl bg-amber-500 text-white shadow-lg border border-amber-400 animate-in fade-in slide-in-from-top duration-300 relative">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <BellRing className="w-4 h-4 text-white animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-white/20 text-white">
                    {activeAlert.time}
                  </span>
                  <h4 className="text-xs font-bold text-white">
                    {activeAlert.title}
                  </h4>
                </div>
                <p className="text-xs text-white/95 mt-1 leading-relaxed">
                  {activeAlert.body}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveAlert(null)}
              className="text-white/80 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Sleek Notification Banner Bar */}
      <div className="rounded-xl border border-neutral-border bg-white p-2.5 shadow-xs transition-all">
        <div className="flex items-center justify-between gap-2">
          {/* Status Indicator */}
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                timeStage === 'between_11_1130'
                  ? 'bg-amber-50 text-amber-600 border border-amber-200 animate-pulse'
                  : 'bg-primary-light text-primary border border-primary-100'
              }`}
            >
              {timeStage === 'between_11_1130' ? (
                <AlertTriangle className="w-3.5 h-3.5" />
              ) : (
                <Clock className="w-3.5 h-3.5" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-neutral-textPrimary truncate">
                  {timeStage === 'between_11_1130'
                    ? '11:00 AM Active Reminder'
                    : timeStage === 'before_11'
                    ? '11:00 & 11:30 AM Reminders'
                    : '11:30 AM Cutoff Passed'}
                </span>
                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-textTertiary">
                  IST {currentTimeStr}
                </span>
              </div>
              <p className="text-[10px] text-neutral-textSecondary truncate">
                {timeStage === 'between_11_1130'
                  ? 'Mark lunch eaters before 11:30 AM cutoff!'
                  : 'Automated push alerts sent at 11:00 & 11:30 AM'}
              </p>
            </div>
          </div>

          {/* Push Permission Toggle / Indicator */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {permission === 'granted' ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-status-success bg-status-successBg px-2 py-1 rounded-lg border border-status-successBorder">
                <CheckCircle2 className="w-3 h-3" />
                <span>Push ON</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleRequestPermission}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary-light px-2 py-1 rounded-lg border border-primary-100 hover:bg-primary/20 transition-all active-scale"
              >
                <Bell className="w-3 h-3" />
                <span>Enable Push</span>
              </button>
            )}
          </div>
        </div>

        {/* Test Buttons Row */}
        <div className="mt-2 pt-2 border-t border-neutral-border/60 flex items-center justify-between text-[11px]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-textTertiary">
            Test Push Reminders:
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleTest1100}
              className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors active-scale"
            >
              Test 11:00 AM
            </button>
            <button
              type="button"
              onClick={handleTest1130}
              className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors active-scale"
            >
              Test 11:30 AM
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
