import type { Projectile } from '@arena/game-core';

type Sample = { time: number; x: number; z: number; facing: number; speed: number };
const delay = .05; // One 20 Hz snapshot interval, independent of the round timer.

/** Render-only snapshot history. Hits and projectile lifetime remain authoritative. */
export class ProjectileMotion {
  private tracks = new Map<number, Sample[]>();
  clear() { this.tracks.clear(); }

  receive(shots: readonly Projectile[], now: number, owners: readonly { id: number; x: number; z: number }[]) {
    const alive = new Set(shots.map(s => s.id));
    for (const id of this.tracks.keys()) if (!alive.has(id)) this.tracks.delete(id);
    for (const shot of shots) {
      let samples = this.tracks.get(shot.id);
      if (!samples) {
        const owner = owners.find(p => p.id === shot.ownerId);
        const distance = owner ? Math.min(shot.speed * delay, Math.hypot(shot.x-owner.x, shot.z-owner.z)) : 0;
        samples = [{ time: now-delay, x: shot.x-Math.sin(shot.facing)*distance, z: shot.z-Math.cos(shot.facing)*distance, facing: shot.facing, speed: shot.speed }];
        this.tracks.set(shot.id, samples);
      }
      samples.push({ time: now, x: shot.x, z: shot.z, facing: shot.facing, speed: shot.speed });
      if (samples.length > 6) samples.shift();
    }
  }

  sample(id: number, now: number) {
    const samples = this.tracks.get(id);
    if (!samples) return undefined;
    const time = now-delay;
    for (let i=1; i<samples.length; i++) {
      const a=samples[i-1], b=samples[i];
      if (time <= b.time) {
        const alpha=Math.max(0,Math.min(1,(time-a.time)/Math.max(.00001,b.time-a.time)));
        const turn=Math.atan2(Math.sin(b.facing-a.facing),Math.cos(b.facing-a.facing));
        return { x:a.x+(b.x-a.x)*alpha, z:a.z+(b.z-a.z)*alpha, facing:a.facing+turn*alpha };
      }
    }
    // Cover a late packet for at most one interval; never let a stale shot fly forever.
    const last=samples[samples.length-1], extra=Math.min(delay,Math.max(0,time-last.time));
    return { x:last.x+Math.sin(last.facing)*last.speed*extra, z:last.z+Math.cos(last.facing)*last.speed*extra, facing:last.facing };
  }
}
