# Fantasy Arena Survival
## Living Game Concept Document

**Status:** Early Concept  
**Purpose:** Capture the evolving vision of the game before and during prototyping.  
**Rule:** Nothing in this document is sacred. Ideas should be changed, removed, expanded, or contradicted when playtesting tells us something better.

---

# 1. High Concept

A 1–4 player cooperative fantasy arena-survival game about building increasingly ridiculous characters over the course of a single run.

Players choose distinctive fantasy adventurers, survive escalating waves of enemies, earn rewards, purchase upgrades, and create increasingly powerful combinations of weapons, abilities, traits, and effects.

A run should begin relatively grounded:

- A warrior swings a sword.
- A wizard throws fireballs.
- A rogue throws knives.
- A bard supports the party.

By the final rounds, those same characters should have evolved into absurd fantasy powerhouses capable of destroying enormous hordes of enemies through chaotic combinations of abilities and upgrades.

The primary emotional arc is:

**“We started as adventurers. Now we are completely broken.”**

The game should be easy to understand, fast to play, funny without becoming a pure comedy game, and deep enough that players want to experiment with new characters and builds repeatedly.

---

# 2. Long-Term Vision

The eventual game is intended to be a polished standalone title, most likely developed in Unity.

Before committing to full production, we will create a smaller browser-based 3D prototype.

The browser version exists primarily to answer design questions:

- Is the combat fun?
- Is movement satisfying?
- Do characters feel different?
- Is the upgrade loop addictive?
- Is multiplayer more fun than solo play?
- Do cooperative builds create interesting interactions?
- Is the shop enjoyable or disruptive?
- How quickly should characters become powerful?
- How much visual chaos can occur before the game becomes unreadable?
- Are 20 rounds appropriate for a complete session?

The browser prototype should evolve rapidly.

The eventual Unity game should inherit the successful **design concepts**, not necessarily the implementation.

---

# 3. Player Fantasy

The player fantasy is not simply:

**“Fight fantasy monsters.”**

It is:

**“Build an increasingly ridiculous fantasy adventurer and discover what kind of monster you can turn them into.”**

A good run should produce stories.

Examples:

> “My dwarf became practically indestructible.”

> “The wizard caused every burning enemy to explode, which ignited more enemies, which caused the entire screen to explode.”

> “We made the bard so powerful that everyone stood next to him and attacked twice as fast.”

> “The rogue somehow ended up teleporting constantly and killing everything with critical hits.”

The player should frequently discover combinations that feel almost unintended.

The game should encourage players to wonder:

**“What happens if I combine these?”**

---

# 4. Core Design Pillars

## 4.1 Become Ridiculously Powerful

The progression curve is intentionally extreme.

Players should begin a run feeling competent but limited.

By the end of a successful run, they should feel enormously stronger than they did at the beginning.

Power progression should include more than numerical increases.

Weak progression:

- +5% damage
- +8 health
- +3% attack speed

Interesting progression:

- Fireballs split into three smaller fireballs.
- Critical hits create lightning.
- Burning enemies explode when killed.
- Healing releases holy damage.
- Blocking an attack causes retaliation damage.
- Thrown weapons return to the player.
- Enemies killed by poison become temporary allies.

Numerical improvements will still exist, but transformational upgrades should provide much of the excitement.

---

## 4.2 Strong Character Identity

Characters should feel mechanically different rather than functioning primarily as cosmetic skins.

Each character should ideally have some combination of:

- unique starting stats
- starting weapon
- passive ability
- active ability
- preferred upgrade synergies
- unusual gameplay rule
- visual personality

The player should immediately understand that playing the Wizard will produce a fundamentally different experience from playing the Dwarf.

---

## 4.3 Cooperative Chaos

Multiplayer should be more than four people independently fighting enemies.

Characters and builds should interact.

Possible cooperative interactions include:

- buffs
- healing
- crowd control
- debuffs
- enemy grouping
- shared elemental effects
- resurrection
- protective abilities
- combo effects

A group composition should occasionally create strategies the developers did not explicitly plan.

The ideal multiplayer experience contains moments where players yell things such as:

> “Freeze them!”

> “Get near the bard!”

> “Bring them over here!”

> “How are you doing that much damage?”

---

## 4.4 Simple Controls, Deep Builds

Combat should be immediately approachable.

Players should spend more mental energy choosing where to move and how to construct their character than executing complicated attack combinations.

A possible long-term control philosophy:

- Move
- Aim
- Character Ability
- Ultimate / Secondary Ability
- Interact
- Pause

Most normal weapons may attack automatically.

