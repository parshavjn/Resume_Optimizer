class SoundEffects {
  private ctx: AudioContext | null = null;
  private isMuted = false;

  private initCtx() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(m: boolean) {
    this.isMuted = m;
  }

  playOscillator(freqs: number[], duration: number, type: OscillatorType = 'sine', delayBetween = 0) {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      freqs.forEach((freq, idx) => {
        if (!this.ctx) return;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();

        o.type = type;
        o.frequency.setValueAtTime(freq, now + idx * delayBetween);
        o.connect(g);
        g.connect(this.ctx.destination);

        g.gain.setValueAtTime(0.08, now + idx * delayBetween);
        g.gain.exponentialRampToValueAtTime(0.0001, now + idx * delayBetween + duration);

        o.start(now + idx * delayBetween);
        o.stop(now + idx * delayBetween + duration);
      });
    } catch (e) {
      console.warn("Sound effect error", e);
    }
  }

  playBubble() {
    this.playOscillator([400, 600, 800], 0.15, 'sine', 0.04);
  }

  playTick() {
    this.playOscillator([800], 0.05, 'triangle');
  }

  playSuccess() {
    this.playOscillator([523.25, 659.25, 783.99, 1046.50], 0.3, 'sine', 0.06);
  }

  playClick() {
    this.playOscillator([300], 0.08, 'triangle');
  }

  playSweep() {
    this.playOscillator([600, 400, 200], 0.2, 'sine', 0.05);
  }
}

export const sounds = new SoundEffects();
