# Browser Prototype — Technology Stack & Architecture

## Status

**Early Architecture / Living Document**

This document defines the current browser technology direction for the prototype.

Like the game concept document, it should evolve as we learn more.

The architecture should support:

- rapid experimentation
- responsive 3D combat
- increasing enemy counts
- keyboard and controller input
- physics and ragdolls
- eventual 1–4 player online multiplayer
- data-driven characters, weapons, enemies, and upgrades
- substantial React-based menus and HUD
- easy debugging and tuning
- eventual translation of successful concepts into Unity

The browser implementation itself is not intended to become the final Unity game.

---

# 1. Architectural Philosophy

The browser prototype should be:

**Simple now, expandable later.**

We should deliberately establish a handful of strong boundaries from the beginning without implementing every future system immediately.

The most important boundaries are:

```text
Simulation
Rendering
Physics
Input
Networking
UI
Game Data
Assets
Audio
```

These systems should communicate with one another without becoming the same system.

In particular:

**React Three Fiber should not become our game engine.**

It should render our game.

And:

**React state should not become our per-frame simulation.**

This distinction will matter enormously once we have hundreds of enemies or multiplayer.

---

# 2. Recommended Technology Stack

Current recommendation:

| Area | Technology |
|---|---|
| Language | TypeScript |
| Frontend | React |
| Build Tool | Vite |
| 3D Renderer | Three.js |
| React 3D Layer | React Three Fiber |
| 3D Helpers | Drei |
| Physics | Rapier |
| R3F Physics Integration | `@react-three/rapier` |
| Application State | Zustand |
| UI | React DOM + CSS |
| Multiplayer Server | Node.js + Colyseus |
| Transport | WebSocket through Colyseus |
| Controller Support | Browser Gamepad API |
| 3D Assets | GLB / glTF |
| Unit Tests | Vitest |
| Browser / Integration Tests | Playwright |
| Package Structure | TypeScript monorepo |

Not every item needs to be installed during Prototype 0.1.

---

# 3. Why React

The game itself does not technically require React.

However, the overall project will eventually contain substantial non-game UI:

- main menu
- options
- multiplayer lobby
- character selection
- upgrade selection
- shop
- character stats
- ready screens
- results
- controller settings
- accessibility settings
- potentially unlocks and progression

React is very well suited to these surfaces.

We should therefore think of the browser game as:

```text
React Application
│
├── Menus
├── HUD
├── Lobby
├── Shop
├── Character Select
│
└── Game View
      │
      └── React Three Fiber Canvas
```

rather than thinking of React Three Fiber as the entire application.

---

# 4. React Three Fiber

Use:

**Three.js + `@react-three/fiber`**

for rendering the 3D game.

R3F gives us convenient React composition for:

- scene organization
- cameras
- lights
- environment
- asset loading
- effects
- character models
- animation presentation

Recommended related package:

**`@react-three/drei`**

for useful Three.js/R3F helpers.

The Game Studio architecture guidance specifically recommends R3F when a 3D scene lives inside a React application and needs coordination with React UI, while keeping high-frequency simulation separate from React's rendering lifecycle. 

---

# 5. Critical R3F Rule

Avoid this architecture:

```text
<Enemy>
    useState(health)
    useState(target)
    useFrame(AI)
    useFrame(combat)
    useFrame(movement)
</Enemy>

<Enemy>
    ...
</Enemy>

<Enemy>
    ...
</Enemy>
```

This would work beautifully for five enemies and potentially become painful with hundreds.

Instead:

```text
Game Simulation
│
├── Player entities
├── Enemy entities
├── Combat
├── Targeting
├── Movement
├── Spawn system
└── Round system

          ↓

Rendering Layer

├── PlayerRenderer
├── EnemyRenderer
├── ProjectileRenderer
└── EffectsRenderer
```

React/R3F reads simulation state and renders the result.

Gameplay rules should remain independent from React components. This separation is one of the core Game Studio architectural recommendations. 

---

# 6. Simulation Layer

The simulation should eventually own things such as:

```text
Player
Enemy
Projectile
Weapon
Ability
Damage
Health
Movement
Targeting
Status Effects
Round
Spawner
Currency
Upgrade
```

A simplified entity could look conceptually like:

