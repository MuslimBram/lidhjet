import { ArrowUpDown, Star, MessageSquare, ShoppingBag, ArrowDownWideNarrow, ArrowUpNarrowWide, Clock } from "lucide-react";
import { SORT_OPTIONS, type SortKey } from "@/lib/sortPosts";

const ICONS: Record<SortKey, typeof Star> = {
  recent: Clock,
  rating: Star,
  comments: MessageSquare,
  sales: ShoppingBag,
  price_asc: ArrowUpNarrowWide,
  price_desc: ArrowDownWideNarrow,
};

export function SortBar({
  value,
  onChange,
  resultCount,
}: {
  value: SortKey;
  onChange: (k: SortKey) => void;
  resultCount: number;
}) {
  return (
    <div className="card-elevated mt-4 flex flex-wrap items-center gap-2 p-3">
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <ArrowUpDown className="h-3.5 w-3.5 text-primary" /> Rendit sipas
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        {SORT_OPTIONS.map((o) => {
          const Icon = ICONS[o.key];
          const active = value === o.key;
          return (
            <button
              key={o.key}
              onClick={() => onChange(o.key)}
              aria-pressed={active}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors ${
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-input hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {o.label}
            </button>
          );
        })}
      </div>
      <span className="ml-auto text-xs text-muted-foreground">{resultCount} rezultate</span>
    </div>
  );
}
