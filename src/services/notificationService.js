/**
 * Push and In-App Notification Service for Vessel Washing App
 * Handles 1-hour recurring push notifications plus 11:00 AM and 11:30 AM IST attendance reminders.
 */

import { getTodayDateStr } from '../logic/dateUtils';

const HOURLY_ENABLED_KEY = 'vw_hourly_notif_enabled';
const LAST_HOURLY_SENT_KEY = 'vw_last_hourly_notif_at';
export const HOURLY_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

let swRegistrationPromise = null;
let sharedAudioCtx = null;
let audioUnlocked = false;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  return sharedAudioCtx;
}

if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    if (audioUnlocked) return;
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    audioUnlocked = true;
  };
  window.addEventListener('pointerdown', unlockAudio, { passive: true, once: true });
  window.addEventListener('keydown', unlockAudio, { passive: true, once: true });
}

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
   * Play a punchy, high-volume Tamil mass movie BGM-style synth-brass & bass riff via Web Audio API
   */
  async playUniqueNotificationSound() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return false;
      if (ctx.state === 'suspended') {
        await ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;

      // Master compressor + boosted gain for clear, louder mobile/desktop playback
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-14, now);
      compressor.knee.setValueAtTime(18, now);
      compressor.ratio.setValueAtTime(6, now);
      compressor.attack.setValueAtTime(0.005, now);
      compressor.release.setValueAtTime(0.15, now);

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.65, now);
      compressor.connect(masterGain);
      masterGain.connect(ctx.destination);

      // Energetic Kollywood mass BGM motif (Phrygian dominant / Hijaz feel in D)
      const leadNotes = [
        { freq: 587.33, delay: 0.0, duration: 0.14 },  // D5
        { freq: 622.25, delay: 0.13, duration: 0.12 }, // Eb5
        { freq: 739.99, delay: 0.25, duration: 0.14 }, // F#5
        { freq: 783.99, delay: 0.39, duration: 0.16 }, // G5
        { freq: 739.99, delay: 0.55, duration: 0.12 }, // F#5
        { freq: 622.25, delay: 0.67, duration: 0.12 }, // Eb5
        { freq: 587.33, delay: 0.79, duration: 0.38 }, // D5 (heroic hold)
      ];

      leadNotes.forEach(({ freq, delay, duration }) => {
        const start = now + delay;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const env = ctx.createGain();

        // Layered detuned sawtooth + square for cinematic synth-brass punch
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(freq, start);
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(freq * 1.004, start);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3200, start);
        filter.frequency.exponentialRampToValueAtTime(1400, start + duration);
        filter.Q.setValueAtTime(2.5, start);

        env.gain.setValueAtTime(0.0001, start);
        env.gain.exponentialRampToValueAtTime(0.45, start + 0.018);
        env.gain.exponentialRampToValueAtTime(0.0001, start + duration);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(env);
        env.connect(compressor);

        osc1.start(start);
        osc2.start(start);
        osc1.stop(start + duration + 0.02);
        osc2.stop(start + duration + 0.02);
      });

      // Punchy sub-bass hits on key accents
      const bassHits = [
        { freq: 146.83, delay: 0.0, duration: 0.24 },  // D3
        { freq: 196.0, delay: 0.39, duration: 0.24 },  // G3
        { freq: 146.83, delay: 0.79, duration: 0.38 }, // D3
      ];

      bassHits.forEach(({ freq, delay, duration }) => {
        const start = now + delay;
        const bass = ctx.createOscillator();
        const bassGain = ctx.createGain();

        bass.type = 'triangle';
        bass.frequency.setValueAtTime(freq, start);

        bassGain.gain.setValueAtTime(0.0001, start);
        bassGain.gain.exponentialRampToValueAtTime(0.55, start + 0.015);
        bassGain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

        bass.connect(bassGain);
        bassGain.connect(compressor);

        bass.start(start);
        bass.stop(start + duration + 0.02);
      });

      return true;
    } catch (e) {
      console.warn('Could not play notification sound:', e);
      return false;
    }
  },

  /**
   * Send a browser/PWA push notification (prefers ServiceWorkerRegistration.showNotification)
   */
  async sendPush(title, options = {}) {
    // Play unique in-app chime regardless of OS notification channel muting
    this.playUniqueNotificationSound();

    if (!this.isSupported() || Notification.permission !== 'granted') {
      return false;
    }

    const payload = {
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      vibrate: [200, 100, 200],
      silent: false,
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
    const body = `${washerText} (${timeStr})`;

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
      time: timeStr,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Build a clean reminder message for WhatsApp / SMS sharing
   */
  buildReminderMessage({ washerName = '', meal = '', dateStr = getTodayDateStr() } = {}) {
    const mealLabel = meal ? `${meal.charAt(0).toUpperCase()}${meal.slice(1)}` : 'Today';
    const washerLine = washerName
      ? `🧼 *${mealLabel} Washer:* ${washerName}`
      : `🧼 *${mealLabel} Washer:* Pending confirmation`;
    return [
      `🔔 *Vessel Washing Reminder* (${dateStr})`,
      washerLine,
      `Please check the app and mark meal attendance.`,
    ].join('\n');
  },

  /**
   * Open WhatsApp with a pre-filled reminder message (100% free, no API needed)
   */
  sendViaWhatsApp(context = {}) {
    const message = typeof context === 'string' ? context : this.buildReminderMessage(context);
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    return url;
  },

  /**
   * Open default SMS app with a pre-filled reminder message (free carrier SMS)
   */
  sendViaSMS(context = {}, phone = '') {
    const message = typeof context === 'string' ? context : this.buildReminderMessage(context);
    const plainText = message.replace(/\*/g, '');
    const separator = /iPad|iPhone|iPod/.test(navigator.userAgent || '') ? '&' : '?';
    const url = `sms:${phone}${separator}body=${encodeURIComponent(plainText)}`;
    if (typeof window !== 'undefined') {
      window.location.href = url;
    }
    return url;
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
      time: '11:00 AM',
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
      time: '11:30 AM',
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
