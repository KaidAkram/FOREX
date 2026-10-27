"use client";

class TactileSoundEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  constructor() {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("shiftfx-sound-enabled");
      if (saved !== null) {
        this.enabled = saved === "true";
      }
    }
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    if (typeof window !== "undefined") {
      localStorage.setItem("shiftfx-sound-enabled", String(val));
      window.dispatchEvent(new CustomEvent("shiftfx-sound-toggle", { detail: val }));
    }
  }

  public toggle() {
    this.setEnabled(!this.enabled);
    if (this.enabled) {
      this.playPop(1.2);
    }
    return this.enabled;
  }

  private init() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  // Soft organic 'Pop' when switching tabs or sidebar links (Fernly Benchmark 00:01, 00:03)
  playPop(pitchMultiplier = 1) {
    if (!this.enabled) return;
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(440 * pitchMultiplier, now);
        osc.frequency.exponentialRampToValueAtTime(150 * pitchMultiplier, now + 0.055);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
      } catch {}
    });
  }

  // Ultra-crisp 'Tick' when scrubbing charts or hovering G10 currency bars (Fernly 00:04)
  playTick() {
    if (!this.enabled) return;
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.018);

        gain.gain.setValueAtTime(0.035, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.02);
      } catch {}
    });
  }

  // Warm harmonic 'Chime' when changing themes or completing sync (Fernly 00:08)
  playChime() {
    if (!this.enabled) return;
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        [523.25, 659.25, 783.99].forEach((freq, idx) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + idx * 0.045);

          gain.gain.setValueAtTime(0.05, now + idx * 0.045);
          gain.gain.exponentialRampToValueAtTime(0.0008, now + idx * 0.045 + 0.32);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + idx * 0.045);
          osc.stop(now + idx * 0.045 + 0.35);
        });
      } catch {}
    });
  }
}

export const soundFX = new TactileSoundEngine();

// Backward compatibility bridges
export const playPop = (pitchMultiplier = 1) => soundFX.playPop(pitchMultiplier);
export const playTick = () => soundFX.playTick();
export const playChime = () => soundFX.playChime();
export const playTabSound = () => soundFX.playPop(1);
export const playClickSound = () => soundFX.playPop(0.9);
export const playSuccessSound = () => soundFX.playChime();
export const isSoundEnabled = () => soundFX.enabled;
export const setSoundEnabled = (v: boolean) => soundFX.setEnabled(v);