This remains an open design decision and should be tested.

---

## 4.5 Readable Insanity

The game should eventually become visually chaotic.

That chaos is desirable.

Confusion is not.

Players must still be able to identify:

- their character
- dangerous attacks
- elite enemies
- bosses
- pickups
- important abilities
- downed teammates

The game should feel spectacular without becoming visual noise.

---

# 5. Tone

The target tone is mature fantasy without becoming excessively graphic, sexual, cynical, or grim.

The intended audience will likely skew toward teenage and adult male players, although the game should not depend on alienating anyone else.

Potential tonal ingredients:

- fantasy violence
- exaggerated physics
- ragdolls
- blood effects
- alcohol
- tavern humor
- suggestive humor
- attractive fantasy characters
- dark jokes
- absurd item descriptions
- occasional crude humor
- heroic fantasy archetypes
- monsters being launched through the air

The tone should probably land somewhere between:

**action fantasy + tabletop adventuring + tavern humor + arcade absurdity**

The world can take itself seriously enough for players to care about it while allowing individual items, characters, enemies, and events to be ridiculous.

---

# 6. Visual Direction

Current preference:

**Stylized 3D fantasy.**

Probably somewhat exaggerated and low-to-medium poly rather than realistic.

Goals:

- clear silhouettes
- colorful environments
- readable enemies
- exaggerated weapons
- exaggerated spell effects
- expressive characters
- efficient rendering
- good ragdoll behavior
- relatively inexpensive content production

The final visual style remains open.

Potential influences include colorful action RPGs, tabletop miniatures, stylized fantasy animation, and arcade games.

We should avoid visually tying ourselves too closely to a single existing franchise.

---

# 7. Core Game Loop

The broad loop is:

**Choose Character**

↓

**Enter Arena**

↓

**Fight Enemies**

↓

**Survive Round**

↓

**Receive Rewards**

↓

**Buy / Choose Upgrades**

↓

**Prepare for Next Round**

↓

**Fight Stronger Enemies**

↓

**Repeat**

↓

**Final Battle**

↓

**Run Results**

The shop and upgrade sequence should be an important part of the experience rather than merely downtime between fights.

---

# 8. Session Structure

Current concept:

**20 rounds per complete run.**

This is not yet final.

A possible progression:

## Rounds 1–5 — Establish the Build

Players learn their character and begin collecting basic upgrades.

Enemies are relatively straightforward.

Build direction begins emerging.

---

## Rounds 6–10 — Specialize

Players begin finding meaningful synergies.

New enemy types appear.

Players increasingly specialize into recognizable builds.

Round 10 could contain a major boss or milestone encounter.

---

## Rounds 11–15 — Escalation

Characters begin becoming dramatically powerful.

Upgrade combinations become more important.

Enemy density and elite frequency increase.

Large-scale effects become common.

---

## Rounds 16–19 — Controlled Chaos

The screen becomes increasingly ridiculous.

Players should now have strong build identities.

Enemy groups become extremely large.

Powerful elite combinations appear.

---

## Round 20 — Finale

A major boss and/or enormous enemy assault.

The goal should be less about perfectly balancing the player's power and more about allowing the completed build to demonstrate what it can do.

The finale should feel like:

**“Show us what you built.”**

---

# 9. Target Session Length

Current rough target:

**30–45 minutes.**

Possible combat round duration:

**60–90 seconds**

Possible upgrade/shop duration:

**20–45 seconds**

This should be heavily tested.

The game should avoid runs feeling exhausting.

We may eventually support:

- shorter modes
- endless mode
- difficulty modifiers
- challenge runs
- boss rush
- custom run lengths

These are not initial priorities.

---

# 10. Initial Character Concepts

The first roster should use familiar fantasy archetypes so players immediately understand them.

## Human Warrior

**Fantasy:** Classic aggressive melee fighter.

Possible traits:

- sword
- high health
- close-range damage
- rage
- whirlwind attacks
- armor
- retaliation

Potential progression:

Eventually becomes a walking blender capable of smashing or launching entire groups of enemies.

---

## Dwarf Warrior

**Fantasy:** Tough defensive bruiser.

Possible traits:

- axe or hammer
- armor
- stagger
- knockback
- defensive bonuses
- drinking-related upgrades
- resistance to crowd control

Potential progression:

Eventually becomes nearly immovable while knocking enemies across the battlefield.

---

## Halfling Rogue

**Fantasy:** Fast, evasive opportunist.

Possible traits:

- daggers
- throwing knives
- critical hits
- poison
- backstab
- movement bonuses
- dodge

Potential progression:

