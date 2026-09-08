import type { GameEvent } from '@arena/game-core';
export class AudioSystem {
  context?: AudioContext; muted = false;
  unlock = () => { this.context ??= new AudioContext(); void this.context.resume(); };
  play(events: GameEvent[]) {
    const ctx = this.context; if (!ctx || this.muted || ctx.state !== 'running') return;
    for (const e of events.slice(0, 8)) {
      const frequencies = { swing: 180, shoot: 480, hit: 95, kill: 260, hurt: 60, complete: 660 };
      const oscillator = ctx.createOscillator(), gain = ctx.createGain(), t = ctx.currentTime;
      oscillator.type = e.type === 'complete' ? 'sine' : 'triangle';
      oscillator.frequency.setValueAtTime(frequencies[e.type], t);
      oscillator.frequency.exponentialRampToValueAtTime(frequencies[e.type] * (e.type === 'complete' ? 1.5 : .35), t + .15);
      gain.gain.setValueAtTime(.045, t); gain.gain.exponentialRampToValueAtTime(.001, t + .2);
      oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(t); oscillator.stop(t + .22);
    }
  }
}
