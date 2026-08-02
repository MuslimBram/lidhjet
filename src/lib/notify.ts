// Shared notification delivery respecting the user's chosen mode
// (dridhje / beep / normal / heshtje) stored by NotificationSettings.

import { logNotification } from "@/lib/users";

export type NotificationMode = "vibrate" | "beep" | "normal" | "silent";

export const NOTIF_MODE_KEY = "lidhjet_notif_mode";

export function getNotificationMode(): NotificationMode {
  if (typeof window === "undefined") return "normal";
  const saved = localStorage.getItem(NOTIF_MODE_KEY) as NotificationMode | null;
  return saved ?? "normal";
}

export function playBeep() {
  try {
    const AC = (window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext) as typeof AudioContext | undefined;
    if (!AC) return;
    const ctx = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    o.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    o.start();
    o.stop(ctx.currentTime + 0.18);
  } catch {}
}

export function notifyUser(title: string, body: string) {
  if (typeof window === "undefined") return;
  const mode = getNotificationMode();
  const permission = "Notification" in window ? Notification.permission : "unsupported";
  logNotification({ title, body, mode, permission });
  if (mode === "silent") return;
  if (mode === "vibrate") navigator.vibrate?.(200);
  if (mode === "beep") playBeep();
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, { body });
    } catch {}
  }
}

/** Kërkon lejen e njoftimeve — thirret pas regjistrimit/hyrjes. */
export async function ensureNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "default") {
    try {
      return await Notification.requestPermission();
    } catch {
      return Notification.permission;
    }
  }
  return Notification.permission;
}
