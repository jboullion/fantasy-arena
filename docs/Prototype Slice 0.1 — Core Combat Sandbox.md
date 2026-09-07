# Prototype Slice 0.1 — Core Combat Sandbox

## Purpose

This prototype exists to answer one primary question:

**Is it fun to move around a 3D arena and fight a growing number of enemies?**

Everything in this slice should support answering that question.

This is not yet the real game loop. It is a combat sandbox.

We intentionally exclude most long-term systems so we can focus on:

- movement
- camera feel
- aiming
- attack behavior
- enemy movement
- hit feedback
- damage
- knockback
- death
- enemy density
- visual readability
- basic performance

If this foundation does not feel good, adding characters, upgrades, shops, multiplayer, and progression will not fix it.

---

# 1. Prototype Goal

Create a small browser-based 3D game where:

1. The player enters a simple fantasy arena.
2. The player can move freely.
3. Enemies continuously spawn around the edge.
4. Enemies move toward the player.
5. The player automatically attacks nearby enemies.
6. Enemies take damage and die.
7. Enemy density gradually increases.
8. The player can take damage and die.
9. The prototype can quickly restart.

The experience should be immediately playable without menus or explanation.

---

# 2. Core Playtest Question

At the end of this slice, we should be able to hand the game to a friend and ask:

> "Is running around and fighting these enemies fun?"

More specifically, we want feedback on:

- Does movement feel responsive?
- Does the camera show enough of the battlefield?
- Is automatic attacking satisfying?
- Is it clear which enemy is being attacked?
- Do hits feel impactful?
- Does avoiding enemies feel interesting?
- Is enemy movement predictable but still threatening?
- Is it satisfying when enemies die?
- Does the game become exciting as enemy numbers grow?
- When the player dies, do they want to try again?

---

# 3. Explicit Non-Goals

Do not include these systems yet:

- multiplayer
- lobby
- character selection
- multiple characters
- multiple weapons
- multiple enemy types
- shops
- upgrade cards
- currency
- item rarity
- inventory
- meta progression
- character levels
- bosses
- quests
- story
- procedural levels
- multiple arenas
- unlocks
- permanent saves
- complex animation systems
- polished graphics
- production networking
- final UI design

If we find ourselves building one of these systems, we should ask whether it is genuinely required to evaluate core combat.

Usually it will not be.

---

# 4. Player Character

## Character

Use a simple **Human Warrior**.

The character can initially be represented by:

- a primitive capsule
- a basic placeholder humanoid
- or a simple low-poly character model

The important thing is the silhouette and movement, not appearance.

---

# 5. Player Movement

Initial controls:

**WASD / Left Stick**

Move around the arena.

Movement should initially be camera-relative.

The prototype should test:

- acceleration
- deceleration
- maximum speed
- turn speed
- responsiveness
- diagonal movement
- collision against arena boundaries

We should avoid overly realistic movement.

The player should feel responsive and arcade-like.

A starting philosophy:

**Input should produce movement immediately.**

We can test slight acceleration later if completely instantaneous movement feels unnatural.

---

# 6. Player Facing

This is an important early experiment.

Our initial version should use:

**Automatic facing toward the current attack target.**

Movement direction and facing direction should therefore be independent.

Example:

The player can run south while turning and attacking an enemy to the east.

This supports the idea that combat is primarily about movement and positioning rather than manual attack execution.

---

# 7. Player Dodge

Do not include a dodge roll initially.

We should first determine whether basic movement is sufficient for avoiding enemies.

A dodge can be tested in a later slice if movement lacks enough player expression.

---

# 8. Player Weapon

## Starting Weapon

**Longsword**

The sword automatically attacks the nearest valid enemy within range.

Initial behavior:

1. Find nearest enemy within attack radius.
2. Turn toward enemy.
3. Play attack.
4. Apply damage during the attack.
5. Wait for cooldown.
6. Repeat.

No player input is required to swing.

---

# 9. Sword Attack

The attack should feel exaggerated rather than realistic.

Suggested behavior:

- short wind-up
- wide horizontal swing
- visible attack arc
- strong impact
- small amount of knockback
- brief enemy hit reaction

The sword may damage multiple enemies within its swing arc.

