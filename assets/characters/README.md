# Fantasy Arena expanded roster

Open **fantasy-arena-roster.blend**, scene **Fantasy Arena Expanded Roster**. It contains four heroes, five enemies, an arrow and a magic missile. roster-lineup.png is the rendered reference. The older fantasy-arena-characters.blend is preserved separately.

These are original procedural Blender models authored for this project. No downloaded art, textures or paid providers were used. No separate redistribution license is assigned. Rebuild with scripts/create-roster-assets.py in Blender's Python console or through Blender MCP; its ROOT points to this checkout. Rebuilding writes roster GLBs, the shared manifest and expanded blend file. The older generator produces only the original three-model set.

## Asset contract

GLBs live in apps/client/public/models/roster, with shared apps/client/public/models/manifest.json. Coordinates are meters, Y up, +Z forward in game; the script converts to Blender Z up. Models are segmented rigid meshes, each parented to an editable skeleton in the blend source. They are not continuously deforming skinned characters. GLBs contain separate meshes, vertex colors and stable extras.part identifiers.

| Model | Triangles | Parts | GLB bytes |
| --- | ---: | ---: | ---: |
| Warrior | 1,972 | 14 | 175,220 |
| Dwarf Guardian | 2,156 | 15 | 191,188 |
| Archer | 2,408 | 13 | 210,088 |
| Mage | 2,072 | 13 | 181,200 |
| Goblin Grunt | 1,696 | 13 | 149,540 |
| Ember Runner | 1,828 | 13 | 159,520 |
| Stone Brute | 1,896 | 13 | 165,488 |
| Frost Revenant | 1,784 | 13 | 156,224 |
| Forest Warlord | 2,028 | 13 | 174,692 |
| Arrow | 152 | 1 | 13,632 |
| Magic missile | 82 | 1 | 8,180 |

Enemy files have distinct geometry and palettes, plus runtime size multipliers from game-data. Living enemies are instanced per type and part; projectiles use one instanced batch per type.

## Movement and detachable weapons

The manifest defines pivots, collider sizes, parents and joint anchors. CharacterModels.tsx creates cosmetic Rapier physics in the game; Blender constraints are not baked into GLBs. During life, the Warrior's scabbard, Dwarf's two-piece beard, Archer's quiver and Mage's hat tip are hinged rigid bodies. The hat brim and lower crown are part of the head mesh and stay fixed. Living attachments use damped spring motors with limits of 0.10 radians (holster, upper beard, quiver), 0.12 (beard tip) and 0.18 (hat tip). A post-step projection keeps abrupt movement from exceeding the cosmetic hinge limits. Enemy belt talismans use a lightweight damped spring driven by movement while alive and Rapier hinges on death.

The weapon mesh is the sword, axe, bow or staff, attached to the right forearm by the living pose. Only the Warrior has a separate shield; the Dwarf carries an axe alone. Weapon entries have role weapon and **no death joint parent**. On death they receive independent velocity and angular velocity; body parts remain jointed. Future equipment can replace the mesh at this socket, with collider dimensions derived from geometry on death.

Ordinary enemy corpses are capped at eight for five seconds. Victory also turns surviving enemies into corpses. Player bodies persist until revival or scene exit. Corpse collision is ground-only. All physics is cosmetic: clients do not decide damage or enemy positions.

## Verification

- npm test: 66 simulation/run/presentation tests, including projectile range, travel, targeting, cooldowns, upgrades, kill attribution and cleanup.
- npm run test:assets: all 27 exports pass the Khronos validator with zero errors or warnings; checks pivots, part coverage, detachable weapons, vertex colors, under 4,000 triangles and under 250 KB per model. Hashes are recorded in test-results/character-assets.json.
- npm run test:roster: starts isolated Vite on 5175; checks moving quiver/hat tip, separate dropped bow/staff, finite ragdolls, projectile instances and five enemy meshes. Screenshots/report go to test-results.
- npm run test:physics: with Vite on 5174, checks original accessory/ragdoll behavior, corpse cleanup and 200-enemy rendering.
- npm run test:run: isolated server plus four browsers, one of each class, across ten rounds, purchases, victory, retry and reports.

The optional game-dev CLI was unavailable in this session; validation used the repository's local Khronos validator and real browser import/physics checks. This is a project-local asset set, not a game-dev registry package. Automated combat fixtures do not establish human balance or feel.

- npm run test:motion: checks bounded movement through starts/reversals and real 20 Hz multiplayer packets. Both projectile types must move between network snapshots.

## Elemental armory

The `Elemental Armory` scene in `fantasy-arena-roster.blend` contains 16 original replacement weapons: four swords, axes, bows and staffs, each in fire, lightning, ice and poison variants. `scripts/create-elemental-weapons.py` generates these socket-local GLBs under `apps/client/public/models/weapons`. `elemental-armory.png` is the rendered overview.

Between rounds each player receives two class-specific weapon offers, rotating through the four elements and excluding the current weapon. One replacement costs 80 gold and applies its elemental effect; base attack damage is unchanged. A purchase replaces the current weapon immediately at camp and persists through later rounds and retries. Armor ranks remain available separately. Fire ticks and lightning splash record effective elemental damage; direct hits remain physical. Poison and ice apply timed debuffs. The green Poison weapons reuse the existing acid-named GLB files and Blender meshes through an explicit model alias.

`npx tsx tests/equipment-browser.ts` verifies all 16 purchases and the four classes' replacement meshes and particles in multiplayer. `npm test` checks offer validation, cost, replacement, persistence and damage attribution for every weapon.

For a reproducible rebuild, run Blender with `--background --factory-startup --threads 1 --python-exit-code 1 --python scripts/create-roster-assets.py --python scripts/create-elemental-weapons.py`. Both scenes are saved in the same source file. Export uses the active scene with animations disabled; palette values stay slightly below 1 to avoid floating-point overshoot in bevel color interpolation.
