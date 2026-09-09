# Fantasy Arena — Unity release brief

Date: 2026-09-08. Status: agreed direction; foundation migration started with user authorization. This brief governs the Unity migration, while existing browser documents remain the reference for current gameplay. See `../unity/README.md` for implemented scope and validation instructions.

## Product and first release

A downloadable Windows arena survival game, playable fully offline alone and online with friends in a player-hosted party. Steam is the first intended storefront. Other stores and devices, including crossplay, remain future goals rather than first-release commitments.

Port the current four classes, six-round run, bosses, elemental weapons, armor, shops, terrain, tavern/campfire, retry, victory/defeat and statistics. Current source and tests take precedence over older documents describing ten rounds. Preserve the browser prototype as a reference during migration; browser-to-Unity multiplayer compatibility is not a requirement for the new C# simulation.

## Play modes and session policy

| Mode | Initial scope |
| --- | --- |
| Offline solo | Entire run works without internet, Node, Steam login or an online service initialization succeeding. Local pause and saves work offline. |
| Online co-op | 1–4 players total; host runs authoritative combat. Friends join through the selected online provider. No dedicated match-server fleet required. |
| Couch co-op | Include an optional 2–4 local-player mode, removable through a feature setting without changing solo or online combat. One keyboard player plus controllers, or controllers for everyone. |

Couch co-op starts with a shared camera that frames the party, lobby-only joining, per-player device assignment, readable player HUDs, and turn-based shop/menu focus. Prototype camera limits before polishing the arena. Mixed couch-plus-online parties and split-screen are deferred; represent connection ownership separately from player slots so mixed parties remain possible. Disabling couch co-op disables extra local joins and its menu entry, without changing save formats or network messages. It still has real implementation and testing cost.

Guest disconnects: stop their inputs immediately and reserve their slot/state for a proposed 60-second reconnection window. Authenticate returning ownership. On expiry remove the player cleanly. Fresh mid-round joins are deferred. Online menus never pause the host simulation; offline local play can pause for the group.

Host disconnects: end the session, explain why, and return guests to the menu. Keep each client's last confirmed completed-round report; do not grant unconfirmed rewards or promise recovery of the interrupted round.

Automatic host migration is possible, but deferred. Changing lobby leader alone does not move the simulation. Reliable migration requires recoverable snapshots (including RNG, timers, enemies, projectiles, effects and progression), host election, reconnection, ownership transfer and protection against duplicate rewards. Define serializable simulation state now; do not implement ongoing migration backups or promise seamless handover in this release. Reassess after reconnect and snapshot restoration are proven.

## Steam first, crossplay later

Use Steam identity, invitations/lobby discovery and a compatible relay transport for the first Steam-enabled online build. Before that, use local/LAN connections to validate the C# simulation. Steam distribution and the networking library are separate choices; a Steam lobby does not itself run or synchronize combat.

Keep platform identity, session discovery, transport, achievements and cloud storage behind narrow interfaces. Use internal player IDs, with provider IDs mapped to them; keep Steam IDs out of gameplay and save keys. Local guest profiles must not require store accounts. Do not stack Steam, EOS and Unity online services at the outset.

EOS is a candidate when cross-store play becomes a concrete milestone. These boundaries reduce future changes but do not guarantee a drop-in replacement: another provider needs integration, identity/account mapping, transport compatibility and mixed-provider testing. Version the gameplay protocol and content contract; reject incompatible builds clearly. Preserve the Steam route during transition and roll out a mutually compatible client update. Existing old binaries and active matches are not guaranteed uninterrupted compatibility. Consoles/mobile will also require platform-specific input, performance, approval and SDK work.

Choose and pin the networking framework/Steam adapter during a bounded migration spike: verify current maintenance, licenses, installed-Unity compatibility, host authority, offline operation, reconnect hooks and replaceable transport. Do not select an entire ECS architecture just to gain host migration. No service purchases or publishing steps are part of this brief.

## Unity foundations

- Port game-core and progression into a plain C# simulation shared by offline play and the online host. Retain fixed-step rules and stable data IDs; translate meaningful existing tests and use captured scenarios to check parity. Do not assume cross-platform floating-point lockstep.
- Use Unity GameObjects/prefabs and URP for presentation, with cosmetic rigidbody ragdolls and dropped weapons. Clients interpolate snapshots; gameplay damage, collisions and rewards remain host-owned. Keep responsive input/latency testing in the first networking milestone.
- Start by validating installed Unity 6000.6.0f1, then pin a supported editor/package set after the spike. Use the Input System for devices and rebinding, uGUI/TextMeshPro for the existing sliced menu artwork, and editable data assets converted into simulation definitions.
- Separate settings, profile and run-report files; include save versions and atomic writes. Preserve stable IDs and leave room for later unlocks without inventing a permanent economy. Cloud sync is optional later; it is not authoritative progression. Quit-and-resume of an unfinished run is deferred, separately from full offline play.
- Include controller navigation, text readability, volume controls, window/display settings and graphics quality settings. Proposed performance goal: 60 FPS at 1080p with four players and 200 enemies on a reference PC selected and recorded during the spike; this is a target, not a measured claim.
- Preserve editable Blender sources, validate imported scale/materials/rigs, track asset provenance and bundled font licenses. Use Git with Unity metadata and appropriate large-file storage, reproducible Windows builds and small automated simulation tests. Keep generated Library/build caches out of version control.

## Migration sequence and acceptance

1. **Foundation spike:** create a separate Unity project alongside the browser source; validate asset import, offline C# combat and a two-process LAN host/guest round. Record the networking choice and dependency versions. Produce a Windows build that starts and plays with networking disabled. Prototype two local controllers and camera framing.
2. **Gameplay parity:** port the complete current run, classes, enemies, terrain, shop and end states. Compare combat/progression against browser scenarios; verify solo completion and defeat/retry. Implement versioned local reports and settings.
3. **Multiplayer and local co-op:** test 1–4 online players, guest reconnection, host-loss cleanup, and 2–4 local players with device removal/reassignment. Confirm disabling couch co-op leaves solo/online behavior intact. Validate internet play across two separate networks once Steam access is configured; LAN success alone is insufficient.
4. **Presentation and release candidate:** complete animations, effects, audio and UI; test clean-machine Windows builds, controller-only navigation, offline startup and measured performance. Add Steam integrations and validate invitations and compatible-version enforcement. Prepare store materials and distribution separately.

The user authorized the foundation spike and enabled Computer Use on 2026-09-08. Implementation and measured validation are recorded separately; the remaining release milestones above are not implied complete by a successful foundation build.

## Reference documentation

- [Unity PlayerInputManager](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.14/manual/PlayerInputManager.html): local-player lifecycle, optional joining and player limits.
- [Unity session host migration](https://docs.unity.com/en-us/mps-sdk/session-host-migration): service/framework-specific migration; not a guarantee for the eventual selected stack.
- [Steam multiplayer](https://partner.steamgames.com/doc/features/multiplayer): Steam multiplayer features and integration choices.
- [Epic crossplay](https://onlineservices.epicgames.com/news/epic-online-services-release-free-pc-crossplay-tools): cross-store services as a later integration option.
- [Unity UI handoff](Image%20UI%20and%20Unity%20Handoff.md): existing texture and layout specifications.