```typescript
interface EnemyState {
    id: number;
    type: EnemyType;

    position: Vector3Data;
    velocity: Vector3Data;

    health: number;
    maxHealth: number;

    targetPlayerId?: string;
    state: EnemyBehaviorState;
}
```

Notice that it contains data.

It should not contain:

```text
THREE.Mesh
THREE.Group
React component references
Rapier components
HTML elements
```

That separation will help both performance and networking.

---

# 7. Fixed Simulation Tick

We should separate:

**render frame rate**

from:

**game simulation rate**

The renderer might run at:

```text
60–144+ FPS
```

depending on the user's display.

The game simulation can eventually use a fixed update rate such as:

```text
30 or 60 simulation ticks per second
```

Conceptually:

```text
INPUT
   ↓
FIXED GAME UPDATE
   ↓
PHYSICS
   ↓
GAME STATE
   ↓
INTERPOLATION
   ↓
RENDER
```

This becomes particularly important when networking arrives.

It also makes things such as:

- damage
- cooldowns
- status effects
- spawning
- movement

less dependent on browser rendering performance.

---

# 8. State Management

Use **Zustand** for application/shared state where it makes sense.

Good examples:

```text
current screen
menu state
settings
selected character
HUD data
game mode
local player identity
audio settings
debug settings
network status
```

But avoid placing every enemy position into a normal Zustand store and triggering React updates for every simulation tick.

High-frequency world state should live in the simulation.

A useful conceptual distinction:

```text
APP STATE
    Zustand

SIMULATION STATE
    Game runtime

SERVER STATE
    Multiplayer server

RENDER STATE
    Three.js / R3F
```

These may communicate, but they are different concerns.

---

# 9. Physics

Recommended physics engine:

**Rapier**

Rapier provides JavaScript/WebAssembly support for 3D rigid-body physics and is appropriate for browser-based 3D simulation. citeturn393788search3turn393788search7

For React integration:

**`@react-three/rapier`**

is the natural R3F wrapper.

We should use physics intentionally rather than assuming every game object needs a rigid body.

---

# 10. What Physics Should Handle

Good candidates:

- player collision with environment
- simple enemy collision
- obstacle collision
- knockback
- environmental props
- ragdolls
- possibly projectiles requiring physical trajectories

Potentially not physics-driven:

- targeting
- hitscan attacks
- most magical projectiles
- damage calculations
- status effects
- enemy decision making
- simple area attacks
- visual particles

For example:

A fireball may visually travel through the world but still use our own simplified collision query rather than behaving as a fully dynamic rigid body.

---

# 11. Enemy Physics Strategy

We should avoid giving hundreds of enemies expensive full dynamic rigid-body behavior unless testing proves it works comfortably.

Possible eventual hierarchy:

### Players

Full/simple physics bodies.

### Important enemies

Physics-backed bodies.

### Large hordes

Simplified movement and collision/separation.

### Dead enemies

Temporary ragdolls.

This gives us visual physics where players notice it without requiring the physics engine to solve everything on screen.

---

# 12. Ragdolls

Ragdolls should use Rapier physics.

However, ragdolls should exist primarily in the **presentation layer** after the gameplay entity dies.

Conceptually:

```text
Goblin Gameplay Entity

HP <= 0

↓

Remove from active combat

↓

Spawn visual ragdoll

↓

Apply death impulse

↓

Simulate briefly

↓

Sleep / fade / remove
```

The ragdoll does not remain an enemy.

This keeps corpse physics from contaminating gameplay simulation.

---

# 13. Input Architecture

Input should be abstracted immediately.

Gameplay code should never ask:

```typescript
if (keyboard.keys["KeyW"])
```

Instead:

```typescript
input.move
input.aim
input.primaryAbility
input.secondaryAbility
input.interact
input.pause
```

Then physical devices map onto those actions.

The Game Studio foundation similarly recommends defining actions first and mapping physical inputs in one centralized place. 

---

# 14. Input Action Model

Initial action set:

```typescript
interface PlayerInput {
    move: Vector2;
    aim: Vector2;

    ability1: boolean;
    ability2: boolean;

    interact: boolean;

    confirm: boolean;
    cancel: boolean;
    pause: boolean;
}
```

