// Real 2FA code handling (klient-side, pa backend).
// Kodi gjenerohet me crypto.getRandomValues, ka skadencë, limit tentativash
// dhe DUHET të përputhet — 6 shifra të rastësishme nuk pranohen më.

const KEY = "lidhjet_otp_v1";
export const OTP_TTL_MS = 5 * 60 * 1000; // 5 minuta
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_MS = 30 * 1000;

export interface OtpChallenge {
  identifier: string;
  code: string;
  purpose: "register" | "login" | "final";
  createdAt: number;
  expiresAt: number;
  attempts: number;
}

function read(): OtpChallenge | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as OtpChallenge) : null;
  } catch {
    return null;
  }
}

function write(c: OtpChallenge | null) {
  try {
    if (c) sessionStorage.setItem(KEY, JSON.stringify(c));
    else sessionStorage.removeItem(KEY);
  } catch {}
}

export function generateCode(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(100000 + (buf[0] % 900000));
}

export function createChallenge(
  identifier: string,
  purpose: OtpChallenge["purpose"],
): OtpChallenge {
  const now = Date.now();
  const c: OtpChallenge = {
    identifier,
    code: generateCode(),
    purpose,
    createdAt: now,
    expiresAt: now + OTP_TTL_MS,
    attempts: 0,
  };
  write(c);
  return c;
}

export function getChallenge(): OtpChallenge | null {
  const c = read();
  if (!c) return null;
  if (Date.now() > c.expiresAt) {
    write(null);
    return null;
  }
  return c;
}

export function clearChallenge() {
  write(null);
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "expired" | "mismatch" | "locked" | "missing"; left?: number };

export function verifyCode(input: string): VerifyResult {
  const c = read();
  if (!c) return { ok: false, reason: "missing" };
  if (Date.now() > c.expiresAt) {
    write(null);
    return { ok: false, reason: "expired" };
  }
  if (c.attempts >= OTP_MAX_ATTEMPTS) {
    write(null);
    return { ok: false, reason: "locked" };
  }
  if (input.trim() !== c.code) {
    const next = { ...c, attempts: c.attempts + 1 };
    write(next);
    const left = OTP_MAX_ATTEMPTS - next.attempts;
    if (left <= 0) {
      write(null);
      return { ok: false, reason: "locked" };
    }
    return { ok: false, reason: "mismatch", left };
  }
  write(null);
  return { ok: true };
}

export function canResend(c: OtpChallenge | null): boolean {
  if (!c) return true;
  return Date.now() - c.createdAt >= OTP_RESEND_MS;
}
