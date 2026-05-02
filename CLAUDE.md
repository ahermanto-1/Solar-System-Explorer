# Solar System Explorer

Interactive 3D solar system in the browser. Click bodies to focus, scrub time, drill into surface features. Single-page Three.js app — no framework, no backend.

## Stack

- **Three.js** `^0.169` (only runtime dep)
- **TypeScript** `^5.6` (strict mode), **Vite** `^5.4`
- ES2022, ESM, bundler module resolution
- DOM HUD (no React) — handcrafted divs in [src/hud/HUD.ts](src/hud/HUD.ts)

## Run

```bash
npm run dev      # vite dev @ :5173
npm run build    # tsc + vite build
```

No tests, no linter configured. Type-check via `npm run build`.

## File map

```
src/
  main.ts                 # bootstrap: renderer, scene, rig, picker, HUD, RAF loop
  state/SimState.ts       # single source of truth — time, focus, toggles, telemetry
                          #   pub/sub via subscribe()/emit()
  data/
    bodies.ts             # BODIES[] — orbital elements + physical data, J2000 epoch
    features.ts           # FEATURES[] — surface POIs + Moon explorer metadata
    missions.ts           # MISSIONS[] — Apollo 11, Voyager 2; guided mission chapters + camera/path metadata
  scene/
    SolarSystem.ts        # owns scene graph, Body map, orbit lines, asteroid belt, trails
    Body.ts               # one celestial body — mesh, rings, orbit line, trail; pos in km
    OrbitMath.ts          # Kepler solver, bodyPosition(), sampleOrbit(), orbitalSpeed()
    Scaling.ts            # km → scene units (cinematic log scale or trueScale 1Mkm=1unit)
    CameraRig.ts          # focus-and-orbit camera; tweens between bodies/features
    Picker.ts             # raycaster: click body → focus; click focused body → feature pick
    Starfield.ts          # milky-way background, grid plane
    Textures.ts           # texture path map + cached loader
    AsteroidBelt.ts       # instanced points between Mars/Jupiter
    Trails.ts             # body trail ribbons (toggleable)
    MissionLayer.ts       # guided mission overlay: route lines + spacecraft marker
    SurfaceCoordinates.ts # lat/lon ↔ local-space helpers (−Z equirectangular convention)
  hud/
    HUD.ts                # all DOM panels: desktop rails/playback + mobile sheets/dock
    Labels.ts             # DOM labels overlaid on 3D bodies
    FeatureLabels.ts      # surface feature dot markers (lat/lon → world pos → screen)
    Sparkline.ts          # rolling-60s canvas chart
    format.ts             # fmtKm/fmtMass/fmtUtc/fmtMet/fmtVelocity/fmtSpeed
  styles/hud.css
public/textures/*.jpg     # 2k body textures + milky way + saturn ring alpha
```

## Architecture invariants

- **Units.** Body positions stored in **km** (`posKm` parent-relative, `worldPosKm` heliocentric). Scene units = **millions of km (Mkm)**. Always go through `Scaling.scalePosition` / `scaleRadius` — never hardcode unit conversions.
- **Frame of reference.** Three.js Y-up. Ecliptic plane = XZ. `OrbitMath.bodyPosition` writes `(X, Z, -Y)` from the orbital-plane math — don't change without updating orbit-line sampling too.
- **Topological build order.** `SolarSystem` constructor builds bodies parents-first so `parentBody` is always set. New body kinds must respect this.
- **Per-frame loop** (in `main.ts:frame`): `state.tickSim` → `system.updateAll` (positions) → `system.rotateAll` → `missionLayer.update` → mission camera-target guard → `rig.update` → telemetry derive → `trailsLayer.tick` → `hud.tick` → `labels.tick` → `featureLabels.tick` → `renderer.render`. Order matters; don't reorder casually.
- **Reactivity.** `SimState.emit()` fires after any setter. HUD has two update channels:
  - `tick(dtSec)` — every frame, for fast-changing values (clocks, sparklines, minimap).
  - `syncReactive()` — only on state change (focus, toggles, speed, etc.).
  Telemetry rows that change every frame go in `tick`; row labels that change with focus go in `syncReactive`.