Prototype 0.1 may initially need only:

```text
move
pause
```

But building the abstraction now is inexpensive.

---

# 15. Keyboard and Mouse

Initial desktop controls:

```text
WASD       Move

Mouse      Potential future aiming

Space      Ability

Q          Secondary / Ultimate

Escape     Pause
```

Exact bindings are not important yet.

The action mapping is.

---

# 16. Gamepad Support

Controller support should be considered a **core platform feature**, not something bolted on near release.

Use the browser's native **Gamepad API**.

Modern browsers expose connected gamepads, buttons, axes, connection events, and `navigator.getGamepads()`. MDN currently describes the basic Gamepad API as widely available. citeturn382547search0turn382547search2

We can therefore build our own very small input adapter rather than immediately introducing a controller library.

Conceptually:

```text
Xbox Controller
PlayStation Controller
Generic Controller
Keyboard

        ↓

Input Adapter

        ↓

Game Actions

        ↓

Simulation
```

---

# 17. Gamepad Dead Zones

Analog sticks require dead-zone handling.

For example:

```text
Raw stick magnitude < 0.15
        ↓
Treat as zero
```

Then normalize the remaining range.

We should expose dead zone in settings eventually.

This prevents minor stick drift from constantly moving the character.

---

# 18. Controller Mapping

Internally, use actions such as:

```text
MOVE
AIM
ABILITY_1
ABILITY_2
INTERACT
CONFIRM
CANCEL
PAUSE
```

Never:

```text
XboxAButton
PlayStationCrossButton
```

UI prompts can translate the action based on the active device.

For example:

```text
Keyboard:

Press E

Xbox:

Press A

PlayStation:

Press Cross
```

---

# 19. Active Input Device

Track which input device was used most recently.

For example:

Player presses keyboard:

```text
activeInput = keyboard
```

Player moves controller stick:

```text
activeInput = gamepad
```

Then HUD prompts automatically switch.

This small feature substantially improves controller polish.

---

# 20. Multiplayer Direction

We should not implement networking during Prototype 0.1.

However, our simulation should be designed so that multiplayer can be added without rewriting the entire game.

The long-term browser networking model should be:

**authoritative server**

rather than peer-to-peer authority.

---

# 21. Recommended Multiplayer Framework

Current recommendation:

**Colyseus**

with:

**Node.js + TypeScript**

Colyseus is specifically designed around authoritative multiplayer game servers, rooms, matchmaking and synchronized state. Its current framework also supports client prediction, interpolation, rollback-related workflows and lag compensation. citeturn393788search0turn393788search9

That is substantially closer to our problem than using a generic API framework and inventing our entire game networking layer ourselves.

---

# 22. Why Colyseus Instead of Raw WebSockets

We could build networking directly with:

```text
WebSocket
```

or something general-purpose such as Socket.IO.

But then we would eventually need to create:

- rooms
- joining/leaving
- reconnect behavior
- state synchronization
- game sessions
- serialization
- matchmaking
- prediction strategy
- connection lifecycle
- host cleanup

Colyseus already models multiplayer games around **rooms**, where each match contains a group of clients and isolated server-side game state. citeturn393788search6

That maps extremely naturally to:

```text
Tavern Survivors Match #8172

Player 1
Player 2
Player 3
Player 4

Arena
Enemies
Round
```

---

# 23. Future Multiplayer Topology

Eventually:

```text
Player 1 Browser ──┐
                   │
Player 2 Browser ──┤
                   │
Player 3 Browser ──┼──► GAME SERVER
                   │        │
Player 4 Browser ──┘        │
                            │
                            ├── Players
                            ├── Enemies
                            ├── Combat
                            ├── Round
                            ├── Drops
                            └── Match State
```

The server becomes authoritative.

Clients primarily send:

```text
INPUT
```

rather than:

```text
"I moved to X=15"
"I killed this goblin"
"I now have 10,000 gold"
```

The server decides whether those outcomes are valid.

---

# 24. Why Server Authority Matters

Even though this is initially a friends-only cooperative game, authoritative simulation has benefits beyond cheating prevention.

It prevents clients from disagreeing about:

- enemy health
- enemy deaths
- boss state
- player position
- pickups
- round completion
- damage
- random events

