# Ten-round run, shops and play statistics

September 6, 2026. Extends the shared multiplayer prototype; the original offline combat lab remains separate.

## Run flow

Lobby → round 1 → shop → round 2 → … → round 10 → victory report.

The server owns progression, individual balances, equipment, combat statistics and purchases. Every player readies up in the shop before the host starts the next round. A purchase clears that buyer's ready state. New joins are blocked throughout a run, including shops. Host transfer continues to work if someone leaves.

Every clear pays 100 gold to each remaining party member, including fallen players. Starting the next round restores everyone to full upgraded health. Losing ends the run and grants no failed-round reward. Starting a new run resets currency/equipment/current statistics, while previously saved reports remain.

| Round | Addition |
| ---: | --- |
| 1–2 | Goblin Grunts |
| 3 | Ember Runners: smaller, faster, lower health |
| 5 | Forest Warlord boss |
| 6 | Stone Brutes: larger, slower, high health and damage |
| 9 | Frost Revenants: faster, durable enemies |
| 10 | Stronger Forest Warlord boss; final round |

Earlier enemies remain available after their introduction. Colors, scale, health, movement speed and contact damage distinguish the initial variants. They retain the basic chase/contact behavior. The clearing, base spawn cadence and 60-second timer remain the same each round. Boss health scales with the initial party size. Boss rounds require both surviving the timer and defeating the boss; once time expires, spawning stops while combat continues.

## Shop

There are exactly two upgrade offerings, each with five ranks:

- **Honed longsword:** +10 sword damage per rank. Costs 80, 120, 160, 200, 240 gold.
- **Forged plate:** +25 maximum health and 2 contact-damage reduction per rank. Costs 70, 105, 140, 175, 210 gold. Positive incoming damage has a minimum of 1.

Purchases apply only to the buyer. The server rejects invalid items, insufficient funds, rank-cap purchases and buying outside the shop. The victory and defeat screens reuse the shop/report layout with buying disabled. Victory has no next-round control; the host may return the party to the lobby.

## Statistics and saving

Each player tracks cumulative total damage, per-weapon damage, kills and damage taken. Effective damage is capped by the target's remaining health, so overkill is excluded from statistics even though floating hit numbers continue to show attack damage. Longsword upgrades retain the stable `weapon.longsword` ID.

Stats carry between rounds without re-adding old totals. Shops and results display player-selectable current statistics, plus saved reports and their weapon breakdowns. Reports automatically save under `fantasy-arena.run-reports.v1` in localStorage. Each run/player pair updates one record; the latest 20 records are retained. JSON export provides an independent copy. Storage failure shows an export fallback.

This saves reports, not active match state. Reports are local to the browser/origin and can be lost if browser data is cleared. There are no account/cloud saves or match-resume semantics.

## Verification

- 24 unit/simulation tests cover the previous combat behavior and the new reward, purchase, cap, equipment, enemy schedule, boss gate, effective damage, armor, failure and ten-round victory rules.
- `npm run test:run` starts isolated Colyseus/Vite instances on ports 2568/5174 and exercises four browser clients through all ten rounds. It uses controlled, accelerated server fixtures and real combat, network messages and browser purchases; no fixture commands are exposed by the normal server.
- The browser flow verifies shared round progression, enemy additions, both bosses, equipment carry-over, individual spending, cumulative stats, disabled victory purchases, JSON export, saved reports, narrow layout, a new clean run, defeat and persistence after reload.
- Shop, boss, victory and saved-report screenshots are written under ignored `test-results/` and visually inspected. The accelerated report is `test-results/ten-round-report.json`.
- A production build and ordinary server integration checks are also run.

This validates the complete loop, not ten minutes of human combat balance. Default rewards, costs, enemy numbers and boss health remain starting values for playtesting. Tune them in `packages/game-data/src/index.ts`.
