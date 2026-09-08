# Fantasy Arena — Prototype Slice 0.1

A playable 1–4 player, six-round survival prototype based on the design documents in `docs/`. Gather a party, choose a Human Warrior, Dwarf Guardian, Archer or Mage, and survive the forest clearing while improving your equipment between rounds.

## Run

Requires Node.js 22.12+ (tested on 24.12) and npm.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. `npm run dev` starts both Vite (5173) and the Colyseus game server (2567). The game opens at the lobby.

1. Enter your name, choose a character, and **Create lobby**.
2. Share the lobby code. Other players open the same site, enter their names, choose a character, and **Join lobby** with that code.
3. Everyone clicks **Ready up**. The host clicks **Launch Level 1**.
4. Move with WASD or a gamepad. All players fight the same enemies; damage, deaths, kills, and time come from the server.
5. Clear each 60-second round to earn **100 gold per player**. Shop, ready up, and let the host start the next round. Boss rounds also require killing the boss.
6. Clear round 6 to win. The same shop/report screen displays victory with purchasing disabled.

One to four players may launch, and character choices can repeat. Changing a name or character clears that player's ready state. A full lobby or an ongoing run rejects new joins. Purchases clear that player's ready state in the shop. After victory or defeat, the host can bring everyone back to the lobby. If the host leaves, the next remaining player becomes host.

For other computers on your LAN, use the **Network** URL printed by Vite, not `localhost` or `127.0.0.1`. Each player uses that URL and the same lobby code. Vite proxies HTTP/WebSocket traffic through `/multiplayer`, so browsers only need the frontend address. This is a local/LAN setup, not a publicly deployed internet game.

Click or press a key to unlock browser audio. Multiplayer continues when you open the menu or change tabs; your input stops. Leaving removes your avatar. A dropped connection returns you to the lobby entry screen; mid-round reconnection is not implemented.

The original offline combat lab remains available at http://127.0.0.1:5173/?sandbox=1 with immediate play, pause and tuning shortcuts.

```sh
npm run build
npm test
```

The static build is in `dist/`. For browser checks, keep the dev server running in another terminal:

```sh
npx playwright install chromium
npm run test:browser
node tests/multiplayer.mjs
node tests/server.mjs
npm run test:run
node tests/input.mjs
node tests/round.mjs
```

Browser scripts use an existing local Chromium installation when available, otherwise Playwright's installed Chromium. Screenshots and measurements go to ignored `test-results/`.

## Online hosting

The client runs on Netlify and the single Node/Colyseus server runs on Render Free. Both services use this repository's root directory so npm can resolve the shared workspaces.

- Play: https://fantasy-arena-test.netlify.app
- Server health: https://fantasy-arena-server.onrender.com/health

- **Render:** Node runtime, `npm ci --include=dev` build command, `npm run start:server` start command, `/health` health check, Node `22.12.0`, Free instance. `render.yaml` records these settings for a future Blueprint deployment. The server reads Render's `PORT` automatically.
- **Netlify:** `netlify.toml` sets `npm run build`, publishes `dist`, and records the public `VITE_MULTIPLAYER_URL` for the Render service (without `/multiplayer`). Update that value and redeploy if the server address changes. This URL is public client configuration, not a secret.
- Keep one game-server instance: active rooms live in its memory. Restarts and deployments end active matches. Browser-saved reports remain available.
- Render Free sleeps when idle and can take about a minute to wake. If connecting fails, wait and try again. Free hosting has usage limits and is intended here for trial playtests.
- Verify a deployed server with `ARENA_TEST_SERVER_URL=https://YOUR-SERVICE.onrender.com node tests/server.mjs` (PowerShell: set `$env:ARENA_TEST_SERVER_URL` first). This creates temporary test rooms and checks multiplayer behavior.

## Rounds, equipment and statistics

Rounds 2, 4 and 6 introduce Ember Runners, Stone Brutes and Frost Revenants, respectively; earlier types remain in the spawn pool. Round 3 adds a Forest Warlord mini boss (390 solo health); round 6 adds the major boss (975 solo health), alongside the newly introduced Frost Revenants. Both bosses scale health with party size. The arena and 60-second spawn-pressure pattern stay the same. When the timer expires with a boss alive, new spawning stops and the party must finish the boss.

Between clears, all remaining party members receive 100 gold, including fallen teammates. Each new round revives and fully heals the party. Equipment lasts for the current run only:

Each shop offers two weapons for the selected class. One purchase per visit costs 80 gold and replaces the current weapon immediately, including its visible camp and combat model. Four elemental variants exist for every sword, axe, bow and staff: fire, lightning, ice and poison. Elements apply effects instead of bonus impact damage: fire deals 5 damage every second for 5 seconds, lightning splashes 5 damage within 2 metres (excluding the direct target, with no chaining), poison halves enemy outgoing damage for 5 seconds, and ice halves movement speed for 5 seconds. Weapon particles, projectile trails, hit sparks and persistent status particles visualize the effects. Offers rotate between visits and exclude the currently equipped weapon. Durations refresh on repeat hits without stacking strength. Fire refreshes preserve the next scheduled tick and credit the most recent applier. Tuning lives in game-data defaults: fireTickDamage, fireTickInterval, fireDuration, lightningDamage, lightningRadius, poisonDuration, poisonDamageMultiplier, iceDuration and iceSpeedMultiplier.