- **Globals on `window`.** `__rig`, `__overview`, and `__takeMeToFeature` are set in `main.ts` so HUD actions can drive camera/focus without prop-drilling. Avoid adding more; prefer extending `SimState` when state needs to be shared.
- **Picker has dual purpose.** Click a non-focused body → focus it. Click the *currently focused* body → try `featureAtHit` (lat/lon vs FEATURES). Background click → `setActiveFeature(null)` if a feature card is open, else `onBackground` (overview).
- **Moon feature explorer.** Moon features are richer than generic POIs: `SurfaceFeature` includes `type`, optional `diameterKm`, `detail`, and `whyItMatters`. Selecting a feature sets `activeFeatureId`, `main.ts` calls `rig.focusFeature(...)`, and `CameraRig` surface-locks the orbit center to that lat/lon until the feature is cleared or normal body focus changes. The expanded card in `HUD.renderFeatureCard` shows type, coordinates, a CSS thumbnail diagram, details, and nearby Moon features computed in `nearbyFeatures()`. Keep this richer UI Moon-only unless intentionally broadening the explorer to other bodies.
- **Feature surface markers.** `FeatureLabels` (hud/FeatureLabels.ts) projects each feature's lat/lon to a 3D world-space point via `body.mesh.localToWorld`, then to screen coordinates each frame. Markers only appear for the currently focused body, are hidden behind the sphere (dot-product check), fade near the limb, and are suppressed during mission mode. Clicking a marker calls `state.setActiveFeature(name)`.
- **Surface coordinate system.** Three.js `SphereGeometry` places the equirectangular texture center (lon 0°) at the **−Z** direction. The correct geographic lon from a local-space hit point is `atan2(local.x, -local.z)` — NOT `atan2(local.z, local.x)`. The inverse (lat/lon → local unit vector) is `x = cos(lat)·sin(lon), y = sin(lat), z = −cos(lat)·cos(lon)`. All conversions are centralised in `scene/SurfaceCoordinates.ts` — use those helpers in `Picker.featureAtHit` and `FeatureLabels` so feature dots align with the actual texture geography.
- **Feature-active HUD mode.** When `state.activeFeatureId` is set (and no mission is active), `HUD.syncReactive` adds `feature-active` to `#hud`. This CSS class: hides the left rail (desktop), moves the feature card into the left-rail slot (desktop: `left: 16px; top: 56px; width: 280px`), and hides the mobile status card. On mobile the feature card uses its bottom-sheet position (the `@media` rule wins with `!important`). Dismiss via close button (×), background click (Picker), or ESC (which now closes the feature card first before falling through to overview).
- **Playback bar auto-hide.** The desktop bottom playback bar is `opacity: 0` at rest and fades to `opacity: 1` on `:hover` / `:focus-within`. It retains `pointer-events: auto` so the hover zone always works. Do not add a persistent visibility state — the hover reveal is the intentional design.
- **Mission mode is annotation-first.** Mission data may reference a `featureId` for marker placement, but mission steps must not set `activeFeatureId` or open feature/info cards. `HUD.renderFeatureCard` returns early during missions, and `Picker` does not feature-pick while `state.mission.activeId` is set. Keep this separation for future missions and future body feature explorers.
- **Mission camera target.** During mission mode, the camera locks to `MissionLayer.cameraTarget` (the spacecraft marker), not Earth/Moon. `main.ts` reasserts that object target each frame while a mission is active so normal focus/feature actions do not steal the camera. `focusedId` still updates to the relevant body for HUD telemetry/context. `CameraRig.focusObject` can tween yaw/pitch/distance; use that for stage transitions instead of assigning `rig.yaw` / `rig.pitch` directly.
- **Mission path continuity.** Mission paths must be continuous across adjacent steps. For Apollo 11, `MissionLayer` models connected segments: launch/ascent → Earth parking orbit → translunar injection/coast → lunar orbit → descent/surface/ascent → return → splashdown. When `markerStartT`/`markerT` cross a step boundary, the previous step's endpoint should equal the next step's start point so Play Tour never teleports the marker.
- **Mission playback.** `SimState.mission` tracks `activeId`, `stepIndex`, `stepProgress`, and `playing`. `HUD.tick()` advances `stepProgress` using each `MissionStep.durationSec`; when a step reaches 1, it advances to the next step. `MissionLayer` interpolates marker position from `markerStartT` to `markerT`, so Play Tour should move the spacecraft along a route, not just jump chapter cards.
- **Mission HUD cleanup.** While a mission is active, regular solar-system orbit lines are suppressed even if the user's `showOrbits` toggle remains on; restore the user's toggle-driven visibility after the mission exits. Desktop also hides the left rail, and mobile hides the floating status card while keeping the bottom dock and Mission sheet usable.
- **Default entry.** App opens focused on Earth (`main.ts` focuses the camera; `SimState` initializes `focusedId = "earth"`). `goOverview()` still returns to the Sun overview.
- **Responsive HUD.** Desktop uses topbar + left/right rails + bottom playback (auto-hidden, hover to reveal). At `<= 820px`, CSS hides those rails and uses the mobile status card, bottom dock, and Info/Bodies/Controls sheets built in `HUD.buildMobileHUD`. Both the left rail and right rail are scrollable (`overflow-y: auto`, `max-height: calc(100vh - 56px - 130px)`) so expanded content does not overflow the viewport.
- **Current Focus expansion.** The "CURRENT FOCUS" panel on the desktop left rail and in the mobile Info sheet each have a "Show more / Show less" button. Clicking it toggles `leftRailExpanded` (desktop) or `mobileInfoExpanded` (mobile) and calls `HUD.syncExpansion()`. Expansion resets when `focusedId` changes (detected in `syncReactive` via `prevFocusedId`). The expanded content is rendered from `BodyData.longDescription` by `HUD.renderLongDesc()` into `.event-body-long` divs.

