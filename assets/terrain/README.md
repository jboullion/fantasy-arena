# Arena terrain

Original procedural Blender meshes authored for Fantasy Arena. No downloaded assets, textures, or paid generation services are used.

Editable source: `fantasy-arena-terrain.blend` (one scene per model). Regenerate with Blender in background mode using `scripts/create-terrain-assets.py` from the repository root. Nine GLBs export to `apps/client/public/models/terrain`: granite/slate/mossy rocks, pine/oak/silver pine trees, and meadow/gold/fern grass tufts. Units are metres, exported Y-up, with pivots at ground level.

The arena is 64 by 56 metres. `packages/game-core/src/terrain.ts` uses a dedicated seed of 7319, maintains a clear central starting area, and reserves space between solid obstacles and the perimeter. Server and clients generate the same layout from map dimensions. Rocks and tree trunks block players/enemies; enemies steer around circular footprints. Decorative large boulders and trees form the perimeter, backed by arena bounds and ragdoll wall colliders.

Grass uses instanced Blender geometry and damped spring motion driven by player/enemy proximity. Tufts bend and recover, without gameplay collision or slowing actors. This is lightweight visual spring physics, not individually simulated rigid grass blades. Grass freezes when paused.

Validation: nine GLBs passed glTF validation with zero errors; production build and simulation tests passed. Browser smoke tests passed with no page errors and approximately 60 FPS at 25–200 enemies on the local RTX 3070. Screenshots are in `test-results/arena-desktop.png` and `test-results/terrain-boundary.png`. These measurements do not establish performance on other hardware. Frontend and server must both receive these changes when deploying multiplayer.
