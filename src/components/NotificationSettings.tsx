import { useState, useEffect, useRef } from "react";
import { Bell, Vibrate, Volume2, BellOff } from "lucide-react";

type NotificationMode = "vibrate" | "beep" | "normal" | "silent";

const MODES: { id: NotificationMode; label: string; icon: typeof Bell }[] = [
  { id: "vibrate", label: "Dridhje", icon: Vibrate },
  { id: "beep", label: "Beep", icon: Volume2 },
  { id: "normal", label: "Normal", icon: Bell },
  { id: "silent", label: "Heshtje", icon: BellOff },
];

export function NotificationSettings() {
  const [mode, setMode] = useState<NotificationMode>("normal");
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("lidhjet_notif_mode") as NotificationMode | null;
    if (saved) setMode(saved);
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function beep() {
    try {
      const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
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

  function changeMode(next: NotificationMode) {
    setMode(next);
    localStorage.setItem("lidhjet_notif_mode", next);
    setIsOpen(false);
    if (next === "silent") return;
    if (next === "vibrate") navigator.vibrate?.(200);
    if (next === "beep") beep();
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("Lidhjet", { body: `Modaliteti: ${next}` });
      } catch {}
    }
  }

  const Current = MODES.find((m) => m.id === mode)!;
  const Icon = Current.icon;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-input px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        title="Modaliteti i njoftimeve"
      >
        <Icon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{Current.label}</span>
      </button>
      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-lg border border-border bg-card shadow-xl">
          {MODES.map((m) => {
            const M = m.icon;
            const active = m.id === mode;
            return (
              <button
                key={m.id}
                onClick={() => changeMode(m.id)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                  active ? "bg-primary/15 text-primary" : "hover:bg-input"
                }`}
              >
                <M className="h-4 w-4" /> {m.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