Eventually becomes a teleporting critical-hit machine moving constantly through enemies.

---

## Elf Wizard

**Fantasy:** Fragile ranged magical powerhouse.

Possible traits:

- fireballs
- elemental damage
- projectile modifiers
- area attacks
- chain reactions
- teleportation
- spell amplification

Potential progression:

Eventually fills enormous portions of the battlefield with overlapping magical effects.

---

## Human Bard

**Fantasy:** Support character capable of becoming unexpectedly dangerous.

Possible traits:

- music
- magical projectiles
- party buffs
- auras
- enemy debuffs
- charm effects
- rhythm-related attacks

Potential progression:

Eventually turns the entire team into an amplified killing machine while contributing substantial damage.

---

# 11. Future Character Directions

Once the game's core systems are proven, the roster can become progressively stranger.

Possible characters:

- Vampire
- Warlock
- Necromancer
- Cleric
- Paladin
- Ranger
- Monk
- Orc
- Goblin
- Troll
- Lizardman
- Fairy
- Witch
- Death Knight
- Druid
- Ratman
- Slime
- Skeleton
- Mimic
- Demon
- Drunken Monk
- Angry Peasant
- Retired Adventurer
- Mushroom Wizard

The roster should eventually be part of the game's personality.

Characters should range from recognizable fantasy archetypes to increasingly strange concepts.

---

# 12. Weapons

Weapons should vary substantially in behavior.

Possible categories:

## Melee

- sword
- axe
- hammer
- spear
- dagger
- flail
- greatsword

## Ranged

- bow
- crossbow
- throwing knives
- throwing axes
- javelins

## Magic

- fireballs
- lightning
- frost bolts
- arcane missiles
- curses
- summoned weapons

## Strange

- exploding chickens
- beer mugs
- magical instruments
- severed monster parts
- cursed books
- flying shields

The weapon system should eventually encourage surprising combinations.

---

# 13. Upgrade Philosophy

Upgrades should exist at several levels.

## Statistical Upgrades

Useful but relatively straightforward.

Examples:

- damage
- movement speed
- attack speed
- critical chance
- armor
- maximum health
- range
- cooldown reduction

---

## Weapon Modifiers

Examples:

- piercing
- ricochet
- additional projectiles
- increased size
- returning projectiles
- explosions
- homing
- chaining
- projectile splitting

---

## Elemental Effects

Potential categories:

- fire
- ice
- lightning
- poison
- holy
- shadow
- bleed
- arcane

These should interact where possible.

---

## Character Upgrades

These change the character's defining abilities.

Examples:

**Warrior**

Whirlwind lasts longer.

**Wizard**

Every third spell fires twice.

**Bard**

Battle Hymn affects a larger radius.

**Rogue**

Backstab teleports the player behind the target.

---

## Weird Upgrades

These should produce memorable runs.

Examples:

- Critical hits summon chickens.
- Gold pickups explode.
- Healing damages nearby enemies.
- Every seventh attack becomes enormous.
- Dead enemies occasionally return as friendly skeletons.
- Projectiles orbit the player before launching.
- Blocking attacks fires projectiles.
- Enemies killed while frozen shatter into damaging fragments.
- Drinking a potion temporarily doubles attack speed.

The stranger upgrade category may eventually become one of the defining characteristics of the game.

---

# 14. Synergy System

A tag-based system may eventually allow content to interact naturally.

Example weapon:

**Fireball**

Tags:

- Magic
- Projectile
- Fire
- Explosion

Upgrade:

**Pyromaniac**

Improves all `Fire` effects.

Upgrade:

**Unstable Magic**

Improves all `Explosion` effects.

Upgrade:

**Arcane Multiplicity**

Causes `Magic Projectile` abilities to occasionally duplicate.

This could allow a relatively small amount of content to create a large number of interactions.

The exact implementation remains undecided.

---

# 15. Economy and Between-Round Progression

Players earn some form of currency during combat.

Possible sources:

- killed enemies
- elite enemies
- boss rewards
- pickups
- challenges
- bonus objectives

Between rounds, players can purchase upgrades.

Possible shop features:

- several randomized items
- reroll
- lock item
- sell equipment
- upgrade existing equipment
- combine items
- character-specific offerings
- rarity tiers

The first implementation should remain much simpler.

Long term, shopping should create tension:

**Spend money now or save for something better?**

---

# 16. Multiplayer

Target:

**1–4 players**

Online multiplayer is the primary cooperative goal.

Players will probably each have their own screen and camera.

This allows the battlefield to remain large and avoids many shared-camera problems.

