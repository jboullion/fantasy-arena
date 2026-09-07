# In-game lobby and campfire

The multiplayer lobby now shows the live party in a furnished 3D tavern. Character choices and joined/departed players update the models. Before joining, the selected character previews in the tavern. Create, join, ready and launch remain React controls along the right edge.

Between rounds, the party sits on logs around an animated woodland campfire. Purchases and readiness remain server-authoritative. Player statistics, saved reports and JSON export are available through **View player stats** without replacing the world. Narrow screens put the menu below the scene.

Defeat retains the combat canvas and articulated player bodies. After a 1.6-second fall animation, the host can retry the current level or return everyone to the tavern. Retry preserves round, equipment, gold and cumulative combat stats (including failed attempts), restores health and resets enemies. It grants no additional gold until the round is actually cleared. Guests can inspect stats or leave; the host controls party transitions.

Victory retains the combat canvas, turns every surviving enemy into a jointed Rapier ragdoll, preserves recent death ragdolls, and makes every party member celebrate with repeated jumps. Fallen teammates also appear in the celebration; this is presentation only. Return to lobby clears the run through the existing server flow.

## Assets

`scripts/create-environment-assets.py` creates original low-poly geometry through Blender MCP in separate scenes, preserving the existing character workshop. Exported assets are in `apps/client/public/models/environments/`:

- Tavern: 1,872 triangles, 168,496 bytes; timber walls, floorboards, hearth, bar, shelves, bottles, tables, stools and barrels.
- Campfire: 2,048 triangles, 211,048 bytes; open clearing, pine trees, stone fire ring, firewood and log seats.

No third-party models or paid generation were used. Reproducible source, hashes and Khronos glTF validation reports are in `scripts/` and `assets/environments/`. Both GLBs validate with zero errors and warnings. Flames, lighting and character poses are rendered in React Three Fiber.

## Verification

- `npm test`: progression/combat tests, including same-level retry with retained upgrades, cumulative stats and a single clear reward.
- `npm run build`: TypeScript and production bundle.
- `npm run test:run`: accelerated four-client browser test through all ten rounds, campfire purchases, victory, statistics/export/history, return, defeat and retry. Includes live ragdoll counts, retained combat canvas, celebration movement, a fallen teammate at victory, and narrow-screen checks.
- Screenshots: `test-results/tavern-lobby.png`, `shop-round-1.png`, `campfire-narrow.png`, `run-victory.png`, and `run-defeat.png`.

The browser run uses shortened server-controlled encounters; it verifies behavior rather than full-length balance. Victory creates physics bodies for all surviving enemies, so very large debug hordes can be more expensive than normal combat rendering.
