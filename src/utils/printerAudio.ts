// Procedural Web Audio Printer Sound Synthesizer (Zero External Audio Files)
class PrinterAudioController {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private printingInterval: number | null = null;
  private motorOsc: OscillatorNode | null = null;
  private motorGain: GainNode | null = null;

  private initContext() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopPrintingSound();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // Realistic thermal dot-matrix print stepper sound
  public startPrintingSound() {
    if (this.isMuted || typeof window === 'undefined') return;
    this.stopPrintingSound();

    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      this.motorOsc = this.ctx.createOscillator();
      this.motorGain = this.ctx.createGain();

      this.motorOsc.type = 'sine';
      this.motorOsc.frequency.setValueAtTime(110, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(280, now);

      this.motorGain.gain.setValueAtTime(0.06, now);

      this.motorOsc.connect(filter);
      filter.connect(this.motorGain);
      this.motorGain.connect(this.ctx.destination);

      this.motorOsc.start(now);

      this.printingInterval = window.setInterval(() => {
        if (!this.ctx || this.isMuted) return;
        const tickTime = this.ctx.currentTime;
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.03);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
        }

        const sweep = this.ctx.createBufferSource();
        sweep.buffer = buffer;

        const sweepFilter = this.ctx.createBiquadFilter();
        sweepFilter.type = 'bandpass';
        sweepFilter.frequency.setValueAtTime(750 + Math.random() * 200, tickTime);
        sweepFilter.Q.setValueAtTime(2.2, tickTime);

        const sweepGain = this.ctx.createGain();
        sweepGain.gain.setValueAtTime(0.05, tickTime);
        sweepGain.gain.exponentialRampToValueAtTime(0.001, tickTime + 0.028);

        sweep.connect(sweepFilter);
        sweepFilter.connect(sweepGain);
        sweepGain.connect(this.ctx.destination);

        sweep.start(tickTime);
      }, 160);
    } catch {
      // AudioContext fallback
    }
  }

  public stopPrintingSound() {
    if (this.printingInterval !== null) {
      clearInterval(this.printingInterval);
      this.printingInterval = null;
    }
    if (this.motorOsc) {
      try {
        this.motorOsc.stop();
        this.motorOsc.disconnect();
      } catch {}
      this.motorOsc = null;
    }
    if (this.motorGain) {
      try {
        this.motorGain.disconnect();
      } catch {}
      this.motorGain = null;
    }
  }

  // Realistic paper tear sound
  public playTearSound() {
    if (this.isMuted || typeof window === 'undefined') return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.22);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(350, now + 0.2);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
    } catch {}
  }

  // Rubber ink stamp "thump"
  public playStampSound() {
    if (this.isMuted || typeof window === 'undefined') return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.1);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch {}
  }
}

export const printerAudio = new PrinterAudioController();