Forged plate remains a separate armor upgrade: +25 maximum HP and 2 damage reduction per rank, starting at 70 gold and rising by 35 per rank, capped at five ranks.

The shop shows cumulative damage, damage by weapon and damage type, kills and damage taken. Damage totals exclude overkill. Every replacement weapon records its own damage total. Archer and Mage base attacks deal 25 damage; Dwarf's axe retains 35.


Run reports automatically save in the browser after each round. **Saved runs** shows the latest 20 reports, with a weapon breakdown; **Export run statistics** downloads JSON. Reports survive reloads and new runs. These are local reports, not account/cloud saves or resumable matches. Losing a run retains its statistics but grants no reward for the failed round.

## Controls

| Action | Keyboard | Standard gamepad |
| --- | --- | --- |
| Move | WASD / arrow keys | Left stick |
| Attack | Automatic | Automatic |
| Game menu (offline: pause) | Escape | Start / Menu |
| Offline resume / retry at result | Enter | A / Cross |
| Restart | R | — |
| Toggle tuning | F2 / backtick | — |
| Heal | H | — |
| Clear enemies | K | — |
| Adjust spawn pressure | + / − | — |

Restart, tuning, heal and clear shortcuts are available in the offline combat lab only. The tuning panel includes 25/50/100/200-enemy presets, combat sliders, camera controls, FPS, and simulation time. Debug interventions mark the current round as assisted. R preserves tuning; **Reset defaults & restart** restores all defaults. Goblin health changes apply to new spawns. Standard gamepad movement includes a radial dead zone and device-sensitive prompts. The lobby uses pointer/keyboard controls; touch movement and gamepad lobby navigation are not implemented.

## Boundaries

- `packages/game-core`: seeded, render-independent TypeScript simulation; movement, planar boundaries/separation, targeting, wind-up/arc damage, knockback, contact telegraphs, spawning and round state.
- `apps/server`: Colyseus rooms, four-seat membership, server-validated lobby actions and input, a fixed 60 Hz authoritative simulation, and 20 Hz world snapshots.
- `packages/game-data`: centralized starting values and stable character/weapon/enemy IDs. Arena width and length are editable here.
- `apps/client/src/runtime.ts`: fixed 60 Hz accumulator, events, low-frequency Zustand HUD snapshots, debug commands.
- `apps/client/src/input.ts`: keyboard and Gamepad API mapped to movement/actions.
- `apps/client/src/Scene.tsx`: R3F world, five instanced enemy types, instanced projectiles, weapon motion, particles, following camera and temporary Rapier physics corpses.
- `apps/client/src/audio.ts`: bounded synthesized placeholder sound cues.
- `apps/client/src/main.tsx`: DOM HUD, pause/results and tuning.
- `apps/client/src/Lobby.tsx` and `network.ts`: character/profile/party UI, connection lifecycle, room messages and lobby transitions.

Units are meters; Y is up; movement uses the XZ plane. The fixed camera faces along negative Z, so W moves toward the top of the screen. Movement and attack facing are independent. The simulation emits events; it never imports React, Three.js, Rapier, or browser APIs.

Blender-authored low-poly models now have articulated Rapier death ragdolls and independent dropped weapons. The warrior has a hinged scabbard, the dwarf has a two-part physics beard and detachable axe, the Archer has a hinged quiver, and the Mage has a fixed hat base and spring-supported tip. The expanded editable source is `assets/characters/fantasy-arena-roster.blend`. Enemy ragdolls are capped at eight and removed after five seconds; player ragdolls remain until revival or scene exit. Gameplay collisions still use circle separation and rectangular bounds, so cosmetic physics does not change authoritative combat. See `assets/characters/README.md` for the editable Blender source, GLB contract and verification commands.

Multiplayer sends movement inputs rather than client-owned positions or damage. Remote world positions are smoothed on the client; prediction, latency compensation, reconnect/resume, and schema-delta bandwidth optimization are follow-ups. `VITE_MULTIPLAYER_URL` can override the default same-origin proxy endpoint when using separate hosting. Run `npm run dev:server` and `npm run dev:client` separately if needed. The production client build is static; a reachable Node game server and reverse proxy are still required for multiplayer.

The fonts use an optional Google Fonts stylesheet with local serif/sans-serif fallbacks. Gameplay assets and placeholder audio are generated by code; no downloaded art is needed. Development builds expose `window.arena` for repeatable tests; production builds omit this hook.

See `docs/Ten-Round Run — Implementation & Verification.md` for the current run/shop/statistics behavior, `docs/Multiplayer Lobby — Implementation & Verification.md` for the networking foundation, and `docs/Prototype 0.1 — Implementation & Playtest.md` for the original combat playtest.
