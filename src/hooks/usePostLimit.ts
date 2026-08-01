import { useCallback, useEffect, useState } from "react";

const KEY = "lidhjet_last_post_at_v1";
const WINDOW_MS = 24 * 60 * 60 * 1000;

export function usePostLimit() {
  const [lastPostAt, setLastPostAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    setLastPostAt(raw ? Number(raw) : null);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const remainingMs = lastPostAt ? Math.max(0, lastPostAt + WINDOW_MS - now) : 0;
  const canPost = remainingMs === 0;

  const markPosted = useCallback(() => {
    const t = Date.now();
    setLastPostAt(t);
    setNow(t);
    try {
      localStorage.setItem(KEY, String(t));
    } catch {}
  }, []);

  const reset = useCallback(() => {
    setLastPostAt(null);
    try {
      localStorage.removeItem(KEY);
    } catch {}
  }, []);

  return { canPost, remainingMs, remainingLabel: formatRemaining(remainingMs), markPosted, reset };
}

export function formatRemaining(ms: number): string {
  if (ms <= 0) return "0 min";
  const totalMin = Math.ceil(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  return `${h} orë ${m} min`;
}
