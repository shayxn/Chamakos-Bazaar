const steps = {
  iOS: ["Open this site in Safari (not inside another app).", "Tap the Share button, then Add to Home Screen, then Add.", "Open IMAGINATE from your Home Screen icon.", "Inside the app, accept the notification prompt. If you missed it, open Settings, then Notifications, then IMAGINATE, and allow them. iOS 16.4 or later is required."],
  Android: ["Open this site in Chrome.", "Tap the three-dot menu, then Install app (or Add to Home screen).", "Open IMAGINATE from your launcher.", "Accept the notification prompt. If blocked, long-press the app icon, tap Info, then Notifications, and switch them on."],
};
export default function InstallGuide() {
  return (
    <main className="mx-auto min-h-[100dvh] max-w-3xl px-5 py-16 text-white">
      <h1 className="text-3xl font-semibold uppercase tracking-tight sm:text-5xl">Install IMAGINATE</h1>
      <p className="mt-3 text-sm text-white/60">Keep the store on your home screen and get order and drop alerts.</p>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {Object.entries(steps).map(([k, list]) => (
          <section key={k} className="liquid-panel rounded-3xl p-5" aria-labelledby={`g-${k}`}>
            <h2 id={`g-${k}`} className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#c4adff]">{k === "iOS" ? "iPhone and iPad" : "Android"}</h2>
            <ol className="list-decimal space-y-3 pl-5 text-sm leading-6 text-white/75">{list.map((t) => <li key={t}>{t}</li>)}</ol>
          </section>
        ))}
      </div>
    </main>
  );
}