## Adding things

- **New body:** append to `BODIES` in [src/data/bodies.ts](src/data/bodies.ts) with full orbital elements + physical data. `BodyData` requires both `description` (one-sentence summary shown in the status card and collapsed focus panel) and `longDescription` (a `string[]` of ~3 paragraphs revealed by the "Show more" button). If textured, add to `BODY_TEXTURE` in [src/scene/Textures.ts](src/scene/Textures.ts) and drop the file in `public/textures/`. The body list, minimap, picker, and labels pick it up automatically.
- **New surface feature:** append to `FEATURES` in [src/data/features.ts](src/data/features.ts) — `lat/lon/radiusDeg` are tested via great-circle distance in `Picker.featureAtHit`. For Moon features, also set a meaningful `type` (`crater`, `volcano`, `basin`, `landing site`, or `canyon`) plus `diameterKm`, `detail`, and `whyItMatters` when available so the expanded explorer card stays useful.
- **New mission:** append to `MISSIONS` in [src/data/missions.ts](src/data/missions.ts). Each `MissionStep` needs `timestampUtc`, `focusId`, `cameraMode`, `pathMode`, `markerStartT`, `markerT`, `durationSec`, `tag`, `detail`, and `keyFact`. Use `featureId` only as a spatial reference for the mission marker; do not treat it as selected explorer content. Before adding a new mission, define the full connected route in `MissionLayer` or a dedicated mission path helper, then make each step reference a segment window over that route.
- **New toggle:** add a key to `SimToggles` in [src/state/SimState.ts:3](src/state/SimState.ts#L3), default it in the constructor, render a checkbox in `HUD.buildPlayback`, and react to it in the `state.subscribe` block in [src/main.ts:55](src/main.ts#L55) (compare against a `prev*` cache to avoid rebuilds on unrelated changes).
- **New HUD panel:** add a builder in `HUD` (returns an HTMLElement), append in `build()`, wire reads in `tick`/`syncReactive`. Use the `panel`/`panelHeader`/`row`/`btn` helpers at the bottom of [src/hud/HUD.ts](src/hud/HUD.ts). If the panel matters on phones, add or reuse a mobile sheet view too.
- **New scaling mode:** extend `ScaleConfig`, branch in `scalePosition`/`scaleRadius`. Anything dependent on scale must be rebuilt — see `applyScale` + `rebuildOrbitLines` in `SolarSystem`, called from `main.ts` when `trueScale` flips.

## Gotchas

- **Orbit lines** for heliocentric bodies live on `system.orbitLines`; moon orbit lines live as children of their parent body's `group` so they inherit the parent transform. `setOrbitsVisible` toggles both.
- **Retrograde rotation** is encoded as negative `rotationPeriodHours` (Venus, Uranus, Pluto).
- **Sun click = overview**, not focus on the Sun mesh — see `CameraRig.idealDistance` and `goOverview` in `main.ts`.
- **Texture loader caches by path** — safe to call `loadTexture` repeatedly.
- **`tickSim` does not emit** — it mutates `simEpochMs` every frame. HUD polls it in `tick()`. If you make `simEpochMs` reactive, you'll thrash listeners.
- **Speed range** is hardcoded in `HUD.SPEEDS` (1× → 10M×). Default is 1k× in `SimState`.
- **Mobile status card** shows focused body, UTC time, and the short `description`. Tapping it always opens (never toggles closed) the Info sheet and auto-sets `mobileInfoExpanded = true` so the long description is immediately visible. The short description in the status card is clamped to 2 lines in CSS (`-webkit-line-clamp: 2`) — keep it that way to avoid crowding the scene.
- **Timeline scrubber** maps 0..1 to a fixed 5-year window from `simStartMs` (`setSimEpochFromFraction`).
- **Mission clock restore.** Starting a mission stores the previous sim clock/playing state; exiting restores it. Mission camera application also sets the sim clock to the mission launch epoch + step timestamp, so avoid adding reactive per-frame time emits here.
- **Mission panel UX.** Desktop Mission Mode lives in a collapsible right-rail panel opened by the topbar `MISSIONS` button. Keep it collapsed by default so the body list remains usable for normal focus changes.
- **Mission launch visibility.** The initial mission camera should be placed from the spacecraft's outward vector relative to Earth/Moon so the focused marker is not hidden behind the body it just launched from. The Apollo 11 initial entry snaps to that safe view; later stage transitions tween smoothly.
- **True scale and missions.** Mission mode forces `trueScale` off. The mission overlay is a cinematic teaching layer; do not add a true-distance mission variant unless the UI explicitly supports that mode.
- **ESC key priority.** In `main.ts`, ESC first closes the feature card (`state.setActiveFeature(null)`) if one is open; only if no feature card is open does it call `goOverview()`. HUD's own ESC listener handles mobile panel dismissal (fires first, stops propagation).
- **TypeScript strict** is on but `noUnusedLocals`/`noUnusedParameters` are off. `tsc --noEmit` runs as part of `build`.

## Conventions

- No comments unless the *why* is non-obvious. Identifiers are descriptive.
- DOM helpers (`row`, `panel`, `btn`) in HUD.ts — reuse them, don't inline.
- Vector math: prefer mutating `out` params (see `bodyPosition`, `scalePosition`) — avoid allocating per frame.
- One file per class. Scene-graph code in `scene/`, UI in `hud/`, data tables in `data/`.
