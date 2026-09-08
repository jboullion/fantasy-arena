# Ranged roster update

Archer and Mage are available in the lobby, tavern, combat, camp, results and run reports. Each has one automatic attack: an arrow or magic missile aimed at the nearest living enemy within 10 meters. Both have 100 health, speed 7 and a 0.85-second attack cooldown.

Archer and Mage base damage is **25**, matching the Human Warrior. The Dwarf retains its stronger **35**-damage sweep and carries only an axe. Elemental replacement weapons apply burn, splash, weakening or slow effects; the former weapon-rank purchase has been replaced by two class-specific equipment offers. See `assets/characters/README.md` for the armory and purchase rules.

Projectiles travel at 18 m/s (arrow) or 12 m/s (missile), track the selected target and apply damage only on arrival. They never pierce or cleave. If another attack kills their target they disappear without retargeting; expiry, reset, completion and departure cleanup prevent stale hits. The authoritative simulation owns projectiles and includes them in multiplayer snapshots. Each client renders the shared projectile state as instanced GLB meshes. Ranged attacks use a shooting cue and omit the melee sweep arc.

Spawn pressure is eased for this first single-target playtest: interval 1.6 to 2.4 seconds, batches rise every 30 rather than 15 seconds, and acceleration ramps over 60 rather than 40 seconds. In an empty stationary first-round fixture this schedules about 62 enemies instead of 183 over 60 seconds, including the four starting enemies. Enemy health, contact damage, unlock rounds and bosses remain the same. This is an initial balance setting; playtesting should determine whether to raise pressure again.

The full asset source is assets/characters/fantasy-arena-roster.blend; the previous blend is preserved. See assets/characters/README.md for mesh budgets, attachment names, regeneration and physics details.

Verified locally: build, 39 unit tests, eleven GLBs with zero validator warnings/errors, four-class ten-round multiplayer flow, live quiver/hat-tip movement, bow/staff death detachment, single-target projectile instances, five enemy models, and existing corpse cleanup/200-enemy browser check. Browser fixtures are accelerated and do not replace a full human gameplay session.

Projectile rendering now interpolates timestamped snapshots with a 50 ms presentation buffer, using receipt time so motion continues during boss overtime. Brief packet gaps allow at most 50 ms extrapolation; authoritative removals and round transitions immediately clear the presentation history. Damage and hit timing are unchanged. Live frame sampling verified continuous instance movement between packets for both arrows and missiles.
