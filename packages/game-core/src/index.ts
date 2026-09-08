import { bossEncounter, defaults, characters, enemyTypes, isRanged, characterWeapons, getWeapon, type WeaponId, type Element, type EnemyType, type CharacterId, type Config } from '@arena/game-data';
import { createTerrain } from './terrain';
import { stepEnemyAction, type EnemyAI } from './enemyAI';
export { enemyBehaviors } from './enemyAI';
export { createTerrain } from './terrain';
export type Input = { x: number; z: number };
export type Actor = { id: number; x: number; z: number; hp: number; facing: number; flash: number; vx: number; vz: number; cooldown: number; windup: number; attackTargetId?: number; enemyType?: EnemyType; maxHealth?: number; burn?: { remaining: number; nextTick: number; ownerId: number; weaponId: string }; poisoned?: number; chilled?: number; ai?: EnemyAI };
export type CombatStats = { totalDamage: number; damageByWeapon: Record<string, number>; damageByType?: Record<string,number>; kills: number; damageTaken: number };
export const emptyStats = (character: CharacterId = 'warrior'): CombatStats => ({ totalDamage: 0, damageByWeapon: { [characterWeapons[character]]: 0 }, damageByType:{physical:0}, kills: 0, damageTaken: 0 });
export type Player = Actor & { name: string; character: CharacterId; equippedWeapon?: WeaponId; maxHealth: number; swing: number; targetId: number | null; weaponLevel: number; armorLevel: number; stats: CombatStats };
export type PlayerSetup = { id: number; name: string; character: CharacterId; equippedWeapon?: WeaponId; weaponLevel?: number; armorLevel?: number; stats?: CombatStats };
export type Projectile = { id: number; ownerId: number; targetId: number; kind: 'arrow' | 'magic_missile'; x: number; z: number; facing: number; speed: number; damage: number; life: number; weaponId?: string; element?: Element };
export type GameEvent = { type: 'swing' | 'shoot' | 'hit' | 'kill' | 'hurt' | 'complete'; x: number; z: number; facing: number; amount?: number; targetId?: number; enemyType?: EnemyType; element?: Element; knockbackFacing?: number };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export class Simulation {
  config: Config;
  private terrainKey = '';
  private terrainCache?: ReturnType<typeof createTerrain>;
  get terrain() { const key = `${this.config.arenaWidth}:${this.config.arenaLength}`; if (key !== this.terrainKey) { this.terrainCache = createTerrain(this.config.arenaWidth, this.config.arenaLength); this.terrainKey = key; } return this.terrainCache!; }
  players: Player[] = [];
  localPlayerId = 0;
  get player() { return this.players.find(p => p.id === this.localPlayerId) ?? this.players[0]; }
  get targetId() { return this.player.targetId; }
  set targetId(value: number | null) { this.player.targetId = value; }
  get swing() { return this.player.swing; }
  set swing(value: number) { this.player.swing = value; }
  enemies: Actor[] = [];
  projectiles: Projectile[] = [];
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
      return { ...entry, weaponLevel: entry.weaponLevel ?? 0, armorLevel: entry.armorLevel ?? 0, stats: entry.stats ? structuredClone(entry.stats) : emptyStats(entry.character), x: roster.length === 1 ? 0 : (index % 2 ? 1.5 : -1.5), z: roster.length === 1 ? 0 : (index < 2 ? -1.5 : 1.5), hp: maxHealth, maxHealth, facing: Math.PI, flash: 0, vx: 0, vz: 0, cooldown: 0, windup: 0, swing: 0, targetId: null };
    });
    this.localPlayerId = roster[0].id;
    this.enemies = []; this.projectiles = []; this.events = []; this.phase = 'playing'; this.time = this.kills = this.swing = this.spawnClock = 0; this.targetId = null; this.seed = 42; this.nextId = 1; this.assisted = false;
    this.spawnGoblinPack();
    this.spawnClock = this.encounterInterval(7.5);
    const introduced = (Object.keys(enemyTypes) as EnemyType[]).find(type => type !== 'goblin' && type !== 'boss' && enemyTypes[type].unlock === roundNumber);
    if (introduced) this.spawn(1, introduced);
    if (bossEncounter(roundNumber)) this.spawn(1, 'boss');
  }
  emit(type: GameEvent['type'], actor: Actor, amount?: number, facing = this.player.facing) { this.events.push({ type, x: actor.x, z: actor.z, facing, amount, targetId: actor.id, enemyType: actor.enemyType }); }
  private encounterInterval(count: number) {
    return this.config.spawnInterval * count / (this.spawnScale * (1 + this.time / 60) * (1 + Math.floor(this.time / 30)));
  }
  /** Atomic packs: never trickle the last 1–4 goblins in when near the cap. */
  spawnGoblinPack() {
    const capacity = this.config.maxEnemies - this.enemies.length;
    if (capacity < 5) return 0;
    const count = Math.min(capacity, 5 + Math.floor(this.random() * 6));
    for (let attempt = 0; attempt < 24; attempt++) {
      const edge = Math.floor(this.random() * 4), horizontal = edge >= 2;
      const along = (this.random() - .5) * Math.max(0, (horizontal ? this.config.arenaWidth : this.config.arenaLength) - 12);
      const positions = Array.from({ length: count }, (_, i) => {
        const tangent = along + (i % 5 - 2) * 1.15;
        const inward = 1.2 + Math.floor(i / 5) * 1.15;
        return horizontal ? { x: tangent, z: (edge === 2 ? -1 : 1) * (this.config.arenaLength / 2 - inward) } : { x: (edge === 0 ? -1 : 1) * (this.config.arenaWidth / 2 - inward), z: tangent };
      });
      if (positions.some(a => Math.abs(a.x) > this.config.arenaWidth / 2 - .5 || Math.abs(a.z) > this.config.arenaLength / 2 - .5 || this.players.some(p => p.hp > 0 && Math.hypot(a.x-p.x,a.z-p.z) < 8) || this.terrain.obstacles.some(o => Math.hypot(a.x-o.x,a.z-o.z) < o.radius+.5) || this.enemies.some(e => Math.hypot(a.x-e.x,a.z-e.z) < 1))) continue;
      for (const p of positions) this.addEnemy('goblin', p.x, p.z);
      return count;
    }
    return 0;
  }
  private addEnemy(enemyType: EnemyType, x: number, z: number) {
    const hp = enemyType === 'goblin' ? this.config.enemyHealth : enemyType === 'boss' ? enemyTypes.boss.health * (bossEncounter(this.roundNumber)?.healthMultiplier ?? 1) * (1 + (this.players.length - 1) * .5) : enemyTypes[enemyType].health;
    this.enemies.push({ id: this.nextId++, x, z, hp, maxHealth: hp, enemyType, facing: 0, flash: 0, vx: 0, vz: 0, cooldown: .7, windup: 0 });
  }
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
      this.addEnemy(enemyType, x, z);
    }
  }
  bound(a: Actor) {
    const radius = a.enemyType ? .5 * enemyTypes[a.enemyType].scale : .5;
    a.x = clamp(a.x, -this.config.arenaWidth / 2 + radius, this.config.arenaWidth / 2 - radius); a.z = clamp(a.z, -this.config.arenaLength / 2 + radius, this.config.arenaLength / 2 - radius);
    for (const o of this.terrain.obstacles) { const dx=a.x-o.x, dz=a.z-o.z, d=Math.hypot(dx,dz), r=radius+o.radius; if(d<r) { a.x=o.x+(d>.0001?dx/d:1)*r; a.z=o.z+(d>.0001?dz/d:0)*r; } }
  }
  private move(a: Actor, dx: number, dz: number) { const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.2)); for(let i=0;i<steps;i++){ a.x+=dx/steps; a.z+=dz/steps; this.bound(a); } }
  killAll() { this.assisted = true; for (const e of this.enemies) this.emit('kill', e, undefined, e.facing); this.kills += this.enemies.length; this.enemies = []; }
  step(dt: number, input: Input) {
    this.stepMultiplayer(dt, new Map([[this.player.id, input]]));
  }
  stepMultiplayer(dt: number, inputs: ReadonlyMap<number, Input>) {
    if (this.phase !== 'playing') return;
    const c = this.config;
    this.time = Math.min(c.duration, this.time + dt);
    if (this.time >= c.duration - 1e-8 && !this.enemies.some(e => e.enemyType === 'boss')) { this.time = c.duration; this.projectiles = []; this.phase = 'complete'; this.emit('complete', this.player); return; }
    this.spawnClock -= dt;
    if (this.spawnClock <= 0 && this.time < c.duration) {
      const available = (Object.keys(enemyTypes) as EnemyType[]).filter(type => type !== 'boss' && enemyTypes[type].unlock <= this.roundNumber);
      const type = available[Math.floor(this.random() * available.length)];
      if (type === 'goblin') { const count = this.spawnGoblinPack(); this.spawnClock = count ? this.encounterInterval(count) : .5; }
      else { this.spawn(1, type); this.spawnClock = this.encounterInterval(1); }
    }
    this.stepStatuses(dt);
    for (const p of this.players) if (p.hp > 0) this.stepPlayer(dt, p, inputs.get(p.id) ?? { x: 0, z: 0 });
    this.stepProjectiles(dt);
    this.stepEnemies(dt);
    if (this.players.every(p => p.hp <= 0)) { this.phase = 'dead'; this.projectiles = []; }
  }
  private stepPlayer(dt: number, p: Player, input: Input) {
    const c = this.config;
    const stats = characters[p.character];
    p.chilled=Math.max(0,(p.chilled??0)-dt);
    const speed = (p.character === 'warrior' ? c.playerSpeed : stats.speed) * ((p.chilled??0)>0 ? .65 : 1);
    const ranged = isRanged(p.character);
    const weapon=getWeapon(p.equippedWeapon);
    const baseDamage = p.character === 'guardian' ? stats.damage : c.swordDamage;
    const damage = baseDamage;
    const range = ranged ? c.projectileRange : c.swordRange;
    const cooldown = p.character === 'warrior' ? c.swordCooldown : stats.cooldown;
    const length = Math.max(1, Math.hypot(input.x, input.z));
    p.vx = input.x / length * speed; p.vz = input.z / length * speed;
    this.move(p, p.vx * dt, p.vz * dt);
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
        if (ranged) {
          if (nearest && distance <= range) {
            p.facing = Math.atan2(nearest.x - p.x, nearest.z - p.z);
            const kind = p.character === 'archer' ? 'arrow' : 'magic_missile';
            const speed = kind === 'arrow' ? c.arrowSpeed : c.missileSpeed;
            this.projectiles.push({ id: this.nextId++, ownerId: p.id, targetId: nearest.id, kind, x: p.x, z: p.z, facing: p.facing, speed, damage, life: range / speed + .5, weaponId:p.equippedWeapon??characterWeapons[p.character],element:weapon?.element });
            p.swing = .23; this.emit('shoot', p, undefined, p.facing);
          }
          return;
        }
        p.swing = .23; this.emit('swing', p, undefined, p.facing);
        for (const e of this.enemies) {
          const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz);
          const angle = Math.atan2(Math.sin(Math.atan2(dx, dz) - p.facing), Math.cos(Math.atan2(dx, dz) - p.facing));
          if (d <= c.swordRange && Math.abs(angle) <= c.swordArc * Math.PI / 360) {
            this.elementalHit(p, e, damage, p.facing, p.equippedWeapon, weapon?.element);
          }
        }
        this.enemies = this.enemies.filter(e => e.hp > 0);
      }
    } else if (nearest && distance <= range && p.cooldown <= 0 && p.swing <= 0) { p.windup = c.swordWindup; p.cooldown = cooldown; }
  }
  private damageEnemy(p: Player, e: Actor, damage: number, facing: number, weaponId?: string, element?: Element, elementalDamage=0, impact=true) {
    if (e.hp <= 0) return;
    const dealt = Math.min(e.hp, damage), weapon = weaponId ?? characterWeapons[p.character];
    p.stats.totalDamage += dealt; p.stats.damageByWeapon[weapon] = (p.stats.damageByWeapon[weapon] ?? 0) + dealt;
    const byType=p.stats.damageByType??={};
    const elemental=element ? Math.min(dealt,elementalDamage*dealt/Math.max(damage,.01)) : 0;
    byType.physical=(byType.physical??0)+dealt-elemental;
    if(element)byType[element]=(byType[element]??0)+elemental;
    e.hp -= damage; e.flash = .18;
    if (impact) { e.windup = 0; e.cooldown = Math.max(e.cooldown, .35); }
    const dx=e.x-p.x, dz=e.z-p.z, distance=Math.max(.01,Math.hypot(dx,dz));
    if (impact) { e.vx = dx/distance * this.config.knockback; e.vz = dz/distance * this.config.knockback; }
    this.emit('hit', e, damage, facing);
    if(element)this.events[this.events.length-1].element=element;
    if (e.hp <= 0) { this.kills++; p.stats.kills++; this.emit('kill', e, undefined, e.facing); this.events[this.events.length-1].knockbackFacing = impact ? (Math.hypot(dx,dz)>.01 ? Math.atan2(dx,dz) : facing) : e.facing+Math.PI; }
  }
  private elementalHit(p: Player, e: Actor, damage: number, facing: number, weaponId?: string, element?: Element) {
    if (e.hp <= 0) return;
    this.damageEnemy(p,e,damage,facing,weaponId,element);
    const c=this.config;
    if (element==='lightning') {
      // Splash excludes the direct target and cannot trigger another elemental hit.
      for (const nearby of this.enemies) if (nearby!==e && nearby.hp>0 && Math.hypot(nearby.x-e.x,nearby.z-e.z)<=c.lightningRadius)
        this.damageEnemy(p,nearby,c.lightningDamage,facing,weaponId,'lightning',c.lightningDamage,false);
    }
    if (e.hp<=0) return;
    if (element==='fire') e.burn={remaining:c.fireDuration,nextTick:e.burn?.nextTick??Math.max(.01,c.fireTickInterval),ownerId:p.id,weaponId:weaponId??characterWeapons[p.character]};
    if (element==='poison') e.poisoned=c.poisonDuration;
    if (element==='ice') e.chilled=c.iceDuration;
  }
  private stepStatuses(dt: number) {
    for (const e of this.enemies) {
      e.poisoned=Math.max(0,(e.poisoned??0)-dt);
      e.chilled=Math.max(0,(e.chilled??0)-dt);
      const burn=e.burn;
      if (!burn) continue;
      burn.nextTick-=Math.min(dt,burn.remaining);burn.remaining-=dt;
      const owner=this.players.find(p=>p.id===burn.ownerId);
      while (burn.nextTick<=1e-8 && e.hp>0 && owner) {
        this.damageEnemy(owner,e,this.config.fireTickDamage,e.facing,burn.weaponId,'fire',this.config.fireTickDamage,false);
        burn.nextTick+=Math.max(.01,this.config.fireTickInterval);
      }
      if (burn.remaining<=1e-8 || !owner) delete e.burn;
    }
    this.enemies=this.enemies.filter(e=>e.hp>0);
  }
  private stepProjectiles(dt: number) {
    this.projectiles = this.projectiles.filter(shot => {
      const owner = this.players.find(p => p.id === shot.ownerId);
      const target = this.enemies.find(e => e.id === shot.targetId && e.hp > 0);
      shot.life -= dt;
      if (!owner || !target || shot.life <= 0) return false;
      // Guided shots keep their original target; another player's kill never retargets a shot.
      shot.facing = Math.atan2(target.x - shot.x, target.z - shot.z);
      const distance = Math.hypot(target.x - shot.x, target.z - shot.z);
      if (distance <= shot.speed * dt + .3) {
        this.elementalHit(owner, target, shot.damage, shot.facing, shot.weaponId, shot.element);
        return false;
      }
      shot.x += Math.sin(shot.facing) * shot.speed * dt;
      shot.z += Math.cos(shot.facing) * shot.speed * dt;
      return true;
    });
    this.enemies = this.enemies.filter(e => e.hp > 0);
  }
  private hurtPlayer(e: Actor, p: Player, baseDamage: number) {
    if(p.hp<=0 || p.flash>0)return;
    const damage=baseDamage<=0?0:Math.max(1,baseDamage*((e.poisoned??0)>0?this.config.poisonDamageMultiplier:1)-p.armorLevel*2);
    p.stats.damageTaken+=Math.min(p.hp,damage);p.hp=Math.max(0,p.hp-damage);p.flash=.35;this.emit('hurt',p);
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
      if(stepEnemyAction(e,p,dt,{players:this.players,move:(actor,x,z)=>this.move(actor,x,z),hurt:(enemy,player,damage)=>this.hurtPlayer(enemy,player,damage),summon:()=>{if(this.time<this.config.duration)this.spawnGoblinPack();},slowMultiplier:c.iceSpeedMultiplier})) {
        this.move(e,e.vx*dt,e.vz*dt);e.vx*=Math.exp(-10*dt);e.vz*=Math.exp(-10*dt);continue;
      }
      if (e.windup > 0) {
        e.windup -= dt;
        if (e.windup <= 0) {
          if (d <= contactRange + .25 && p.flash <= 0) {
            const baseDamage = e.enemyType === 'goblin' || !e.enemyType ? c.enemyDamage : definition.damage;
            this.hurtPlayer(e,p,baseDamage);
          }
          e.cooldown = c.contactCooldown;
        }
      } else if (d < contactRange && e.cooldown <= 0) { e.windup = c.contactWindup; e.attackTargetId = p.id; }
      let baseSpeed = e.windup > 0 || d < contactRange - .3 ? 0 : e.enemyType === 'goblin' || !e.enemyType ? c.enemySpeed : definition.speed;
      if(e.enemyType==='runner' && d>3) {const side=e.id%2?1:-1, x=dx;dx=dx*.9-dz*.44*side;dz=dz*.9+x*.44*side;}
      if(e.enemyType==='revenant' && e.windup<=0) {
        baseSpeed=definition.speed;
        if(d<5){dx=-dx;dz=-dz;}
        else if(d<=7){const x=dx;dx=-dz;dz=x;}
      }
      const speed=baseSpeed*((e.chilled??0)>0 ? c.iceSpeedMultiplier : 1);
      // Pick a stable side of a blocking obstacle and follow its perimeter.
      const blocking = this.terrain.obstacles.map(o => ({o,t:((o.x-e.x)*dx+(o.z-e.z)*dz)/Math.max(.01,d*d)})).filter(({o,t}) => t>0 && t<1 && Math.hypot(e.x+dx*t-o.x,e.z+dz*t-o.z)<o.radius+.5*definition.scale+.35).sort((a,b)=>a.t-b.t)[0];
      if(blocking) { const o=blocking.o, r=o.radius+.5*definition.scale+.65, angle=Math.atan2(e.z-o.z,e.x-o.x)+(e.id%2?1:-1)*.65; dx=o.x+Math.cos(angle)*r-e.x; dz=o.z+Math.sin(angle)*r-e.z; d=Math.hypot(dx,dz); }
      this.move(e, (dx / Math.max(.01, d) * speed + e.vx) * dt, (dz / Math.max(.01, d) * speed + e.vz) * dt);
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
    // Later separation pairs may displace an actor already processed above.
    for (const enemy of this.enemies) this.bound(enemy);
  }
}
