# Unity presentation pass

Implemented 2026-09-08. This is a prototype presentation pass, not release-candidate certification.

## Features

- Procedural locomotion and melee poses retained; idle breathing, celebration jumps and raised arms added. Imported part transforms remain editable through the rig data and pose code.
- Cosmetic jointed ragdolls replace the previous sideways character root on death. Weapon bodies detach, limbs use constrained joints, and ground collisions settle the bodies. Up to 24 corpses persist until retry/new run/menu. Offline pause makes bodies kinematic. PhysX results never feed back into authoritative simulation or networking.
- Hit sparks, elemental attack spark colours, hit flashes, poison/ice tints and projectile trails. Existing enemy warning circles remain. Effects are capped at 48 simultaneous systems.
- Original synthesized attack, magic, impact, death, menu and round-outcome cues. Generated locally as Unity AudioClips, with no online service or licensed sample dependency. A Sound on/off button persists the mute preference. Cue rate limiting prevents dense combat from stacking unlimited sounds.

## Verification

The separate validation project built successfully and retained all 26 browser combat comparisons. The explicit presentation preview (`-arenaSmoke offline -arenaUiPreview presentation`) injects enemy removal, damage and player death to exercise presentation transitions without changing normal game behavior. `test-results/unity-presentation.log` reports `pass=True corpses=2 effects=2 sounds=5`; `test-results/unity-presentation.png` was inspected and shows both bodies on the defeat screen. This is a synthetic presentation scenario, not a balance test. Audio playback calls were observed; speaker output and subjective mixing have not been independently assessed.

## Limits

Executable regression checks also passed: `test-results/unity-offline-20260908-222659` completed 3600 ticks into the shop; `test-results/unity-network-20260908-222714` completed the same round on both host and guest with remote movement observed. This is loopback networking on one PC.

This uses procedural rigid-part animation and approximate box colliders, not authored skeletal clips or anatomically accurate humanoid ragdolls. Physical body placement is client-local and can differ across peers. Snapshot-derived cues can miss very short events under poor network conditions. There is no music, voice acting or environmental ambience in this pass. Full roster animation review, controller/device validation, maximum-enemy performance measurement and final audio balancing remain playtesting work. The tavern/campfire restoration remains separate.
