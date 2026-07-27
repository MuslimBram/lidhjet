export function UserBadge({ fullName }: { fullName: string }) {
  const initials = fullName
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
        {initials}
      </div>
      <span className="text-sm font-semibold">{fullName}</span>
    </div>
  );
}
