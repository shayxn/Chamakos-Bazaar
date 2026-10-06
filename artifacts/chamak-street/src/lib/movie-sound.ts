// Filming-only synthetic coin sound. Never used by real order notifications.
export class MovieSound {
  private context: AudioContext | null = null;
  private voices = new Set<{ oscillators: OscillatorNode[]; gain: GainNode }>();
  async enable() {
    const Constructor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Constructor) throw new Error("Audio is unavailable in this browser.");
    if (!this.context || this.context.state === "closed") this.context = new Constructor();
    await this.context.resume();
    if (this.context.state !== "running") throw new Error("Tap Enable sound on this screen to allow audio.");
  }
  play(delay = 0) {
    const context = this.context;
    if (!context || context.state !== "running" || document.hidden || this.voices.size >= 12) return;
    const start = context.currentTime + delay;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.045, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
    gain.connect(context.destination);
    const oscillators = [1318.51, 2093].map((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = index ? "sine" : "triangle";
      oscillator.frequency.setValueAtTime(frequency * 0.8, start + index * 0.045);
      oscillator.frequency.exponentialRampToValueAtTime(frequency, start + index * 0.045 + 0.025);
      oscillator.connect(gain);
      oscillator.start(start + index * 0.045);
      oscillator.stop(start + 0.23);
      return oscillator;
    });
    const voice = { oscillators, gain };
    this.voices.add(voice);
    oscillators[1].onended = () => {
      oscillators.forEach(oscillator => oscillator.disconnect());
      gain.disconnect(); this.voices.delete(voice);
    };
  }
  stop() {
    for (const voice of this.voices) {
      for (const oscillator of voice.oscillators) { try { oscillator.stop(); } catch { /* Already ended. */ } oscillator.disconnect(); }
      voice.gain.disconnect();
    }
    this.voices.clear();
    const context = this.context;
    this.context = null;
    if (context && context.state !== "closed") void context.close().catch(() => undefined);
  }
}
