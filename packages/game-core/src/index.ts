import { defaults, characters, enemyTypes, type EnemyType, type CharacterId, type Config } from '@arena/game-data';
export type Input = { x: number; z: number };
export type Actor = { id: number; x: number; z: number; hp: number; facing: number; flash: number; vx: number; vz: number; cooldown: number; windup: number; attackTargetId?: number; enemyType?: EnemyType; maxHealth?: number };
export type CombatStats = { totalDamage: number; damageByWeapon: Record<string, number>; kills: number; damageTaken: number };
export const emptyStats = (): CombatStats => ({ totalDamage: 0, damageByWeapon: { 'weapon.longsword': 0 }, kills: 0, damageTaken: 0 });
export type Player = Actor & { name: string; character: CharacterId; maxHealth: number; swing: number; targetId: number | null; weaponLevel: number; armorLevel: number; stats: CombatStats };
export type PlayerSetup = { id: number; name: string; character: CharacterId; weaponLevel?: number; armorLevel?: number; stats?: CombatStats };
export type GameEvent = { type: 'swing' | 'hit' | 'kill' | 'hurt' | 'complete'; x: number; z: number; facing: number; amount?: number; targetId?: number; enemyType?: EnemyType };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export class Simulation {
  config: Config;
  players: Player[] = [];
  localPlayerId = 0;
  get player() { return this.players.find(p => p.id === this.localPlayerId) ?? this.players[0]; }
  get targetId() { return this.player.targetId; }
  set targetId(value: number | null) { this.player.targetId = value; }
  get swing() { return this.player.swing; }
  set swing(value: number) { this.player.swing = value; }
  enemies: Actor[] = [];
  events: GameEvent[] = [];
  phase: 'playing' | 'paused' | 'dead' | 'complete' = 'playing';
  time = 0; kills = 0; spawnClock = 0; spawnScale = 1; seed = 42; nextId = 1; assisted = false;
  roundNumber = 1;
  constructor(config: Partial<Config> = {}) { this.config = { ...defaults, ...config }; this.reset(); }
  random() { this.seed = (1664525 * this.seed + 1013904223) >>> 0; return this.seed / 4294967296; }
  reset(roster: PlayerSetup[] = [{ id: 0, name: 'Warrior', character: 'warrior' }], roundNumber = 1) {
    this.roundNumber = roundNumber;
    this.players = roster.map((entry, index) => {
      const maxHealth = (entry.character === 'warrior' ? this.config.playerHealth : characters[entry.character].health) + (entry.armorLevel ?? 0) * 25;
      return { ...entry, weaponLevel: entry.weaponLevel ?? 0, armorLevel: entry.armorLevel ?? 0, stats: entry.stats ? structuredClone(entry.stats) : emptyStats(), x: roster.length === 1 ? 0 : (index % 2 ? 1.5 : -1.5), z: roster.length === 1 ? 0 : (index < 2 ? -1.5 : 1.5), hp: maxHealth, maxHealth, facing: Math.PI, flash: 0, vx: 0, vz: 0, cooldown: 0, windup: 0, swing: 0, targetId: null };
    });
    this.localPlayerId = roster[0].id;
    this.enemies = []; this.events = []; this.phase = 'playing'; this.time = this.kills = this.swing = this.spawnClock = 0; this.targetId = null; this.seed = 42; this.nextId = 1; this.assisted = false;
    this.spawn(4);
    const introduced = (Object.keys(enemyTypes) as EnemyType[]).find(type => type !== 'goblin' && type !== 'boss' && enemyTypes[type].unlock === roundNumber);
    if (introduced) this.spawn(1, introduced);
    if (roundNumber % 5 === 0) this.spawn(1, 'boss');
  }
  emit(type: GameEvent['type'], actor: Actor, amount?: number, facing = this.player.facing) { this.events.push({ type, x: actor.x, z: actor.z, facing, amount, targetId: actor.id, enemyType: actor.enemyType }); }
  spawn(count: number, forcedType?: EnemyType) {
    for (let i = 0; i < count && this.enemies.length < this.config.maxEnemies; i++) {
      let x = 0, z = 0;
      for (let tries = 0; tries < 12; tries++) {
        const edge = Math.floor(this.random() * 4);
        x = edge < 2 ? (edge === 0 ? -1 : 1) * (this.config.arenaWidth / 2 - .6) : (this.random() - .5) * (this.config.arenaWidth - 1.2);
        z = edge >= 2 ? (edge === 2 ? -1 : 1) * (this.config.arenaLength / 2 - .6) : (this.random() - .5) * (this.config.arenaLength - 1.2);
        if (this.players.every(p => p.hp <= 0 || Math.hypot(x - p.x, z - p.z) >= 8)) break;
      }
      if (this.players.some(p => p.hp > 0 && Math.hypot(x - p.x, z - p.z) < 8)) continue;
      const available = (Object.keys(enemyTypes) as EnemyType[]).filter(type => type !== 'boss' && enemyTypes[type].unlock <= this.roundNumber);
      const enemyType = forcedType ?? available[Math.floor(this.random() * available.length)];
      const hp = enemyType === 'goblin' ? this.config.enemyHealth : enemyType === 'boss' ? enemyTypes.boss.health * (this.roundNumber === 10 ? 1.5 : 1) * (1 + (this.players.length - 1) * .5) : enemyTypes[enemyType].health;
      this.enemies.push({ id: this.nextId++, x, z, hp, maxHealth: hp, enemyType, facing: 0, flash: 0, vx: 0, vz: 0, cooldown: .7, windup: 0 });
    }
  }
  bound(a: Actor) { const radius = a.enemyType ? .5 * enemyTypes[a.enemyType].scale : .5; a.x = clamp(a.x, -this.config.arenaWidth / 2 + radius, this.config.arenaWidth / 2 - radius); a.z = clamp(a.z, -this.config.arenaLength / 2 + radius, this.config.arenaLength / 2 - radius); }
  killAll() { this.assisted = true; for (const e of this.enemies) this.emit('kill', e); this.kills += this.enemies.length; this.enemies = []; }
  step(dt: number, input: Input) {
    this.stepMultiplayer(dt, new Map([[this.player.id, input]]));
  }
  stepMultiplayer(dt: number, inputs: ReadonlyMap<number, Input>) {
    if (this.phase !== 'playing') return;
    const c = this.config;
    this.time = Math.min(c.duration, this.time + dt);
    if (this.time >= c.duration - 1e-8 && !this.enemies.some(e => e.enemyType === 'boss')) { this.time = c.duration; this.phase = 'complete'; this.emit('complete', this.player); return; }
    this.spawnClock -= dt;
    if (this.spawnClock <= 0 && this.time < c.duration) { this.spawn(1 + Math.floor(this.time / 15)); this.spawnClock = c.spawnInterval / (this.spawnScale * (1 + this.time / 40)); }
    for (const p of this.players) if (p.hp > 0) this.stepPlayer(dt, p, inputs.get(p.id) ?? { x: 0, z: 0 });
    this.stepEnemies(dt);
    if (this.players.every(p => p.hp <= 0)) this.phase = 'dead';
  }
  private stepPlayer(dt: number, p: Player, input: Input) {
    const c = this.config;
    const stats = characters[p.character];
    const speed = p.character === 'warrior' ? c.playerSpeed : stats.speed;
    const damage = (p.character === 'warrior' ? c.swordDamage : stats.damage) + p.weaponLevel * 10;
    const cooldown = p.character === 'warrior' ? c.swordCooldown : stats.cooldown;
    const length = Math.max(1, Math.hypot(input.x, input.z));
    p.vx = input.x / length * speed; p.vz = input.z / length * speed;
    p.x += p.vx * dt; p.z += p.vz * dt; this.bound(p);
    p.flash = Math.max(0, p.flash - dt); p.cooldown -= dt; p.swing = Math.max(0, p.swing - dt);
    let nearest: Actor | undefined; let distance = Infinity;
    for (const e of this.enemies) { const d = Math.hypot(e.x - p.x, e.z - p.z); if (d < distance) { distance = d; nearest = e; } }
    p.targetId = nearest?.id ?? null;
    // Keep the committed swing direction through wind-up and follow-through.
    // Without a target, retain the last facing instead of turning with movement.
    if (p.windup <= 0 && p.swing <= 0 && nearest) p.facing = Math.atan2(nearest.x - p.x, nearest.z - p.z);
    if (p.windup > 0) {
      p.windup -= dt;
      if (p.windup <= 0) {
        p.swing = .23; this.emit('swing', p, undefined, p.facing);
        for (const e of this.enemies) {
          const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz);
          const angle = Math.atan2(Math.sin(Math.atan2(dx, dz) - p.facing), Math.cos(Math.atan2(dx, dz) - p.facing));
          if (d <= c.swordRange && Math.abs(angle) <= c.swordArc * Math.PI / 360) {
            const dealt = Math.min(e.hp, damage);
            p.stats.totalDamage += dealt; p.stats.damageByWeapon['weapon.longsword'] = (p.stats.damageByWeapon['weapon.longsword'] ?? 0) + dealt;
            e.hp -= damage; e.flash = .18; e.windup = 0; e.cooldown = Math.max(e.cooldown, .35);
            e.vx = dx / Math.max(d, .01) * c.knockback; e.vz = dz / Math.max(d, .01) * c.knockback;
            this.emit('hit', e, damage, p.facing);
            if (e.hp <= 0) { this.kills++; p.stats.kills++; this.emit('kill', e, undefined, p.facing); }
          }
        }
        this.enemies = this.enemies.filter(e => e.hp > 0);
      }
    } else if (nearest && distance <= c.swordRange && p.cooldown <= 0 && p.swing <= 0) { p.windup = c.swordWindup; p.cooldown = cooldown; }
  }
  private stepEnemies(dt: number) {
    const c = this.config;
    for (const e of this.enemies) {
      const definition = enemyTypes[e.enemyType ?? 'goblin'];
      const contactRange = c.contactRange + (definition.scale - 1) * .45;
      const living = this.players.filter(p => p.hp > 0);
      let p = e.windup > 0 ? living.find(p => p.id === e.attackTargetId) : undefined;
      if (!p) { e.windup = 0; p = living.reduce<Player | undefined>((best, candidate) => !best || Math.hypot(candidate.x - e.x, candidate.z - e.z) < Math.hypot(best.x - e.x, best.z - e.z) ? candidate : best, undefined); }
      if (!p) continue;
      let dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx, dz);
      e.facing = Math.atan2(dx, dz); e.flash = Math.max(0, e.flash - dt); e.cooldown -= dt;
      if (e.windup > 0) {
        e.windup -= dt;
        if (e.windup <= 0) {
          if (d <= contactRange + .25 && p.flash <= 0) {
            const baseDamage = e.enemyType === 'goblin' || !e.enemyType ? c.enemyDamage : definition.damage;
            const damage = baseDamage <= 0 ? 0 : Math.max(1, baseDamage - p.armorLevel * 2);
            p.stats.damageTaken += Math.min(p.hp, damage); p.hp = Math.max(0, p.hp - damage); p.flash = .35; this.emit('hurt', p);
          }
          e.cooldown = c.contactCooldown;
        }
      } else if (d < contactRange && e.cooldown <= 0) { e.windup = c.contactWindup; e.attackTargetId = p.id; }
      const speed = e.windup > 0 || d < contactRange - .3 ? 0 : e.enemyType === 'goblin' || !e.enemyType ? c.enemySpeed : definition.speed;
      e.x += (dx / Math.max(.01, d) * speed + e.vx) * dt; e.z += (dz / Math.max(.01, d) * speed + e.vz) * dt;
      e.vx *= Math.exp(-10 * dt); e.vz *= Math.exp(-10 * dt); this.bound(e);
    }
    // Lightweight planar separation; corpses never participate in collision or combat.
    for (let i = 0; i < this.enemies.length; i++) {
      const a = this.enemies[i];
      for (let j = i + 1; j < this.enemies.length; j++) {
        const b = this.enemies[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
        const separation = .39 * (enemyTypes[a.enemyType ?? 'goblin'].scale + enemyTypes[b.enemyType ?? 'goblin'].scale);
        if (d < separation) { const push = (separation - d) * .5, nx = d > .001 ? dx / d : 1, nz = d > .001 ? dz / d : 0; a.x -= nx * push; a.z -= nz * push; b.x += nx * push; b.z += nz * push; }
      }
      for (const p of this.players) if (p.hp > 0) {
        const dx = a.x - p.x, dz = a.z - p.z, d = Math.hypot(dx, dz);
        const separation = .46 + .39 * enemyTypes[a.enemyType ?? 'goblin'].scale;
        if (d < separation) { a.x = p.x + (d > .001 ? dx / d : 1) * separation; a.z = p.z + (d > .001 ? dz / d : 0) * separation; }
      }
      this.bound(a);
    }
  }
}
