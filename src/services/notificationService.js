/**
 * Push and In-App Notification Service for Vessel Washing App
 * Handles 11:00 AM and 11:30 AM IST attendance reminders.
 */

import { getTodayDateStr } from '../logic/dateUtils';

// Helper to get current IST time
export function getISTDate() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 5.5));
}

export const notificationService = {
  /**
   * Check if browser supports Web Notifications
   */
  isSupported() {
    return typeof window !== 'undefined' && 'Notification' in window;
  },

  /**
   * Get current permission status: 'default' | 'granted' | 'denied' | 'unsupported'
   */
  getPermissionStatus() {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  },

  /**
   * Request push notification permission
   */
  async requestPermission() {
    if (!this.isSupported()) return 'unsupported';
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (e) {
      console.warn('Error requesting notification permission:', e);
      return Notification.permission;
    }
  },

  /**
   * Send a browser push notification
   */
  sendPush(title, options = {}) {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      return false;
    }

    try {
      const notif = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [200, 100, 200],
        ...options,
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
      };

      return true;
    } catch (e) {
      console.warn('Failed to display push notification:', e);
      return false;
    }
  },

  /**
   * Trigger 11:00 AM Reminder (First alert before 11:30 cutoff)
   */
  trigger1100Reminder(isTest = false) {
    const title = isTest
      ? '🔔 [TEST] 11:00 AM Lunch Reminder'
      : '🔔 11:00 AM Vessel Washing Reminder';
    const body = 'Please mark who is eating lunch today before the 11:30 AM cutoff deadline!';

    this.sendPush(title, {
      body,
      tag: 'vw-1100-reminder',
      requireInteraction: true,
    });

    return {
      type: '1100_reminder',
      title,
      body,
      time: '11:00 AM IST',
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Trigger 11:30 AM Reminder (Cutoff deadline alert)
   */
  trigger1130Reminder(isTest = false) {
    const title = isTest
      ? '⏰ [TEST] 11:30 AM Cutoff Reached'
      : '⏰ 11:30 AM Cutoff Deadline Reached';
    const body = 'Lunch attendance is now closed! Confirm today’s eaters and vessel washer.';

    this.sendPush(title, {
      body,
      tag: 'vw-1130-cutoff',
      requireInteraction: true,
    });

    return {
      type: '1130_cutoff',
      title,
      body,
      time: '11:30 AM IST',
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Automatically check IST time and fire scheduled push reminders
   */
  checkScheduledReminders(todayDateStr = getTodayDateStr()) {
    const ist = getISTDate();
    const hours = ist.getHours();
    const minutes = ist.getMinutes();

    // Check 11:00 AM (Window: 11:00 - 11:05)
    const key1100 = `vw_notif_1100_${todayDateStr}`;
    if (hours === 11 && minutes >= 0 && minutes < 6) {
      if (!localStorage.getItem(key1100)) {
        localStorage.setItem(key1100, 'sent');
        return this.trigger1100Reminder(false);
      }
    }

    // Check 11:30 AM (Window: 11:30 - 11:35)
    const key1130 = `vw_notif_1130_${todayDateStr}`;
    if (hours === 11 && minutes >= 30 && minutes < 36) {
      if (!localStorage.getItem(key1130)) {
        localStorage.setItem(key1130, 'sent');
        return this.trigger1130Reminder(false);
      }
    }

    return null;
  },
};
