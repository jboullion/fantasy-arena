# Prototype 0.1 — Implementation & Playtest

Implemented September 6, 2026. The existing concept and architecture documents remain the design references.

## Implemented slice

- Immediately playable forest clearing; human warrior, longsword, goblin grunt.
- Camera-relative WASD/arrow keys and standard gamepad left stick. Immediate movement, normalized diagonals, independent target-facing, planar arena collision.
- Fixed 60 Hz standalone simulation with seeded spawning and plain data entities.
- Nearest-target automatic sword attack: 120 ms wind-up, 130-degree multi-target arc, 25 damage, 2.7 m reach, 850 ms cooldown, directional knockback.
- Goblin pursuit and circle separation. Contact attacks telegraph for 450 ms and recheck distance at impact, with a 1.2-second enemy cooldown and brief player damage protection.
- Edge spawns stay at least 8 m from the player; group size and spawn frequency rise over four 15-second phases.
- 100 player HP, 50 goblin HP, 10 contact damage; 60-second survive/death/restart loop.
- Swing arc, target ring, hit flash, orange attack warning, impact particles, damage vignette and synthesized swing/impact/death/hurt/completion sounds.
- Temporary Rapier rigid-body corpses, excluded from combat, capped at 20 and cleaned up after roughly one second.
- Minimal DOM health/timer/kills HUD; pause on focus loss, mute, restart, device-sensitive prompts, collapsible live tuning and stress presets.

## Scope decisions

The monorepo uses npm workspaces, an allowed alternative to the architecture document's pnpm recommendation. React 19 and R3F 9 are paired according to the [R3F installation guide](https://r3f.docs.pmnd.rs/getting-started/installation). Rapier is used through the R3F wrapper for presentation physics; [Rapier's JavaScript guide](https://rapier.rs/docs/user_guides/javascript/getting_started_js/) documents its WebAssembly runtime.

Living entities use inexpensive planar collision/separation rather than individual Rapier bodies. This keeps simulation headless and predictable for the empty arena. Corpses use a single rigid body each; articulated/jointed ragdolls remain deferred. The corpse experiment can establish whether thrown deaths are promising, but cannot settle whether articulated ragdolls justify their cost.

No progression, multiplayer, shops, bosses, dodges, additional weapons, obstacles or polished asset pipeline was added. Camera shake remains deferred. The sword arc, flashes, knockback, floating damage numbers and sounds provide the feedback baseline.

### Combat feedback iteration

The warrior now faces the nearest living goblin regardless of attack range. Movement no longer overrides facing; with no enemies, the warrior retains his last facing. Wind-up and follow-through retain the committed swing direction, and attacks still require a target within sword range.

Each goblin hit emits its damage amount and target ID. Gold numbers appear above the struck goblin, follow its knockback, rise and fade over 0.9 seconds. Killing blows also display their attack damage (including overkill). Numbers freeze on pause and clear on restart. A bounded pool of 128 labels avoids per-frame React updates.

This iteration adds three simulation regression tests (13 total) and `node tests/combat-feedback.mjs` for cleave/kill labels, displayed values, fade and restart cleanup.

## Verification

- `npm run build`: TypeScript and production build pass. Vite reports a large JavaScript chunk (about 3.35 MB uncompressed / 1.14 MB gzip), largely from Three.js and Rapier. Loading-size optimization is still open.
- `npm test`: 10 passing simulation tests covering normalized movement, boundaries, pause, pursuit, multi-target forward arc, death removal/events, evadable contact, player death/reset, full 60-second timing, spawn safety/cap/escalation and seeded reproducibility.
- `npm run test:browser`: Chromium passes movement, pause/resume, a controlled kill, player death, restart, completion transition, live tuning and stress controls, and a 640 × 740 layout check. No uncaught browser errors.
- `node tests/input.mjs`: browser Gamepad API stub verifies dead zone, analog movement, prompt switching, held-button edge detection, confirm/resume and focus-loss pause. A physical gamepad has **not** been tested.
- Screenshots inspected for initial desktop state, narrow layout, active combat, death and 200-enemy stress. The center of the arena remains unobstructed by the normal HUD. Tuning occupies the right side only while open.

### Performance sample

Chromium, 1440 × 900 viewport, capped device pixel ratio, NVIDIA GeForce RTX 3070 via ANGLE/D3D11. Each count was measured for 120 rendered frames after warm-up. Damage was disabled to preserve exact enemy counts; these are short movement/separation/render samples, not worst-case corpse-heavy combat benchmarks.

| Enemies | Mean FPS | Frame time p95 | Sampled simulation cost p95 |
| ---: | ---: | ---: | ---: |
| 25 | 60.3 | 20.2 ms | 0.10 ms |
| 50 | 59.9 | 20.6 ms | 0.10 ms |
| 100 | 60.2 | 20.1 ms | 0.60 ms |
| 200 | 60.0 | 21.0 ms | 1.80 ms |

The simulation metric measures accumulated fixed-step work for a render frame, sampled by the HUD; it is not a precise per-tick profiler. The all-pairs separation loop grows quadratically and is the obvious future simulation pressure point. Rendering uses instancing for living goblins. These measurements do not establish 60 FPS on integrated graphics or mobile devices.

### First combat observations

A keyboard-driven circular route at approximately 3 m/s died after 40.05 seconds, with 43 kills and 35 goblins still alive. The route deliberately ignored threat positions. That demonstrates meaningful crowd pressure, rather than proving a human difficulty target.

A second, faster keyboard-driven route completed the full 60-second round with 70 health, 13 kills and 170 living goblins. Both routes used the default gameplay values with no healing or debug intervention. Fast movement enabled survival while the slower route produced more melee kills. This is an initial positioning-versus-engagement observation, not a substitute for human feedback about fun.

The inspected combat frame showed the target ring and contact warnings clearly; the hit vignette communicated low-health damage without hiding nearby goblins. The visual baseline is deliberately primitive. Whether automatic facing and frequent cleaving feel satisfying still needs a human playtest.

## Next human playtest

Play three unassisted rounds before tuning. Record survival time, kills, and one sentence about each death. Then change one variable at a time:

1. Is 7 m/s movement comfortable, or does it make avoiding combat too easy?
2. Does a 2.7 m sword with a 130-degree arc make automatic target choice understandable?
3. Can you react to the orange contact warning while looking ahead?
4. Are threats visible early enough near the arena edges? Adjust camera height/distance independently.
5. Does the 30–60-second pressure ramp feel exciting or abrupt?
6. Do thrown corpses and sound improve impact enough to pursue richer ragdolls/audio?

Hardware gamepad, subjective sound/feel, integrated-GPU performance, articulated ragdolls, and longer stress sampling remain follow-up work. Touch controls are outside this desktop slice.