This should be tested early because hitting several enemies at once will probably feel much better than hitting one target at a time.

---

# 10. Initial Combat Variables

All combat values should be easy to modify.

Suggested starting values:

**Player**

- Health: 100
- Movement Speed: TBD through feel testing

**Sword**

- Damage: 25
- Attack Rate: approximately 1 attack per second
- Range: short
- Arc: approximately 100–140 degrees

**Enemy**

- Health: 50
- Contact Damage: 10

These values are starting points, not balance targets.

The goal is to make iteration fast.

---

# 11. Targeting

Initial targeting system:

**Nearest enemy inside attack range.**

Possible improvements later:

- nearest enemy in facing direction
- highest threat
- weighted targeting
- mouse/right-stick influence
- manual aiming

For this prototype we should deliberately start with the simplest system.

One important playtest question:

> Does fully automatic targeting feel satisfying or does the player need some control over attack direction?

This could significantly affect the final combat model.

---

# 12. Enemy

## Enemy Type

Use one basic creature.

Suggested theme:

**Goblin Grunt**

Behavior should be extremely simple:

1. Spawn.
2. Find player.
3. Move toward player.
4. Damage player when close.
5. Continue pursuing.

That is enough.

---

# 13. Enemy Movement

Enemies should not require sophisticated AI.

The primary goal is to create moving obstacles.

They should:

- approach the player
- avoid major arena geometry
- roughly avoid stacking directly inside each other
- push into groups naturally

Perfect pathfinding is unnecessary.

For the initial arena, simple steering should be sufficient.

---

# 14. Enemy Contact

Initially, enemies can deal damage through close-range contact.

Possible behavior:

Enemy reaches attack distance.

↓

Brief attack animation or warning.

↓

Player takes damage.

↓

Enemy attack cooldown begins.

We should avoid unavoidable instantaneous contact damage if it makes melee movement frustrating.

---

# 15. Enemy Death

Enemy deaths should immediately feel satisfying.

Death sequence:

**Enemy health reaches zero**

↓

Remove enemy from gameplay simulation.

↓

Spawn visual death reaction.

↓

Play sound / effect.

↓

Optionally create temporary ragdoll.

The gameplay entity should stop affecting combat immediately.

---

# 16. Ragdoll Experiment

Ragdolls should be included if they can be implemented without significantly delaying the prototype.

They are not required for gameplay, but they are worth testing because they may contribute heavily to the game's tone and combat feel.

Desired behavior:

Sword kill:

- enemy gets pushed backward
- body enters ragdoll
- body remains briefly
- body fades or disappears

Large knockback should produce exaggerated results.

We want to learn whether this adds enough satisfaction to justify the eventual performance cost.

---

# 17. Hit Feedback

Hit feedback is a major priority.

When the sword hits an enemy, combine several inexpensive effects:

- hit animation
- brief directional knockback
- impact sound
- small particle burst
- slight camera response if appropriate
- optional floating damage number

We should test effects individually.

Too much feedback can reduce readability.

---

# 18. Player Damage Feedback

When the player is hit:

- clear audio cue
- brief visual feedback
- health bar change
- subtle screen effect
- optional small camera shake

The player should immediately know:

**I just took damage.**

---

# 19. Arena

Use one small arena.

Suggested concept:

**Fantasy Forest Clearing**

Very simple layout:

```text
     Trees / Rocks / Ruins

  ┌────────────────────────┐
  │                        │
  │                        │
  │                        │
  │         PLAYER         │
  │                        │
  │                        │
  │                        │
  └────────────────────────┘

     Trees / Rocks / Ruins
```

The playable space should essentially be flat.

The environment exists primarily to give the scene scale and personality.

---

# 20. Arena Geometry

The arena should contain:

- flat ground
- invisible outer boundary
- a few decorative objects outside or near the boundary

Avoid interior obstacles initially.

We want the first playtest to evaluate movement and enemy avoidance without pathfinding complications.

After movement feels good, we can experiment with:

- rocks
- ruined pillars
- trees
- walls
- choke points

---

# 21. Arena Size

Arena size should be treated as a tuning variable.

Too small:

- player gets trapped constantly
- camera feels cramped

Too large:

- enemies feel sparse
- player spends too much time running

We should expose arena dimensions as an easily adjustable configuration value.

---

# 22. Camera

Use an elevated third-person / isometric-style perspective.

The camera should:

- follow the player
- maintain a mostly fixed angle
- remain smooth
- show significant space around the player

Initial concept:

Approximately **45–55 degrees downward**.

The character should appear relatively small compared with the screen.

The camera needs to show upcoming threats.

---

# 23. Camera Experiments

We should test several variables independently:

- camera height
- camera angle
- distance
- field of view
- follow smoothing
- dynamic zoom

Initial prototype should probably use a fixed zoom.

Dynamic camera behavior can come later.

---

# 24. Enemy Spawning

Enemies spawn outside or near the edge of the visible arena.

They should not simply appear next to the player.

Basic spawn logic:

1. Select random arena edge.
2. Select position.
3. Spawn enemy.
4. Enemy moves toward player.

Spawn rate gradually increases.

---

# 25. Density Escalation

The prototype should begin calm.

Example:

**0–15 seconds**

A few enemies.

**15–30 seconds**

More frequent spawning.

**30–45 seconds**

Small groups.

**45–60 seconds**

Constant pressure.

This lets us test the transition from:

**movement**

to

**crowd management**

without implementing upgrades yet.

---

# 26. Prototype Round

Initial round duration:

**60 seconds**

The goal is simply:

**Survive.**

If the player survives:

Display:

**ROUND COMPLETE**

Then allow restart.

No shop yet.

If the player dies:

Display:

**YOU DIED**

Then allow restart.

---

# 27. HUD

Keep the first HUD extremely small.

Required:

- health bar
- round timer
- enemy kill count

Optional debug values:

- enemy count
- FPS
- player speed
- current target

Debug information should be easily toggled.

---

# 28. Controls Display

For early external playtests, display a very small control hint:

**WASD — Move**

That may be all we need.

Automatic attacking should become obvious naturally.

---

# 29. Audio

Audio should be included earlier than full visual polish.

Basic sounds:

- sword swing
- sword impact
- enemy death
- player damage
- round complete

Even placeholder sounds are useful.

Combat often feels dramatically worse without audio feedback.

---

# 30. Animation

Animation quality is not a priority yet.

Minimum useful states:

Player:

- idle
- run
- attack
- hit
- death

Enemy:

- run
- attack
- hit
- death

If using placeholder geometry initially, animations can be represented by simple motion.

The gameplay should not depend on obtaining polished character assets.

---

# 31. Physics Scope

Physics should remain limited.

Use physics for:

- player/environment collisions
- enemy/environment collisions if required
- basic enemy separation
- knockback
- optional ragdolls

Do not use full rigid-body physics for every gameplay interaction.

The simulation should remain predictable.

---

# 32. Performance Goal

Because the eventual game may involve hundreds of enemies, we should begin observing performance even at this stage.

Prototype target:

**60 FPS on a typical desktop browser.**

Early stress test:

Gradually increase enemy counts:

- 25
- 50
- 100
- 200

We do not need to fully optimize now.

We simply want to identify obvious architectural problems early.

---

# 33. Debug Controls

This prototype should intentionally contain developer shortcuts.

Suggested controls:

**R**

Restart.

**K**

Kill all enemies.

**H**

Heal player.

**+**

Increase spawn rate.

**-**

Decrease spawn rate.

Optional debug panel:

- enemy speed
- enemy health
- player speed
- sword damage
- attack speed
- spawn interval
- maximum enemies

Rapid tuning is more valuable than polish.

---

# 34. Configuration

Important gameplay values should live in centralized configuration rather than being scattered throughout code.

Conceptually:

```text
PLAYER
    moveSpeed
    maxHealth

SWORD
    damage
    range
    attackSpeed
    knockback

GOBLIN
    moveSpeed
    health
    damage

ROUND
    duration
    spawnRate
    maxEnemies

CAMERA
    height
    angle
    distance

ARENA
    width
    length
```

This will make playtesting dramatically easier.

---

# 35. Prototype Architecture Boundaries

Even though this is disposable prototype code, establish a few healthy boundaries.

## Simulation

Owns:

- player health
- enemy health
- enemy states
- targeting
- attacks
- damage
- spawn timing
- round timer
- death

## Rendering

Owns:

- meshes
- animation
- particles
- camera
- lighting
- visual effects

## Input

Owns:

- keyboard
- gamepad
- action mapping

## UI

Owns:

- HUD
- timer
- health
- death screen
- restart

This separation should make iteration much easier.

---

# 36. Suggested Browser Stack

For this prototype:

- React
- TypeScript
- Vite
- Three.js
- React Three Fiber
- Drei
- React Three Rapier
- Zustand or another lightweight external state store

Normal React/HTML/CSS should handle HUD and menus.

The game simulation should not depend directly on React component state.

---

# 37. Development Milestones

## Milestone A — Empty Arena

We can:

- launch the game
- see the arena
- see the player
- move around
- camera follows correctly

Success means:

**Movement already feels reasonably pleasant.**

---

## Milestone B — One Enemy

Add:

- one goblin
- goblin follows player
- goblin collision
- player can avoid goblin

Success means:

**Being pursued feels understandable and responsive.**

---

## Milestone C — Sword

Add:

- automatic targeting
- sword swing
- damage
- enemy death

Success means:

**Killing a goblin feels satisfying.**

---

## Milestone D — Enemy Horde

Add:

- spawning
- multiple enemies
- enemy separation
- increasing density

Success means:

**Movement through a crowd becomes interesting.**

---

## Milestone E — Player Damage

Add:

- enemy attacks
- player health
- death
- restart

Success means:

**There is meaningful pressure to move well.**

---

## Milestone F — Combat Feel Pass

Experiment with:

- knockback
- particles
- sound
- hit flash
- camera shake
- ragdolls
- animation timing

Success means:

**Basic combat feels significantly better without changing the underlying mechanics.**

---

## Milestone G — Stress Test

Spawn increasing enemy counts.

Observe:

- FPS
- physics performance
- rendering performance
- targeting cost
- AI cost

Success means:

We understand where the first performance bottlenecks are likely to occur.

---

# 38. Completion Criteria

Prototype Slice 0.1 is complete when:

- player movement feels responsive
- camera feels comfortable
- one enemy can pursue the player
- large groups can pursue the player
- automatic sword attacks work reliably
- attacks have satisfying feedback
- enemies can damage the player
- player can die
- enemies can die
- spawn pressure increases throughout the round
- a full 60-second round is playable
- restarting is immediate
- gameplay variables can be tuned quickly
- we have tested basic performance at elevated enemy counts

Most importantly:

**We have playtested it enough to have opinions about the combat.**

---

# 39. Questions We Want This Slice to Answer

After several playtests, record answers to:

## Movement

- Is movement too fast or too slow?
- Should there be acceleration?
- Is strafing important?
- Do we want a dodge?
- Do characters need collision with each other?

## Camera

- Is the angle comfortable?
- Can players see threats early enough?
- Should the camera rotate?
- Should zoom change dynamically?

## Combat

- Is automatic targeting fun?
- Should players influence targeting?
- Is automatic attacking satisfying?
- Should melee hit multiple enemies?
- Does knockback improve combat?
- How fast should attacks occur?

## Enemies

- How many enemies feels exciting?
- When does the screen become too crowded?
- Should enemies collide with each other?
- How aggressively should enemies surround the player?

## Feel

- Do ragdolls add meaningful enjoyment?
- Are damage numbers useful?
- How much camera shake feels good?
- How dramatic should hit effects be?

## Performance

- How many enemies can we display comfortably?
- Is rendering or simulation the first constraint?
- Are physics-based enemies practical at the desired scale?

---

# 40. What Comes After This

Do not immediately add multiplayer.

Assuming this slice feels promising, the next prototype should probably become:

**Prototype Slice 0.2 — The First Real Run**

That would add only enough systems to test progression:

- 3–5 rounds
- basic rewards
- three upgrade choices between rounds
- a small pool of upgrades
- basic end-of-run results

At that point the question changes from:

**“Is combat fun?”**

to:

**“Does improving this character make me want to keep playing?”**

Only after those two foundations are working should we spend significant effort on multiple characters and online multiplayer.