Important multiplayer goals:

- easy lobby creation
- easy friend joining
- visible ready states
- individual shops
- cooperative abilities
- revives or downed-state mechanics
- useful team builds
- readable player identification

The game should still be enjoyable solo.

Possible balancing variables:

- enemy health
- enemy count
- elite frequency
- boss health
- reward amounts
- revival rules

We should avoid simply multiplying everything by player count.

---

# 17. Death and Failure

This remains undecided.

Possible multiplayer model:

A player reduced to zero health becomes **downed**.

Teammates can revive them.

Possible failure conditions:

- everyone is down simultaneously
- revival timer expires
- limited number of revives per round
- dead players return next round

We should avoid making a player spend long portions of a multiplayer session doing nothing.

Player death should create tension without becoming overly punishing.

---

# 18. Enemies

Initial enemies should use immediately understandable behaviors.

Possible basic archetypes:

## Grunt

Runs toward the player.

## Archer

Maintains distance and fires projectiles.

## Brute

Slow, tough, heavy-hitting.

## Exploder

Rushes toward players and detonates.

## Swarm Enemy

Very weak but appears in huge numbers.

## Elite

Enhanced version of another enemy with additional abilities.

Over time we can introduce:

- shields
- healers
- summoners
- teleporters
- flyers
- burrowers
- necromancers
- chargers
- assassins
- spellcasters
- mounted enemies

The goal is not merely more enemy health.

New enemies should force different movement decisions.

---

# 19. Bosses

Bosses should provide punctuation during longer sessions.

Possible uses:

- major milestone rounds
- final encounter
- rare bonus encounters
- character unlock conditions

Bosses should ideally create recognizable attack patterns while still allowing the game's normal horde combat to continue.

The final boss may be accompanied by a huge enemy swarm rather than existing alone.

---

# 20. Ragdolls and Physical Comedy

Ragdolls fit the intended tone and should be explored early.

Enemies killed by:

- hammers
- explosions
- powerful spells
- knockback
- charging attacks

could be physically launched across the arena.

This helps make attacks feel powerful.

Potential philosophy:

**Gameplay entity dies → temporary ragdoll visual appears → ragdoll disappears after several seconds.**

The goal is spectacle without allowing hundreds of corpses to destroy performance.

---

# 21. Combat Feel

Combat should prioritize:

- immediate responsiveness
- satisfying impacts
- readable attacks
- strong hit effects
- knockback
- sound feedback
- exaggerated animations
- clear enemy deaths
- responsive movement

Even very simple combat can feel excellent if these elements are strong.

Early prototypes should focus more heavily on combat feel than content quantity.

---

# 22. Camera

Current direction:

**Elevated third-person / isometric-like camera.**

Not directly overhead.

The camera should allow players to appreciate the 3D models and physical interactions while preserving battlefield readability.

Possible camera characteristics:

- fixed downward angle
- follows individual player
- limited rotation or no rotation
- slight dynamic zoom
- subtle shake for major impacts

This requires experimentation.

---

# 23. Environments

Initial gameplay should occur in relatively simple arena-style environments.

Possible settings:

- forest clearing
- ruined village
- castle courtyard
- graveyard
- underground dwarven hall
- magical academy
- swamp
- desert ruins
- frozen fortress
- infernal realm

Environmental gameplay could eventually include:

- traps
- destructible props
- hazards
- explosive barrels
- shrines
- temporary objectives

These should not distract from the main combat loop.

---

# 24. Meta Progression

Not required for the early prototype.

Potential long-term systems:

- character unlocks
- weapons
- starting options
- cosmetic items
- difficulty tiers
- challenge modifiers
- achievements
- permanent unlock trees

Permanent progression should ideally increase **variety**, not simply provide enormous permanent statistical advantages.

The primary satisfaction should remain building a character during an individual run.

---

# 25. Humor and Writing

Item descriptions and character interactions could provide much of the game's personality.

Example:

**Dwarven Emergency Ale**

+Attack Speed  
+Movement Speed  
-Accuracy

*"It's medicinal."*

Another:

**Questionable Wizard Hat**

+Magic Damage  
+Spell Size  

*"Property of an accredited institution. Probably."*

Humor should generally supplement the fantasy rather than turn every element into a joke.

---

# 26. Potential Social Experience

A successful multiplayer session should encourage:

- comparing builds
- laughing at ridiculous effects
- showing off damage numbers
- helping teammates
- discussing shop choices
- blaming friends for bad decisions
- celebrating absurd combinations
- immediately starting another run

The game should naturally generate stories among friends.

---

