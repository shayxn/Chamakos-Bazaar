import { useState } from "react";
import { X } from "lucide-react";
import { useSettings } from "@/lib/use-settings";

const InstagramIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const TikTokIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.69a8.27 8.27 0 004.84 1.54V6.76a4.85 4.85 0 01-1.08-.07z"/>
  </svg>
);

export function AnnouncementBanner() {
  const [dismissed, setDismissed] = useState(false);
  const settings = useSettings();

  const active = settings.announcement_active === "true";
  const text = settings.announcement_text as string | undefined;
  const color = (settings.announcement_color as string | undefined) ?? "#ff6600";
  const url = settings.announcement_url as string | undefined;

  const instagram = settings.contact_instagram as string | undefined;
  const tiktok = settings.contact_tiktok as string | undefined;

  if (!active || !text || dismissed) return null;

  const inner = (
    <div
      className="relative flex items-center gap-2 px-3 sm:px-8 py-2 overflow-hidden"
      style={{ backgroundColor: color }}
    >
      {/* Social icons left — hidden on very narrow screens */}
      {(instagram || tiktok) && (
        <div className="hidden xs:flex items-center gap-2 shrink-0">
          {instagram && (
            <a
              href={`https://instagram.com/${instagram.replace("@", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-center w-7 h-7 text-white/80 hover:text-white transition-colors"
            >
              <InstagramIcon />
            </a>
          )}
          {tiktok && (
            <a
              href={`https://tiktok.com/@${tiktok.replace("@", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-center w-7 h-7 text-white/80 hover:text-white transition-colors"
            >
              <TikTokIcon />
            </a>
          )}
        </div>
      )}

      {/* Centered text */}
      <p className="flex-1 text-white text-[10px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest text-center truncate px-6">{text}</p>

      {/* Dismiss — 44×44 tap target */}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDismissed(true); }}
        className="absolute right-0 top-0 h-full w-10 flex items-center justify-center text-white/60 hover:text-white transition-colors shrink-0"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  if (url) {
    return (
      <a href={url} target={url.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="block hover:opacity-90 transition-opacity">
        {inner}
      </a>
    );
  }

  return inner;
}