There should ideally be one canonical answer.

---

# 25. Client Prediction

Eventually we should not wait for the server before moving the local player.

That would feel terrible.

Instead:

```text
Player presses RIGHT

↓

Client immediately moves player

↓

Input sent to server

↓

Server simulates movement

↓

Server confirms authoritative position

↓

Client reconciles if necessary
```

This is **client-side prediction**.

Colyseus' current realtime-action tooling explicitly supports authoritative fixed ticks, validated input and prediction-oriented networking patterns, which makes it a compelling fit for the later multiplayer phase. citeturn393788search9turn393788search10

We do not need to implement this during the first combat slice.

We simply want an architecture that does not make it impossible.

---

# 26. Networked Enemy Simulation

Eventually, enemies should generally be simulated by the server.

Clients receive enough state to display them.

The client can interpolate motion between network updates:

```text
Server Enemy Position A

        ↓

Client smoothly interpolates

        ↓

Server Enemy Position B
```

We should not necessarily transmit every enemy property every render frame.

Colyseus synchronizes server-owned state through schemas and incremental state patches rather than requiring clients to mutate synchronized state directly. citeturn393788search2turn393788search5

---

# 27. Shared Code

One major advantage of browser + Node + TypeScript is that client and server can share definitions.

Recommended monorepo:

```text
/apps
    /client
    /server

/packages
    /game-core
    /game-data
    /shared
```

Potential responsibilities:

### client

```text
React
R3F
UI
input devices
audio
rendering
client networking
```

### server

```text
Colyseus
matches
authoritative simulation
network state
```

### game-core

```text
combat rules
damage
stats
cooldowns
movement formulas
upgrade logic
shared simulation utilities
```

### game-data

```text
characters
weapons
enemies
upgrades
round definitions
```

### shared

```text
message types
identifiers
utility types
shared constants
```

---

# 28. Do We Need the Monorepo Immediately?

I recommend:

**Yes, but keep it extremely small.**

Even Prototype 0.1 could begin with:

```text
/apps/client
/packages/game-core
/packages/game-data
```

The server application can be added when multiplayer development begins.

This gives us the correct conceptual boundaries without requiring us to build networking now.

---

# 29. Package Manager

Recommended:

**pnpm workspaces**

or another workspace-capable package manager the team prefers.

The exact tool is less important than maintaining clean package boundaries.

Example root:

```text
package.json
pnpm-workspace.yaml
tsconfig.base.json

/apps
/packages
```

---

# 30. Game Data

Characters, weapons, enemies and upgrades should be defined as data.

Example:

```typescript
interface WeaponDefinition {
    id: string;
    name: string;

    damage: number;
    cooldown: number;
    range: number;

    tags: string[];
}
```

Example:

```typescript
const longsword = {
    id: "longsword",
    name: "Longsword",

    damage: 25,
    cooldown: 1,
    range: 2.2,

    tags: [
        "weapon",
        "melee",
        "physical",
        "sword"
    ]
};
```

The game systems consume these definitions.

---

# 31. Stable IDs

Use stable identifiers from the beginning:

```text
character.warrior
weapon.longsword
enemy.goblin
upgrade.fire_damage
status.burning
```

rather than relying on:

```text
"Wizard"
"Long Sword"
"Big Goblin"
```

as internal keys.

Display names can change.

Stable IDs should not.

---

# 32. Tags

We should support tags conceptually early even if Prototype 0.1 barely uses them.

For example:

```text
weapon.longsword

tags:
    weapon
    melee
    sword
    physical
```

Future:

```text
spell.fireball

tags:
    magic
    projectile
    fire
    explosion
```

This will eventually make upgrades and synergies far easier to express.

---

# 33. Event / Command Architecture

Gameplay systems will eventually need to communicate.

Examples:

```text
EnemyKilled
PlayerDamaged
AttackPerformed
ProjectileHit
RoundStarted
RoundCompleted
GoldCollected
StatusApplied
```

We should avoid immediately building an enormous enterprise event bus.

But introducing simple gameplay events can keep systems decoupled.

Example:

```text
Combat System

Enemy health reaches 0

↓

EnemyKilled event

├── Statistics increment kill
├── Audio triggers sound
├── FX spawns effect
├── Economy drops gold
└── Renderer creates ragdoll
```

