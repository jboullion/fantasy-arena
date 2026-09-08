# Fantasy Arena image UI

Open `/?ui-preview=1` to browse Welcome, Adventurer, Party, Camp shop, Pause, Victory, Defeat and Statistics. This is an isolated art sandbox with illustrative values and local interactions; buttons do not connect to multiplayer. The actual game uses the same skins on existing lobby, shop, results, reports, pause, debug and HUD panels. The existing scenes and gameplay flow remain active.

## Art and layout

Three original generated PNG textures are shared across the menus. All names, numbers, labels and control hit areas are separate live UI. No text is baked into the art. CSS border-image uses nine slices, keeping the corner ornament size constant when panels grow. The leather center stretches, so some grain elongation is expected on extreme aspect ratios.

| File in apps/client/public/ui | Source dimensions | Slice borders L/B/R/T | Display border |
| --- | --- | --- | --- |
| panel-leather.png | 1254 × 1254 | 110 / 110 / 110 / 110 | 20 logical px panels, 10 cards |
| button-brass.png | 2172 × 724 | 210 / 210 / 210 / 210 | 12 logical px |
| button-patina.png | 2172 × 724 | 280 / 280 / 280 / 280 | 10 logical px |

Palette: ivory #f6eed9, gold #e0c18a, secondary text #c1c5b6, field backing #0b1512. Headings use Cinzel, body uses Inter with system fallbacks. Fonts currently load through Google Fonts in the browser; the PNG package does not bundle fonts. Obtain and include font files and their licenses when making Unity text assets.

Buttons have normal, hover, pressed, disabled and keyboard-focus styles; selected character cards also show a check mark. Buttons and input fields have a minimum 44 logical pixel height. Desktop keeps a 410px menu on the right; portrait stacks scrollable content below the world at 650px viewport width. Safe-area padding is included. This prototypes responsive menus, not mobile gameplay controls.

## Unity uGUI import

1. Copy `apps/client/public/ui` to `Assets/FantasyArenaUI/Textures`. The zip beside this document's handoff folder also contains these textures.
2. Set Texture Type to Sprite (2D and UI), Sprite Mode Single, Mesh Type Full Rect, Wrap Mode Clamp, Filter Mode Bilinear, mipmaps off. Keep NPOT scaling disabled and Max Size 4096 to preserve source slice coordinates. Start uncompressed; assess target-platform compression visually later.
3. In Sprite Editor set borders from the table. On a uGUI Image select Type Sliced and Fill Center. Use child TextMeshPro components for all labels and separate Button components for interaction.
4. With sprite PPU and Canvas reference PPU both 100, set Image Pixels Per Unit Multiplier to 5.5 for 20px panel corners, 11 for 10px card corners, and 17.5 for 12px brass button corners, and 28 for 10px patina button corners. These ratios map source border pixels to the browser's logical border sizes.
5. Begin with Screen Space Overlay Canvas, Canvas Scaler Scale With Screen Size, reference 1440 × 900, match 0.5. Anchor the desktop menu top-right inside a safe-area root. Use a vertical layout and ScrollRect for long content. Portrait needs a layout switch and full-width anchored menu; Canvas Scaler alone does not reflow layouts.
6. Map hover/pressed/disabled to Button Color Tint and add a separate focus/selection outline. Keep decorative Images' Raycast Target off. Live text, input fields and buttons remain separate objects for localization, keyboard/controller navigation and accessibility.

Suggested hierarchy: Canvas > SafeArea > ScrollRect > Content > Panel Image > Heading / Body / Button Image > TMP label. Keep the 3D camera below this canvas. Do not flatten entire screens into single images.

Unity references: [9-slicing UI images](https://learn.unity.com/tutorial/5f7cf6b3edbc2a00251b9888?version=2022.3) and [screen size and anchors](https://learn.unity.com/tutorial/manage-screen-size-and-anchors?version=6.0).

## Verification and limits

Run `npm run build` and `node tests/menu-art.mjs` with the dev client on port 5173. Screenshots are written to `test-results/menu-art`. The browser check covers eight screens at desktop, portrait phone and landscape phone sizes, horizontal overflow, ready/purchase feedback and the real lobby. Unity import and device builds have not been executed; this deliverable is a browser prototype and portable texture kit, not Unity prefabs. Welcome is available in the preview only; the real game still opens its existing lobby.

Secondary patina buttons cover shop purchases, readiness, stats, history and export actions. Brass remains the main start/retry/return action; Leave party also uses the secondary image. All button labels remain live text.

All HTML buttons now default to the secondary patina sprite, including lobby join/copy/ready/leave, HUD controls, debug controls and preview navigation. Primary buttons retain brass and character choices retain leather cards.
