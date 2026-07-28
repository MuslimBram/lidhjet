import { ShieldAlert, RotateCcw } from "lucide-react";

export function SuspensionBanner({
  until,
  onReset,
}: {
  until: string;
  onReset: () => void;
}) {
  const date = new Date(until);
  return (
    <div className="mb-4 flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div>
          <p className="font-semibold text-destructive">Llogaria juaj është pezulluar për 7 ditë</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Për shkak të 3 shkeljeve (kontakt i ndaluar / çmim jashtë normave). Pezullimi
            përfundon më <span className="font-medium text-foreground">{date.toLocaleString("sq-AL")}</span>.
            Do të merrni njoftim me email kur të riaktivizohet.
          </p>
        </div>
      </div>
      <button
        onClick={onReset}
        className="inline-flex items-center gap-1.5 self-start rounded-md border border-border bg-input px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground sm:self-auto"
        title="Vetëm për demo — hiq pezullimin lokal"
      >
        <RotateCcw className="h-3.5 w-3.5" /> Reset (demo)
      </button>
    </div>
  );
}