That scales better than having the combat system directly know about every other system.

---

# 34. Rendering Many Enemies

Enemy counts may eventually become one of our biggest technical challenges.

The rendering architecture should therefore allow us to move toward:

- instanced rendering
- pooled objects
- shared materials
- shared geometry
- limited shadows
- distance-based effects
- animation optimization

We do not need all of this for the first goblin.

We just should not assume:

```text
1 enemy = 1 expensive React hierarchy
```

forever.

---

# 35. Object Pooling

Eventually, repeatedly creating and destroying:

```text
projectiles
particles
damage numbers
enemy visuals
ragdolls
```

may generate unnecessary garbage collection pressure.

We should introduce pooling only when profiling demonstrates value.

Potential future pools:

```text
ProjectilePool
EnemyVisualPool
ParticlePool
DamageNumberPool
RagdollPool
```

Again:

**design for possibility, do not implement prematurely.**

---

# 36. Asset Format

Standardize 3D runtime assets on:

**GLB / glTF 2.0**

Game Studio recommends GLB/glTF as the default browser shipping format for 3D assets. 

Potential source workflow:

```text
Blender
   ↓
GLB
   ↓
Optimization
   ↓
Browser
```

Eventually Unity may use source assets or a different import pipeline.

The browser-optimized GLBs should not necessarily become our final Unity assets.

---

# 37. Asset Organization

Suggested:

```text
/assets

    /characters
        /warrior
        /goblin

    /weapons
        /longsword

    /environment
        /arena-forest

    /fx

    /audio

    /ui
```

Runtime code should reference logical asset IDs rather than scattered file paths.

For example:

```text
character.warrior.model
```

rather than having twenty components know:

```text
/assets/models/characters/human-warrior-final-v7.glb
```

---

# 38. Asset Manifest

Eventually:

```typescript
const assets = {
    "character.warrior": {
        model: "/assets/characters/warrior.glb"
    },

    "enemy.goblin": {
        model: "/assets/characters/goblin.glb"
    }
};
```

This gives us one central place to manage runtime content.

---

# 39. Animation

Use standard skeletal animation within GLB assets.

Potential states:

```text
Idle
Run
Attack
Hit
Death
```

Ragdoll transitions may eventually move from skeletal animation into physics.

Animation playback belongs primarily to rendering/presentation.

The simulation should care about concepts such as:

```text
attack begins
attack impact occurs
attack completes
```

rather than exact animation frame implementation.

---

# 40. Audio

Audio should have its own small manager.

Potential categories:

```text
music
weapons
impacts
characters
enemies
UI
ambient
```

The simulation should emit events.

Audio decides how those events sound.

Example:

```text
AttackHit

↓

AudioSystem.play("sword.hit")
```

This becomes important when dozens of enemies are dying simultaneously.

We will eventually need:

- volume limits
- sound pooling
- variation
- priority
- distance attenuation

---

# 41. UI Technology

Use normal:

**React DOM + CSS**

for virtually all interface elements.

Examples:

- health
- timer
- shop
- menus
- upgrade cards
- lobby
- character selection
- settings
- results

Do not render text-heavy UI inside the WebGL canvas unless there is a compelling reason.

This follows the Game Studio recommendation to keep menus and HUD primarily in normal DOM UI rather than forcing interface-heavy surfaces into WebGL. 

---

# 42. Debug Tooling

Debug tools should be treated as a feature.

Possible development overlay:

```text
FPS                 118
Enemies             163
Active Projectiles   47

Player Speed          7
Attack Rate         1.2

Simulation           2.8 ms
Physics              1.9 ms
Render               4.1 ms
```

Useful toggles:

```text
Physics Debug
Enemy Targets
Spawn Points
Collision Shapes
Attack Ranges
AI State
Network State
```

This will save enormous amounts of time.

---

# 43. Runtime Tuning Panel

Eventually it would be useful to modify variables without recompiling:

```text
Player Speed     [ 7.0 ]
Goblin Speed     [ 4.2 ]
Sword Damage     [ 25 ]
Sword Range      [ 2.2 ]
Spawn Rate       [ 0.8 ]
Max Enemies      [ 150 ]
```

