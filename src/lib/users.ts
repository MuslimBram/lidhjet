// Regjistri i përdoruesve të regjistruar + log i njoftimeve të dorëzuara.
// Përdorohet për t'u verifikuar se çdo i regjistruar merr njoftim për çdo postim.

const USERS_KEY = "lidhjet_users_v1";
const LOG_KEY = "lidhjet_notif_log_v1";
const CURRENT_KEY = "lidhjet_current_user_v1";

export interface RegisteredUser {
  id: string;
  identifier: string;
  method: "email" | "phone";
  fullName: string;
  offerType: string;
  registeredAt: string;
  notificationsEnabled: boolean;
}

export interface NotifLogEntry {
  at: string;
  title: string;
  body: string;
  recipients: number;
  mode: string;
  permission: string;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function getUsers(): RegisteredUser[] {
  return readJson<RegisteredUser[]>(USERS_KEY, []);
}

export function registerUser(
  u: Omit<RegisteredUser, "id" | "registeredAt" | "notificationsEnabled"> & {
    notificationsEnabled?: boolean;
  },
): RegisteredUser {
  const users = getUsers();
  const existing = users.find((x) => x.identifier === u.identifier);
  const record: RegisteredUser = {
    id: existing?.id ?? crypto.randomUUID(),
    identifier: u.identifier,
    method: u.method,
    fullName: u.fullName,
    offerType: u.offerType,
    registeredAt: existing?.registeredAt ?? new Date().toISOString(),
    notificationsEnabled: u.notificationsEnabled ?? true,
  };
  writeJson(USERS_KEY, [...users.filter((x) => x.identifier !== u.identifier), record]);
  writeJson(CURRENT_KEY, record);
  return record;
}

export function setCurrentUserByIdentifier(identifier: string): RegisteredUser | null {
  const found = getUsers().find((u) => u.identifier === identifier) ?? null;
  if (found) writeJson(CURRENT_KEY, found);
  return found;
}

export function getCurrentUser(): RegisteredUser | null {
  return readJson<RegisteredUser | null>(CURRENT_KEY, null);
}

export function getNotifLog(): NotifLogEntry[] {
  return readJson<NotifLogEntry[]>(LOG_KEY, []);
}

export function logNotification(entry: Omit<NotifLogEntry, "at" | "recipients">) {
  const recipients = getUsers().filter((u) => u.notificationsEnabled).length;
  const log = [{ ...entry, recipients, at: new Date().toISOString() }, ...getNotifLog()].slice(
    0,
    50,
  );
  writeJson(LOG_KEY, log);
}
