import { useState } from "react";
import { X } from "lucide-react";
import { useSettings } from "@/lib/use-settings";

export function AnnouncementBanner() {
  const [dismissed, setDismissed] = useState(false);
  const settings = useSettings();

  const active = settings.announcement_active === "true";
  const text = settings.announcement_text as string | undefined;
  const color = (settings.announcement_color as string | undefined) ?? "#ff6600";
  const url = settings.announcement_url as string | undefined;

  if (!active || !text || dismissed) return null;

  const content = (
    <div
      className="relative flex items-center justify-center px-10 py-2.5 text-center"
      style={{ backgroundColor: color }}
    >
      <p className="text-white text-xs font-black uppercase tracking-widest">{text}</p>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-white/60 hover:text-white transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  if (url) {
    return (
      <a href={url} target={url.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="block hover:opacity-90 transition-opacity">
        {content}
      </a>
    );
  }

  return content;
}