Prototype playtesting becomes substantially faster when we can modify these while the game is running.

---

# 44. Testing Strategy

We should test different layers differently.

## Unit Tests

Use:

**Vitest**

for predictable systems such as:

```text
damage formulas
upgrade calculations
stat modifiers
random selection
round timing
serialization
```

---

## Simulation Tests

The simulation should ideally be runnable without rendering.

For example:

```text
Spawn player
Spawn goblin

Run 300 ticks

Expect goblin moved toward player
```

This is an excellent side benefit of separating simulation from R3F.

---

## Browser Tests

Use something such as:

**Playwright**

for:

```text
game launches
menu works
restart works
lobby UI works
settings work
two browser clients connect
```

We should not attempt to automate whether combat is "fun."

That remains playtesting.

---

# 45. Performance Profiling

We should periodically test:

```text
25 enemies
50 enemies
100 enemies
250 enemies
500 enemies
```

and record where performance degrades.

Measure separately:

```text
simulation
physics
rendering
animation
networking
```

Otherwise we may optimize the wrong thing.

---

# 46. Networking Performance Tests

When multiplayer begins, add tests for simulated:

```text
0 ms latency
50 ms latency
100 ms latency
200 ms latency

packet jitter

temporary packet loss
```

A four-player cooperative game does not need competitive-FPS-grade networking.

But movement should remain pleasant under ordinary residential internet conditions.

---

# 47. Randomness

Eventually multiplayer requires controlled randomness.

Instead of sprinkling:

```typescript
Math.random()
```

throughout gameplay systems, use a game random-number abstraction.

Example:

```typescript
rng.next()
rng.range()
rng.choose()
```

Eventually matches can use a seed.

This helps with:

- deterministic tests
- reproducible bugs
- server simulation
- replay/debugging possibilities

---

# 48. Time

Similarly, gameplay systems should not directly depend everywhere on:

```typescript
Date.now()
```

or render-frame delta.

The simulation should own game time.

Examples:

```text
simulation.tick
simulation.time
deltaTime
```

This makes:

- pause
- multiplayer
- tests
- slow motion
- debugging

much easier.

---

# 49. Save Data

Prototype 0.1 needs almost none.

Eventually, save only serializable game/application data.

Never serialize:

```text
Three.js objects
Rapier bodies
React state objects
DOM references
```

Potential persistent data:

```text
settings
unlocked characters
progression
achievements
cosmetics
player profile
```

Run state can eventually have a separate representation.

---

# 50. Browser Deployment

The client should remain a normal static web application where possible.

Conceptually:

```text
Static Client Hosting

        +

Node Multiplayer Server
```

The client can potentially live on:

- CDN/static host
- standard frontend hosting

while the realtime game server runs separately.

We do not need to select final hosting infrastructure during Prototype 0.1.

---

# 51. Development Environments

We should eventually support:

```text
development
test
production
```

Environment configuration may include:

```text
API URL
game server URL
debug mode
analytics
asset base URL
```

Avoid embedding environment-specific URLs throughout the code.

---

# 52. Proposed Initial Repository

I would start approximately here:

```text
fantasy-survivors/
│
├── apps/
│   │
│   └── client/
│       ├── src/
│       └── public/
│
├── packages/
│   │
│   ├── game-core/
│   │
│   ├── game-data/
│   │
│   └── shared/
│
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

Later:

```text
apps/
│
├── client/
└── server/
```

---

# 53. Possible Client Structure

Conceptually:

```text
src/

    app/
        App.tsx
        routes/

    game/
        GameCanvas.tsx

        render/
        camera/
        effects/
        animation/

    input/
        InputManager.ts
        KeyboardInput.ts
        GamepadInput.ts

    audio/

    ui/
        hud/
        menus/
        screens/

    state/

    assets/
```

Most gameplay rules should be outside this app package inside `game-core`.

---

# 54. Possible Game Core Structure

```text
game-core/src/

    simulation/
        GameSimulation.ts

    entities/
        Player.ts
        Enemy.ts

    systems/
        MovementSystem.ts
        CombatSystem.ts
        TargetingSystem.ts
        SpawnSystem.ts
        RoundSystem.ts

    combat/
        Damage.ts

    events/

    math/

    random/

    time/
