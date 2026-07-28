import { useCallback, useEffect, useState } from "react";

const KEY = "lidhjet_violations_v1";
const SUSPEND_KEY = "lidhjet_suspended_until_v1";
const MAX = 3;
const SUSPEND_DAYS = 7;

export type ViolationKind = "contact" | "price";

export interface Violation {
  kind: ViolationKind;
  reason: string;
  at: string;
}

interface State {
  items: Violation[];
  suspendedUntil: string | null;
}

function readState(): State {
  if (typeof window === "undefined") return { items: [], suspendedUntil: null };
  try {
    const raw = localStorage.getItem(KEY);
    const su = localStorage.getItem(SUSPEND_KEY);
    return {
      items: raw ? (JSON.parse(raw) as Violation[]) : [],
      suspendedUntil: su,
    };
  } catch {
    return { items: [], suspendedUntil: null };
  }
}

export function useViolations() {
  const [state, setState] = useState<State>(() => readState());

  useEffect(() => {
    setState(readState());
  }, []);

  const persist = useCallback((next: State) => {
    setState(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next.items));
      if (next.suspendedUntil) localStorage.setItem(SUSPEND_KEY, next.suspendedUntil);
      else localStorage.removeItem(SUSPEND_KEY);
    } catch {}
  }, []);

  const addViolation = useCallback(
    (kind: ViolationKind, reason: string) => {
      const items = [...state.items, { kind, reason, at: new Date().toISOString() }];
      let suspendedUntil = state.suspendedUntil;
      if (items.length >= MAX && !suspendedUntil) {
        const d = new Date();
        d.setDate(d.getDate() + SUSPEND_DAYS);
        suspendedUntil = d.toISOString();
      }
      persist({ items, suspendedUntil });
      return { count: items.length, suspendedUntil };
    },
    [state, persist],
  );

  const reset = useCallback(() => persist({ items: [], suspendedUntil: null }), [persist]);

  const isSuspended =
    !!state.suspendedUntil && new Date(state.suspendedUntil).getTime() > Date.now();

  return {
    violations: state.items,
    count: state.items.length,
    max: MAX,
    isSuspended,
    suspendedUntil: state.suspendedUntil,
    addViolation,
    reset,
  };
}
