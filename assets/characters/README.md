# Fantasy Arena character set

Original procedural Blender models authored for this project. No downloaded models, textures, paid generation providers, or third-party art are used. No separate redistribution license is assigned to this project-local asset set.

Open `fantasy-arena-characters.blend` and select the **Fantasy Arena Character Workshop** scene. The original scene was preserved. Each model has an editable armature with rigid mesh pieces parented to its bones. `lineup.png` is the Blender-rendered reference. The generator is `scripts/create-character-assets.py` (its ROOT points to this workspace).

## Runtime contract

GLBs and the joint manifest live in `apps/client/public/models`. All positions use meters, Y up, +Z forward. Each mesh has a stable `extras.part` name, a pivot, and a vertex-color material. There are no texture fetches or skinning dependencies. These are segmented rigid-part characters, not continuously deforming skinned meshes.

| Model | Triangles | Rigid mesh parts | GLB bytes |
| --- | ---: | ---: | ---: |
| Human warrior | 1,972 | 14 | 175,224 |
| Dwarf guardian | 2,100 | 15 | 186,468 |
| Goblin | 1,596 | 12 | 140,204 |

The pelvis, torso, head, upper arms, forearms, thighs and shins form the ragdoll. Elbows and knees have hinge limits; shoulders, hips, neck and waist use spherical joints. Swords and shields have no ragdoll joint and receive independent launch velocities. The warrior scabbard has one hinge at the belt; the dwarf beard has two connected hinged pieces, active during life and death.

The GLBs carry geometry and part identifiers. `manifest.json` defines runtime pivots, collider sizes and joint anchors; Blender constraints are not expected to survive GLB export. `CharacterModels.tsx` creates Rapier bodies and joints in the browser. Gameplay damage and actor movement remain server-authoritative. Cosmetic physics can differ between players.

Living enemies use twelve instanced draw groups. Existing enemy variants use the same goblin geometry with their established scale/color. Enemy ragdolls are capped at eight and expire after five seconds; player corpses last until revival or leaving the scene. Corpse collisions are with the ground only. This keeps the body budget bounded and prevents decorative physics from moving living actors. The final party death is shown for 1.6 seconds before the report.

## Verification

`node tests/character-assets.mjs` checks all files with the Khronos glTF validator and checks pivots, part coverage, detachable weapons and asset budgets. All three exports passed with zero errors and warnings.

With Vite running on port 5174, `node tests/character-physics.mjs` checks moving attachments, dwarf joint count, detached weapons, finite falling bodies, the eight-corpse cap, cleanup and a 200-enemy render. Reports and screenshots are written under ignored `test-results`. The first local 200-enemy sample was 61 FPS; this is a machine-specific smoke check, not a cross-device performance guarantee.
