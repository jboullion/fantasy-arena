# Fantasy Arena — Unity foundation

Open this folder as a Unity project with **6000.6.0f1**. This is the first migration slice, separate from the browser game. See `../docs/Unity Release Brief.md` for the full intended release scope.

## First slice

One 60-second warrior/goblin survival round, offline simulation, LAN host/guest adapter, imported character assets, and a shared-camera local-player prototype. This is not yet combat parity: windups, separation, knockback, terrain obstacles, ranged classes, progression, equipment, audio and ragdolls remain subsequent work. The initial HUD uses uGUI Text while the final menu pass will use TextMeshPro and the existing artwork.

Open `Assets/FantasyArena/Scenes/Foundation.unity` and press Play. If the scene has not been generated, use **Fantasy Arena > Create foundation scene**. Choose offline, local co-op, or LAN host/join. Use WASD or a gamepad left stick; attacks happen automatically. Escape pauses offline games. Launch the round after players have joined.

In the local lobby, Start on the first gamepad assigns player one; Start on another adds a player. For keyboard player one plus a controller guest, hold Space while the guest presses Start. Menu-focus polishing and a visible device-assignment screen are pending. `ArenaSession.EnableCouch` hides the mode and disables extra local joins. No mixed local/online parties yet.

LAN uses UDP port 7777. Direct LAN addresses are not Steam invitations and do not provide internet NAT traversal. This slice ends on host loss and removes disconnected guests immediately; the release brief's reconnection window is a later milestone. Offline mode never initializes NetworkManager or an online account service.

## Build and check

From the repository root in PowerShell:

```powershell
& 'C:\Program Files\Unity\Hub\Editor\6000.6.0f1\Editor\Unity.exe' -batchmode -nographics -quit -projectPath "$PWD\unity" -executeMethod FantasyArena.Editor.ArenaBuild.ValidateAndBuild -logFile "$PWD\test-results\unity-build.log"
powershell -File scripts/unity-smoke.ps1 -Mode offline
powershell -File scripts/unity-smoke.ps1 -Mode network
powershell -File scripts/unity-smoke.ps1 -Mode local
```

Close this project's editor before batch builds. Output: `Builds/Windows/FantasyArena.exe`. Smoke checks use explicitly enabled command-line automation and write reports under the repository's ignored `test-results` directory. A headless smoke pass does not establish visual quality, real controller behavior, physical two-PC LAN access, or cross-internet play.

## Architecture and dependency decision

- `Core/ArenaSimulation.cs`: plain C# state, fixed-step simulation and normalized inputs. No Unity types or networking dependencies.
- `Runtime/ArenaSession.cs`: Netcode for GameObjects custom-message adapter. Peers own inputs, host owns state; connection IDs map to internal actor IDs. Protocol 1 rejects mismatched connection payloads. The initial JSON snapshots are for the small spike, not the final 200-enemy bandwidth target.
- `Runtime/ArenaView.cs`: character rendering, interpolation, device polling and party camera.
- `Editor/ArenaBuild.cs`: repeatable scene generation, core checks, asset checks and Windows build.

Pinned packages: URP 17.6.0, Input System 1.19.0, uGUI 2.6.0, NGO 2.13.2 and glTFast 6.20.0. Transitive versions are recorded in `Packages/packages-lock.json`. NGO with Unity Transport is the LAN spike choice; Steam adapter selection remains conditional on testing against this editor/package set. NGO uses the Unity Companion License for Unity-dependent projects. No paid cloud dependency is introduced.

Unity publishes [community Steam transports](https://github.com/Unity-Technologies/multiplayer-community-contributions), but their presence is not proof of compatibility or current maintenance for this package combination. Before Steam integration, inspect the selected adapter's license, release/commit history and reconnect behavior, pin a tested revision, and exercise a two-account internet session. Provider replacement must preserve the game protocol or require compatible client updates.

Character GLBs are copied from the browser source. Editable originals remain in `../assets/characters`; retain that source and provenance with the project. Unity-generated caches/builds are ignored; commit all Assets metadata and ProjectSettings. Configure large-file storage before adding additional large binary sources to the Unity folder.
