# Unity foundation — implementation and verification

Verified 2026-09-08 on Windows with Unity 6000.6.0f1. This completes the initial executable foundation slice, not the full release brief or browser gameplay parity.

## Delivered

- Separate Unity project at `unity`, visible in Unity Hub as **unity**.
- URP scene with imported warrior and goblin GLBs, following/shared-party camera and basic uGUI controls.
- Plain C# 60 Hz simulation for movement, automatic melee, goblin chasing/contact damage, spawning, HP, kills and a 60-second round with victory/defeat.
- Offline mode that does not initialize the game's network manager or require Node, Steam or an account.
- NGO 2.13.2 / Unity Transport 6.6.0 LAN adapter with host authority, movement input validation, internal player IDs, protocol checks and up to four slots. Unity resolved the transport version recorded in the lockfile. JSON state is sent at approximately 20 Hz; remote presentation interpolates.
- Optional local co-op input/camera prototype with independently assigned gamepads. Its menu/join feature can be disabled with `EnableCouch`.
- Scene/build generator, core checks and repeatable executable smoke tests. Instructions are in `unity/README.md` and `scripts/unity-smoke.ps1`.

## Results

| Check | Evidence | Result |
| --- | --- | --- |
| C# movement normalization, non-finite input rejection, seeded repeatability, round termination, four-player cap | `test-results/unity-build-final.log`, `ARENA_CORE_TESTS_PASS` | Passed |
| Imported warrior and goblin are usable GameObjects | Editor build gate plus player logs, `ARENA_ASSETS warrior=True goblin=True` | Passed |
| Windows development build | `test-results/unity-build-final.log`, `ARENA_BUILD_PASS 181082595` | Passed |
| Offline full round | `test-results/unity-20260908-193607/offline.json`: 1 player, 3600 ticks, victory | Passed |
| Two-process host/guest round | `test-results/unity-20260908-193606/{host,guest}.json`: 2 players, 3600 ticks, victory, guest movement observed on both peers | Passed on loopback |
| Two injected gamepads | `test-results/unity-20260908-193607/local.json`: 2 players, 3600 ticks, victory, opposite independent movement | Passed |
| Rendered Windows build | `test-results/unity-render-final.png`: warrior, goblins and readable HUD inspected | Passed for this frame |

Earlier tests caught and led to fixes for NGO 2.7 incompatibility with Unity 6.6, an outdated GLB importer, and rejection of valid guest inputs because the message reader's total length includes framing. Final pinned GLB importer is glTFast 6.20.0. Source and the final executable include these fixes.

Windows Computer Use could read Hub's project list but screenshot capture returned `SetIsBorderRequired failed: No such interface supported (0x80004002)`. A hidden-window screen capture was black. Visual evidence above comes from an explicit Unity render request in the running build, rather than a desktop screenshot; it does not establish successful manual UI operation.

## Limits and next work

The simulation is a bounded foundation, not a faithful replacement for all browser rules yet. Remaining parity work includes windups/contact telegraphs, separation/knockback, terrain collisions, ranged classes/projectiles, elemental effects, the six-round progression/shop loop, statistics persistence, animation, audio and cosmetic ragdolls. The HUD is temporary uGUI Text; final TextMeshPro/art integration remains pending.

The local test uses virtual Input System devices, not two physical controllers. Shared camera framing is implemented and used by the local test; physical device hot-plug/reassignment, camera limits at wide party spread and controller menu ergonomics need further playtesting. Disabling couch mode is wired, but an exhaustive toggle regression suite has not been run.

LAN transport was verified between two processes on one computer. Physical two-PC LAN, firewall acceptance, internet relay, Steam identity/invites and Steam transport compatibility remain unverified. Windows raised a firewall prompt; the agent did not change firewall permissions. A sleeping Node service or hosting provider is not involved in these tests. No OS network adapter was disabled to claim an air-gapped test.

Host-loss cleanup exists; seamless migration and the proposed 60-second guest reconnection window are not implemented. This slice removes disconnected guests immediately. Saved settings, permanent profiles, run reports and atomic/versioned file storage remain the gameplay-parity milestone.

The rendered build logs warnings about stripped optional URP postprocessing shaders (depth of field and Panini projection); the inspected scene renders and does not use those effects. No 200-enemy performance benchmark, clean-machine test or production release validation is claimed.

Next milestone: port the existing combat/terrain rules and full run progression with scenario parity checks, then complete real-device and multi-PC playtesting. Steam adapter selection remains a separate compatibility spike before Steam-enabled internet play.