```

We should not create all of these empty folders on day one.

This represents the direction.

---

# 55. Possible Game Data Structure

```text
game-data/src/

    characters/
        warrior.ts

    weapons/
        longsword.ts

    enemies/
        goblin.ts

    upgrades/

    arenas/

    rounds/
```

Prototype 0.1 might literally contain:

```text
warrior
longsword
goblin
forestArena
```

That is fine.

---

# 56. Multiplayer Addition Later

When ready:

```text
apps/server/

    rooms/
        GameRoom.ts

    simulation/

    networking/

    matchmaking/
```

However, we should attempt to reuse `game-core`.

Conceptually:

```text
Browser Single Player

GameSimulation
      ▲
      │
 Local Input


Multiplayer Server

GameSimulation
      ▲
      │
 Network Input
```

That is one of the most valuable architectural goals in this document.

---

# 57. Unity Migration Philosophy

We should assume:

**The TypeScript implementation will eventually be rewritten.**

What we want to preserve are the designs.

For example:

```text
TypeScript WeaponDefinition
          ↓
conceptually becomes
Unity ScriptableObject
```

```text
TypeScript GameSimulation
          ↓
conceptually becomes
Unity gameplay systems
```

```text
InputAction abstraction
          ↓
conceptually becomes
Unity Input System actions
```

```text
EnemyDefinition tags
          ↓
conceptually become
Unity gameplay data
```

We are designing concepts that translate cleanly rather than trying to share executable code with Unity.

---

# 58. Systems Worth Designing for Unity Compatibility

Especially preserve conceptual clarity around:

```text
CharacterDefinition
WeaponDefinition
UpgradeDefinition
EnemyDefinition
StatusEffectDefinition
DamageEvent
InputAction
GameEvent
RoundDefinition
```

These concepts will probably survive the engine transition almost unchanged even when their implementations do not.

---

# 59. Things We Should NOT Build Yet

Prototype architecture can easily become its own project.

For now, explicitly postpone:

- authentication
- databases
- cloud saves
- matchmaking services
- accounts
- reconnect systems
- rollback netcode
- anti-cheat
- analytics infrastructure
- dedicated server orchestration
- complicated ECS
- custom rendering engine
- sophisticated asset pipeline
- modding API
- replay system

We can leave seams for them without implementing them.

---

# 60. ECS?

We should **not start with a full Entity Component System** merely because we expect many enemies.

A simple simulation containing arrays/maps of game entities and well-separated systems is easier to iterate on.

Example:

```text
GameSimulation

players
enemies
projectiles

MovementSystem
CombatSystem
SpawnSystem
```

If profiling or complexity eventually demonstrates that an ECS would provide real value, we can evaluate one.

We should not pay that complexity cost preemptively.

---

# 61. Networking Milestones

Networking should arrive incrementally.

## Networking 0

No networking.

Single player simulation.

---

## Networking 1

Two clients connect to a room.

Players can see each other.

---

## Networking 2

Server-authoritative movement.

Prediction and interpolation.

---

## Networking 3

Shared enemies.

Shared combat.

---

## Networking 4

Shared rounds and game state.

---

## Networking 5

Lobby + join codes + ready state.

---

## Networking 6

Scale to four players.

This prevents "implement multiplayer" from becoming one enormous task.

---

# 62. Controller Milestones

Similarly:

## Controller 0

Keyboard movement.

## Controller 1

Gamepad movement.

## Controller 2

Automatic device switching.

## Controller 3

Controller UI prompts.

## Controller 4

Full menu navigation.

## Controller 5

Rebinding/settings.

Gamepad movement should arrive relatively early.

Controller menu polish can wait.

---

# 63. Physics Milestones

## Physics 0

Player and arena collision.

## Physics 1

Enemy collision.

## Physics 2

Knockback.

## Physics 3

One test ragdoll.

## Physics 4

Ragdoll pooling/cleanup.

## Physics 5

Performance evaluation with many enemies.

Again, each system should prove itself before expanding.

---

# 64. Architectural North Star

Our long-term browser architecture should conceptually look like:

```text
                ┌─────────────────────┐
                │      React App      │
                │                     │
                │ Menus / HUD / Shop  │
                └──────────┬──────────┘
                           │
                           │
              ┌────────────▼────────────┐
              │     Client Runtime      │
              │                         │
              │ Input    Audio    FX    │
              │ Camera   Rendering      │
              └────────────┬────────────┘
                           │
                    displays state
                           │
                ┌──────────▼───────────┐
                │    Game Simulation   │
                │                      │
                │ Players              │
                │ Enemies              │
                │ Combat               │
                │ Movement             │
                │ Rounds               │
                │ Upgrades             │
                └──────────┬───────────┘
                           │
                           │
                  later becomes networked
                           │
                ┌──────────▼───────────┐
                │   Colyseus Server    │
                │                      │
                │ Authoritative Match  │
                └──────────────────────┘
