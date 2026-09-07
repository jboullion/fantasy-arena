# Multiplayer lobby — initial implementation

September 6, 2026. This extends the original offline 0.1 slice at the user's request.

## Player flow

The default entry screen is now the lobby. Players enter a name, choose a Human Warrior or Dwarf Guardian, and create a lobby or join a code. There are four seats; one to four players may start. Duplicate character selections are allowed.

Everyone must ready up. Only the host can launch Level 1, and the server checks those conditions. A profile change clears that player's readiness. Launch places every member in the same forest clearing with separate player entities, shared goblins, shared timer and shared kill count. Name labels and a compact party health panel identify teammates.

| Character | Health | Speed | Sword damage | Swing interval |
| --- | ---: | ---: | ---: | ---: |
| Human Warrior | 100 | 7 | 25 | 0.85 s |
| Dwarf Guardian | 140 | 5.8 | 35 | 1.05 s |

Both retain automatic melee attacks and the previous nearest-enemy facing behavior. The guardian has a shorter, broader silhouette and bronze armor. These are basic character variants, not separate finished classes.

If one player dies, the others continue. The party loses when all remaining players die; surviving 60 seconds completes the round. The host can return everyone to the lobby, where names and choices persist and readiness resets. Leaving removes the player's avatar and transfers host status if necessary. Running matches reject late joins. Multiplayer menus stop that client's input but do not pause the shared match.

## Implementation

- `apps/server/src/ArenaRoom.ts` owns lobby membership, host authority, ready checks, input validation, round transitions and the shared `Simulation`.
- `packages/game-core` now supports multiple named player actors and per-player movement, health, facing, attack cooldown and character values. Goblins target living players and commit their contact telegraph to one target.
- The Colyseus server runs simulation at a fixed 60 Hz and sends plain world snapshots at roughly 20 Hz. Client input is sent at 30 Hz; stale input is zeroed after 300 ms. Clients cannot submit authoritative positions, health or damage.
- `network.ts` manages create/join/leave and connection feedback. Client rendering smooths positions between received snapshots; it does not run its own multiplayer damage/spawn simulation.
- R3F renders every player's avatar. Presentation-only corpses, effects, audio and damage numbers are generated locally from shared server events.
- `npm run dev` starts the server and Vite together. Vite proxies `/multiplayer` HTTP and WebSocket requests to port 2567. LAN players use the Network URL printed by Vite and the same lobby code.

The implementation uses the repository's Colyseus architecture direction. Reference: [Colyseus rooms](https://docs.colyseus.io/room) and [client create/join-by-ID APIs](https://docs.colyseus.io/sdk). The installed 0.17 package types were checked for the concrete server and SDK calls used here.

## Verified

- Production TypeScript/Vite build passes.
- 16 simulation tests pass, including independent player movement, distinct character stats, multiple attackers killing one shared enemy only once, and continuing after one player's death.
- The four-browser test passes: names/characters, capacity rejection, readiness invalidation, host launch, four distinct local player IDs, identical rosters, replicated movement, shared kills, host departure/avatar removal, host transfer, round results, return to lobby and narrow layout.
- At a sampled point all four clients reported six shared kills and the same moved player's X coordinate to within 0.000001 world units. These are consistency checks on localhost, not latency/performance claims.
- The server integration test passes: guests cannot launch; incomplete readiness blocks launch; malformed character values are rejected; profile changes during a match are ignored; running rooms reject new players; movement ownership, magnitude clamping and stale input handling work; host authority transfers after departure.
- The offline damage-number and gamepad adapter regressions pass. Existing offline test scripts use `?sandbox=1`.
- Desktop lobby, four-player gameplay, post-departure gameplay and narrow lobby screenshots were visually inspected. One departure/render race discovered by testing was fixed.

Commands with the dev server running:

```sh
npm test
npm run build
node tests/multiplayer.mjs
node tests/server.mjs
node tests/combat-feedback.mjs
node tests/input.mjs
```

Screenshots and JSON evidence are in ignored `test-results/`.

## Current boundaries

This is a local/LAN multiplayer prototype. An internet deployment still needs a reachable Node server and frontend/reverse-proxy hosting. No public deployment or firewall changes were made. Use `VITE_MULTIPLAYER_URL` for a separately hosted server endpoint.

Connection loss removes the player; there is no resume/reconnect slot. No join-in-progress, resurrection, lobby gamepad navigation, client prediction, latency compensation or schema-delta optimization yet. Full snapshots prioritize simple verification over bandwidth efficiency. Real multi-device LAN/WAN play and hardware controllers still need testing; automated multiplayer verification used separate browser contexts on one machine.

The original offline combat lab remains at `/?sandbox=1`, including live tuning and debug shortcuts. Those shortcuts do not alter multiplayer games.
