import { useActiveEvents } from "./event-banner";

export function useEventBadge(): { text: string; color: string; textColor: string } | null {
  const events = useActiveEvents();
  const evt = events.find((e) => e.badgeText);
  if (!evt) return null;
  return {
    text: evt.badgeText!,
    color: evt.bannerColor || "#ff6600",
    textColor: evt.textColor || "#ffffff",
  };
}

export function EventProductBadge({ className = "" }: { className?: string }) {
  const badge = useEventBadge();
  if (!badge) return null;
  return (
    <span
      className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-sm ${className}`}
      style={{ backgroundColor: badge.color, color: badge.textColor }}
    >
      {badge.text}
    </span>
  );
}