# 27. What We Currently Believe

These are hypotheses rather than commitments.

We currently believe:

- 1–4 player cooperative play is the correct format.
- 3D presentation will help differentiate the game.
- Fantasy provides a huge amount of character and weapon variety.
- Automatic or mostly automatic weapons may fit the desired pacing.
- Characters should have strong mechanical identities.
- Players should become dramatically overpowered by the end of a run.
- Upgrade synergies are likely to be more important than raw statistical progression.
- Around 20 rounds may create a satisfying complete session.
- Ragdolls and exaggerated physical reactions fit the tone.
- The game should remain mechanically approachable despite deep build possibilities.
- The browser is an appropriate environment for validating these ideas before committing to full Unity production.

Every one of these assumptions can change.

---

# 28. Things We Specifically Do Not Know Yet

Important unresolved questions:

### Combat

Should players manually aim?

Should normal attacks be completely automatic?

How many active abilities should a player have?

How fast should characters move?

How large should arenas be?

---

### Progression

Should players choose upgrades or purchase them?

Should weapons occupy limited slots?

Can characters use any weapon?

Should classes have restricted upgrade pools?

Should upgrades have rarity tiers?

Can items combine?

---

### Multiplayer

Can players revive each other?

What happens when one player dies?

Should rewards be shared?

Can players trade items?

Should support characters be viable solo?

---

### Session Structure

Is 20 rounds too long?

Should bosses appear every five rounds?

Should combat rounds use timers or enemy quotas?

Should there be occasional special rounds?

---

### Tone

How suggestive should the humor become?

How much blood is appropriate?

Should the world lean more heroic, dark, comedic, or absurd?

---

### Camera

Fixed camera angle?

Player-controlled rotation?

Dynamic zoom?

How close should players feel to their character?

---

# 29. Possible Future Experiments

Ideas worth testing eventually:

- elemental interactions
- destructible environments
- environmental hazards
- weapon evolution
- character transformations
- mounts
- temporary companions
- summoned creatures
- shared team abilities
- combo attacks
- boss loot
- cursed upgrades
- gambling mechanics inside shops
- secret characters
- random events
- challenge rooms
- alternate arenas
- endless mode
- custom difficulty modifiers
- PvPvE variant
- local multiplayer
- daily challenge runs

These are ideas, not roadmap commitments.

---

# 30. Anti-Goals

Things we currently do **not** want the game to become:

- a complicated MMO
- a traditional inventory-management-heavy RPG
- a precision competitive shooter
- a narrative-heavy campaign during initial development
- a giant open world
- a realistic combat simulator
- an esports-focused game
- a game where permanent grinding matters more than individual runs
- a game that requires dozens of keyboard commands to play effectively

The game should remain fundamentally about:

**movement + combat + builds + cooperation + escalating chaos**

---

# 31. Success Criteria

The concept is working when players:

- immediately want another run
- talk about their builds afterward
- disagree about which upgrades are best
- laugh at unexpected interactions
- feel noticeably different when switching characters
- experience memorable multiplayer moments
- enjoy both becoming powerful and watching teammates become powerful
- discover combinations we did not intentionally design
- feel disappointed when a run ends because they wanted to keep using their ridiculous build

A very strong signal would be hearing:

> “Okay, one more.”

---

# 32. Living Playtest Notes

This section should evolve continuously.

## Playtest — TBD

**Build / Version:**  
TBD

**Players:**  
TBD

### What Worked

TBD

### What Did Not Work

TBD

### Unexpected Player Behavior

TBD

### Most Fun Moment

TBD

### Most Frustrating Moment

TBD

### Balance Observations

TBD

### UI / UX Observations

TBD

### Multiplayer Observations

TBD

### Ideas Generated During Play

TBD

### Changes We Want to Test

TBD

---

# 33. Concept Change Log

Use this section for significant changes to the overall vision rather than small balance tweaks.

## Initial Concept

- Cooperative 1–4 player fantasy arena-survival game.
- Browser prototype before Unity production.
- Approximately 20 rounds.
- Strong character archetypes.
- Between-round shops and upgrades.
- Extreme late-game power growth.
- Mature fantasy humor and mild violence.
- Ragdoll enemy deaths.
- Increasingly strange playable characters over time.
- Focus on cooperative chaos and build experimentation.

## Future Changes

TBD

---

# 34. Current One-Sentence Pitch

**A 1–4 player fantasy arena-survival game where a party of adventurers fights through escalating hordes, combines increasingly ridiculous upgrades, and evolves from ordinary heroes into completely broken fantasy killing machines over the course of a single run.**