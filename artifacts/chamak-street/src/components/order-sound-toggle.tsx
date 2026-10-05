import { Volume2, VolumeX } from "lucide-react";
import { setSoundEnabled, unlockAudio, useOrderSound } from "@/lib/order-sound";

export function OrderSoundToggle({ compact = false }: { compact?: boolean }) {
  const [unlocked, enabled] = useOrderSound().split("|");
  const on = enabled === "true";
  const ready = unlocked === "true";
  if (compact) {
    return (
      <div className="fixed bottom-[max(5rem,env(safe-area-inset-bottom))] right-3 md:bottom-3 z-[75] flex max-w-[calc(100vw-1.5rem)] items-center gap-2">
        {on && !ready && <button type="button" onClick={() => void unlockAudio()} className="liquid-pill rounded-full px-3 py-2 text-[11px] text-white">Tap to enable order sound</button>}
        <button type="button" aria-pressed={on} aria-label={on ? "Turn order sound off" : "Turn order sound on"} onClick={() => setSoundEnabled(!on)} data-testid="button-order-sound-global" className="liquid-pill grid h-11 w-11 place-items-center rounded-full text-white">
          {on ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" aria-pressed={on} onClick={() => (on ? setSoundEnabled(false) : setSoundEnabled(true))} data-testid="button-order-sound"
        className="liquid-pill inline-flex h-10 items-center gap-2 rounded-full px-4 text-xs font-semibold uppercase tracking-wider text-white">
        {on ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}Order sound {on ? "on" : "off"}
      </button>
      {on && !ready && <button type="button" onClick={() => void unlockAudio()} className="text-xs text-[#c4adff] underline">Tap to enable sound in this browser</button>}
    </div>
  );
}
