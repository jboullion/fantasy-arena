# Enemy behavior: first playable pass

All behavior and damage run in the shared simulation on the multiplayer server. Clients render action state from world snapshots. Sandbox uses the same simulation locally. The run has six rounds: goblins start on round 1, runners unlock on 2, brutes on 4, and revenants on 6. Round 3 has a mini boss (390 solo health); round 6 has the major boss (975 solo health). Both bosses scale health with party size.

| Enemy | Behavior | Readable cue / counterplay |
| --- | --- | --- |
| Goblin | Enters in a compact pack of 5–10 from one edge, then pursues living players | Packs are separated by longer intervals; use terrain and cleaving attacks |
| Ember Runner | Curves toward a flank, then locks a straight 6.5 m dash when 3–8 m away | Amber lane, 0.65 s warning, then 1 s recovery; sidestep or use rocks |
| Stone Brute | Stops and slams a fixed 3 m radius area | Amber disk, 1.05 s warning, 18 base damage and 1.1 s recovery; leave the disk |
| Frost Revenant | Retreats within 5 m, circles at 5–7 m, and casts at the player's locked position | Blue disk, 1.2 s warning, then 2.8 s frost zone; 35% slow and 6 base damage per second inside; move out |
| Forest Warlord | Calls goblin reinforcements after a 1.4 s warning, then resumes pursuit/contact combat | Gold disk marks the call; packs enter at a safe map edge, with a 14 s cooldown |

Special actions have initial delays, warnings, cooldowns, and recovery states. Damage observes armor, poison weakening, living-player checks, and the existing brief invulnerability window. Frost slowing ends shortly after leaving the zone. Killing a caster removes its active zone. Ice slows runner dashes. Obstacles stop charges. Pause freezes simulation/action timers; reset clears action and player slow state.

Pack spawning is atomic: at least five slots must be free, and every member must have a safe position at least 8 m from living players. If no safe full pack fits, spawning defers. Pack intervals scale with size to retain roughly the prior spawn rate, while density still increases later in the round. Boss reinforcements add pressure but obey the cap and stop at the round timer. The low-level `spawn(count, type)` method retains exact counts for debug presets and controlled tests; normal gameplay uses pack encounters for goblins.

Tune action timings/ranges in `packages/game-core/src/enemyAI.ts`; spawn formation and pacing are in `packages/game-core/src/index.ts`. This is an initial balance pass; automated tests establish mechanics, not player-perceived difficulty.