```

Single player initially runs the simulation locally.

Multiplayer eventually moves authoritative simulation to the server.

That transition is one of the primary reasons to keep simulation separate from rendering now.

---

# 65. Prototype 0.1 Actual Dependencies

Despite everything described above, our first combat sandbox should probably only install what it actually needs.

Likely:

```text
react
react-dom
three
@react-three/fiber
@react-three/drei
@react-three/rapier
zustand
vite
typescript
```

Potentially Vitest as well.

We do **not** need Colyseus running yet.

We simply prepare the code organization for it.

---

# 66. Early Technical Decisions

Current decisions:

**Frontend framework:** React

**3D:** Three.js through React Three Fiber

**Physics:** Rapier

**UI:** React DOM

**State:** Zustand for app/shared state

**Simulation:** Standalone TypeScript gameplay layer

**Input:** Action-based abstraction

**Controller:** Native Gamepad API

**Networking:** Future authoritative Colyseus server

**Runtime assets:** GLB/glTF

**Architecture:** TypeScript monorepo

**Multiplayer target:** 1–4 players

**Final production target:** Unity

---

# 67. Decisions Still Open

We do not yet need to decide:

- 30 Hz vs 60 Hz simulation
- network tick rate
- exact enemy representation strategy
- whether to eventually introduce ECS
- animation library/tooling
- final audio library
- hosting provider
- authentication
- database
- persistence architecture
- production asset compression
- final multiplayer matchmaking model
- Steam integration
- Unity networking solution
- whether Unity eventually uses dedicated servers

These should remain open until the prototype provides more information.

---

# 68. Technology Success Criteria

This architecture is succeeding if:

- adding an enemy type does not require editing rendering everywhere
- changing controls does not require editing gameplay logic
- switching keyboard to controller does not change simulation code
- combat can be tested without rendering
- R3F components remain mostly presentation-oriented
- enemy counts can increase without React becoming the bottleneck
- physics can be replaced or simplified for hordes
- multiplayer can reuse existing simulation concepts
- game data remains understandable outside the renderer
- tuning variables are easy to modify
- the team can quickly experiment without fighting the architecture

Most importantly:

**The architecture should disappear while we make the game.**

If every gameplay experiment requires touching six abstraction layers, we have over-engineered it.

---

# 69. Guiding Rule

When deciding whether to architect something now, ask:

> **Will this boundary be expensive to introduce later?**

If yes, establish the boundary now.

Examples:

- simulation vs rendering
- input actions vs keyboard keys
- game data vs hardcoded characters
- stable IDs
- fixed simulation concepts

If no, postpone it.

Examples:

- matchmaking infrastructure
- databases
- account systems
- advanced replay support
- sophisticated pooling
- server scaling

This gives us a prototype that is deliberately small without being deliberately disposable.

---

# 70. Current Stack Summary

```text
                    BROWSER
                       │
          ┌────────────┴────────────┐
          │                         │
        React                  Three.js
          │                         │
      DOM UI                 React Three Fiber
                                    │
                              Drei / Rapier
                                    │
                              Presentation
                                    │
                             Game Simulation
                                    │
                ┌───────────────────┼───────────────────┐
                │                   │                   │
             Input              Game Data            Events
                │
       Keyboard / Gamepad


                    LATER

                Browser Clients
                      │
                  WebSocket
                      │
                 Colyseus
                      │
             Authoritative Game
                  Simulation
```

This is the architecture we should use as the starting assumption unless prototype experience gives us a reason to change it.