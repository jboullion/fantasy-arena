export const defaults = {
  playerHealth: 100, playerSpeed: 7, enemyHealth: 50, enemySpeed: 2.8,
  enemyDamage: 10, contactRange: 1.1, contactWindup: 0.45, contactCooldown: 1.2,
  swordDamage: 25, swordRange: 2.7, swordCooldown: 0.85, swordArc: 130,
  swordWindup: 0.12, knockback: 7, duration: 60, spawnInterval: 1.6,
  maxEnemies: 200, arenaWidth: 32, arenaLength: 28,
  cameraHeight: 19, cameraDistance: 16, cameraFov: 48, cameraSmoothing: 5,
};
export type Config = typeof defaults;
export const characters = {
  warrior: { name: 'Human Warrior', title: 'The balanced blade', description: 'Quick on his feet. A sweeping longsword keeps the horde at bay.', health: 100, speed: 7, damage: 25, cooldown: .85, color: '#6b99af' },
  guardian: { name: 'Dwarf Guardian', title: 'Stand your ground', description: 'More health and heavier hits, with a slower stride and sword swing.', health: 140, speed: 5.8, damage: 35, cooldown: 1.05, color: '#bc8b50' },
};
export type CharacterId = keyof typeof characters;
export const enemyTypes = {
  goblin: { name: 'Goblin Grunt', unlock: 1, health: 50, speed: 2.8, damage: 10, scale: 1, color: '#647f40' },
  runner: { name: 'Ember Runner', unlock: 3, health: 35, speed: 4.3, damage: 8, scale: .8, color: '#c87943' },
  brute: { name: 'Stone Brute', unlock: 6, health: 120, speed: 2, damage: 18, scale: 1.35, color: '#9a779d' },
  revenant: { name: 'Frost Revenant', unlock: 9, health: 85, speed: 3.5, damage: 15, scale: 1.1, color: '#71b8cc' },
  boss: { name: 'Forest Warlord', unlock: 5, health: 650, speed: 2.1, damage: 25, scale: 2.3, color: '#cc5750' },
};
export type EnemyType = keyof typeof enemyTypes;
export const upgrades = {
  weapon: { name: 'Honed longsword', description: '+10 sword damage per rank.', baseCost: 80, costStep: 40, maxLevel: 5 },
  armor: { name: 'Forged plate', description: '+25 maximum health and 2 less damage taken per hit, per rank.', baseCost: 70, costStep: 35, maxLevel: 5 },
};
export type UpgradeId = keyof typeof upgrades;
export const runRules = { rounds: 10, reward: 100 };
export const definitions = { warrior: { id: 'character.warrior', name: 'Human Warrior' }, longsword: { id: 'weapon.longsword', tags: ['melee', 'physical', 'sword'] }, goblin: { id: 'enemy.goblin', name: 'Goblin Grunt' } };
