/**
 * Push and In-App Notification Service for Vessel Washing App
 * Handles 1-hour recurring push notifications plus 11:00 AM and 11:30 AM IST attendance reminders.
 */

import { getTodayDateStr } from '../logic/dateUtils';

const HOURLY_ENABLED_KEY = 'vw_hourly_notif_enabled';
const LAST_HOURLY_SENT_KEY = 'vw_last_hourly_notif_at';
export const HOURLY_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

let swRegistrationPromise = null;

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
   * Register the lightweight Service Worker so mobile browsers can show notifications
   */
  async registerServiceWorker() {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return null;
    }
    if (!swRegistrationPromise) {
      swRegistrationPromise = navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => {
          console.warn('Service worker registration skipped:', err?.message || err);
          return null;
        });
    }
    return swRegistrationPromise;
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
      await this.registerServiceWorker();
      const permission = await Notification.requestPermission();
      return permission;
    } catch (e) {
      console.warn('Error requesting notification permission:', e);
      return Notification.permission;
    }
  },

  /**
   * Check whether 1-hour recurring notifications are enabled (default: true)
   */
  isHourlyEnabled() {
    try {
      const saved = localStorage.getItem(HOURLY_ENABLED_KEY);
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  },

  /**
   * Enable or disable 1-hour recurring notifications
   */
  setHourlyEnabled(enabled) {
    try {
      localStorage.setItem(HOURLY_ENABLED_KEY, String(Boolean(enabled)));
      if (enabled && !localStorage.getItem(LAST_HOURLY_SENT_KEY)) {
        localStorage.setItem(LAST_HOURLY_SENT_KEY, String(Date.now()));
      }
    } catch {
      // ignore storage errors
    }
  },

  /**
   * Timestamp (ms) of the last sent hourly notification
   */
  getLastHourlySentAt() {
    try {
      const raw = localStorage.getItem(LAST_HOURLY_SENT_KEY);
      const parsed = raw ? Number(raw) : 0;
      return Number.isFinite(parsed) ? parsed : 0;
    } catch {
      return 0;
    }
  },

  /**
   * Send a browser/PWA push notification (prefers ServiceWorkerRegistration.showNotification)
   */
  async sendPush(title, options = {}) {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      return false;
    }

    const payload = {
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      vibrate: [200, 100, 200],
      ...options,
    };

    try {
      const reg = await this.registerServiceWorker();
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, payload);
        return true;
      }
    } catch {
      // Fall back to standard Window Notification API
    }

    try {
      const notif = new Notification(title, payload);
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
   * Trigger a 1-hour recurring vessel washing reminder
   */
  triggerHourlyReminder({ washerName = '', meal = '', isTest = false } = {}) {
    const ist = getISTDate();
    const timeStr = ist.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const mealLabel = meal ? `${meal.charAt(0).toUpperCase()}${meal.slice(1)}` : 'Today';
    const washerText = washerName
      ? `Current ${mealLabel.toLowerCase()} washer: ${washerName}.`
      : 'Check today’s vessel washing rotation and mark meal attendance.';

    const title = isTest
      ? '🔔 [TEST] Hourly Vessel Wash Reminder'
      : '🔔 Hourly Vessel Wash Reminder';
    const body = `${washerText} (${timeStr} IST)`;

    this.sendPush(title, {
      body,
      tag: 'vw-hourly-reminder',
      renotify: true,
    });

    if (!isTest) {
      try {
        localStorage.setItem(LAST_HOURLY_SENT_KEY, String(Date.now()));
      } catch {
        // ignore
      }
    }

    return {
      type: 'hourly_reminder',
      title,
      body,
      time: `${timeStr} IST`,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Check if 1 hour (3,600,000 ms) has elapsed since the last hourly push notification.
   * Initializes the baseline timestamp on first run so it fires every 1 hour thereafter.
   */
  checkHourlyReminder(context = {}) {
    if (!this.isHourlyEnabled()) return null;
    if (this.getPermissionStatus() !== 'granted') return null;

    const now = Date.now();
    const lastSent = this.getLastHourlySentAt();

    if (!lastSent) {
      try {
        localStorage.setItem(LAST_HOURLY_SENT_KEY, String(now));
      } catch {
        // ignore
      }
      return null;
    }

    if (now - lastSent >= HOURLY_INTERVAL_MS) {
      return this.triggerHourlyReminder({ ...context, isTest: false });
    }

    return null;
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
