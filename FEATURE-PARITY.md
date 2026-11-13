# FEATURE PARITY — A-to-Z Checklist

Source of truth: `docs/A-TO-Z-REPORT.md` (verified inventory of the reference site, v84.2.5).
Build phases: `docs/BUILD-PLAN.md` (Phase 0–10).
**Standing rule (user): A-to-Z nothing may be omitted.** Every report item below is mapped to a phase.
Status key: `Planned` = assigned to a future phase · `In progress` = phase currently being built · `Done` = code written in this repo · `Verified` = code written AND checked running in a browser.
**Live + verified 2026-11-13:** the app is deployed at https://tubetrendsofficials.github.io/cartoon-studio/ and a real-browser pass there verified the live dashboard (incl. the seeded Sample project), project create/open/rename and IndexedDB persistence across reload, character/background/prop adds with real artwork rendering, Play/playhead advance, one AI Animate preset application, the export dialog options, and a complete 720p WebM export (download produced). Rows that pass directly proves are marked `Verified` below; everything else keeps its previous status. (The same pass found the 15 s default-clip flaw fixed in v0.10.2.)

Notes on equivalence:
- All code and assets in this repo are **original** — feature/function equivalence only, never the reference site's code, images, characters or text.
- Where the reference "character" is a pre-existing third-party cartoon figure, our equivalent is an **original character of the same type/role**, not a copy of that figure.
- Our version is **fully free**: every reference "Pro gate" is listed as *built as a free feature* in its assigned phase.
- Counts: the report names 33 characters individually (all listed). For backgrounds it gives a total of 21 (19 single + 2 combo packs) without individual names, and for the Asset Library a total of 49 with only examples named — those are tracked below as numbered slots (BG-01…BG-21, AS-01…AS-49) so the totals are never lost; slot descriptions use only the types/examples the report actually observed.

## 1. Site structure, dashboard & profile

| # | Item (from A-to-Z report) | Phase | Status |
|---|---|---|---|
| 1.1 | Single-page app shell — all routes serve the same app (no separate Pricing/Privacy/Terms/Blog pages) | 0 | Done |
| 1.2 | Offline-first behaviour (works without network after first load) | 0 | Done |
| 1.3 | PWA manifest (standalone display, theme #101a30, 192/512 + maskable icons) | 0 | Done |
| 1.4 | Service worker precaching the app shell | 0 | Done |
| 1.5 | App header with logo + app name | 1 | Verified |
| 1.6 | Logout icon (reference) → local equivalent: local profile menu (no account system in local version) | 1 | Planned |
| 1.7 | Profile cover image area (original artwork of ours, not the reference painting) | 1 | Planned |
| 1.8 | Profile avatar (local initial avatar) | 1 | Verified |
| 1.9 | Profile display name — generic local user "Local Creator" (no fake personal data) | 1 | Verified |
| 1.10 | Profile email line → not applicable locally; replaced by honest "Local mode — no account" note | 1 | Verified |
| 1.11 | FREE USER / FREE PLAN badges (ours: "FREE — all features unlocked") | 1 | Verified |
| 1.12 | Joined date → local equivalent: first-run date stored locally, shown only if present | 1 | Planned |
| 1.13 | User code → local equivalent: locally generated device/user id shown in profile | 10 | Planned |
| 1.14 | Storage Used meter (reference showed an account %) → computed from `navigator.storage.estimate()`, honest "unknown" fallback | 1 | Verified |
| 1.15 | "My Files" tab on dashboard | 1 | Planned |
| 1.16 | "Created By" tab on dashboard | 1 | Planned |
| 1.17 | Projects list on dashboard | 1 | Verified |
| 1.18 | Project search box | 1 | Done |
| 1.19 | "New Project" button | 1 | Done |
| 1.20 | Project file-format note (reference: .gta) → ours: `.cartoon.json` format note | 1 | Verified |
| 1.21 | Shared-projects section ("shared with you") → needs cloud/sharing; local placeholder text, full feature with optional Firebase sync | 10 | Planned |
| 1.22 | "Pay Now" button → **not built: our version is fully free, no payment at all** | — | Done |
| 1.23 | Social/contact links in profile (reference: their Facebook/YouTube/WhatsApp) → ours: user's own links, set in Phase 9 public release | 9 | Planned |
| 1.24 | Sister site "Cinema" (gotocinema.net streaming site) | 6 | Done — Phase 6B: Cinema panel is a link card opening https://gotocinema.net in a new tab; the streaming site itself is **out of scope** |
| 1.25 | Marketing/SEO landing text block (features, how-to guide, story templates list, FAQ, About) → our own original landing/README copy | 9 | Planned |
| 1.26 | Story template names in marketing block (Family / Village Comedy / Islamic / Motivational / Cartoon Comedy / Educational story types) → our own templates of the same types | 8 | Planned |
| 1.27 | No GitHub/GitLab link on reference site — informational only, nothing to build | — | Done |

## 2. Project creation & project cards

| # | Item | Phase | Status |
|---|---|---|---|
| 2.1 | New Project creates instantly — no creation dialog, no name/ratio/mode questions | 1 | Verified |
| 2.2 | Auto name "New Cartoon Project N" with incrementing N | 1 | Done |
| 2.3 | Default aspect 16:9 | 1 | Done |
| 2.4 | Default total duration 120 s (2:00 timeline) | 1 | Verified |
| 2.5 | One empty scene created by default | 1 | Done |
| 2.6 | Empty tracks list by default (0 Tracks) | 1 | Done |
| 2.7 | Project name editable in place in editor header | 1 | Done |
| 2.8 | "Auto-saved" badge / saved indicator in editor | 1 | Done |
| 2.9 | Manual Save Project button persists to IndexedDB | 1 | Done |
| 2.10 | Projects survive page reload (IndexedDB) | 1 | Verified |
| 2.11 | Card: project name | 1 | Verified |
| 2.12 | Card: "Ready to animate" state text | 1 | Verified |
| 2.13 | Card: EASY MODE label | 1 | Verified |
| 2.14 | Card: ACTIVE label | 1 | Verified |
| 2.15 | Card: track count | 1 | Verified |
| 2.16 | Card: updated time | 1 | Verified |
| 2.17 | Card button: Rename (prompt) | 1 | Verified |
| 2.18 | Card button: Open Project | 1 | Verified |
| 2.19 | Card button: Duplicate | 1 | Done |
| 2.20 | Card button: Delete (with confirm) | 1 | Done |
| 2.21 | Card button: Export project file (`.cartoon.json` download) | 1 | Done |
| 2.22 | Dashboard: Import project file (`.cartoon.json` read back in) | 1 | Done |
| 2.23 | First-run seeded Sample project, labelled "Sample" in name **and** with a visible Sample badge | 1 | Verified |
| 2.24 | Honest empty state "No projects yet" when list is empty | 1 | Done |
| 2.25 | Reference card note "Pro Subscription Required to Open Project" → **built as free feature: projects always open, no gate** | 1 | Verified |
| 2.26 | Aspect picker next to "New Project" (16:9 · 9:16 Shorts · 1:1) — ours only; creation stays instant, aspect is fixed at creation and shown as a card badge | 8 | Done — Phase 8 |

## 3. Editor frame, toolbars, canvas & timeline

| # | Item | Phase | Status |
|---|---|---|---|
| 3.1 | Minimal editor view (Phase-1 placeholder: editable name, 16:9 black stage area, Back, Save) | 1 | Done |
| 3.2 | Full editor header: sidebar toggle (hamburger) | 2 | Done |
| 3.3 | Editor header: logo | 2 | Done |
| 3.4 | Editor header: "Get Pro" button → **built as free feature: replaced by "All features free" badge, no upsell** | 2 | Done |
| 3.5 | Editor header: Export Video button (opens export dialog) | 7 | Verified — Phase 7: opens the real export dialog (quality + format + progress/cancel) |
| 3.6 | Editor header: user avatar menu | 2 | Done |
| 3.7 | Second toolbar: Duplicate (layer) | 2 | Done |
| 3.8 | Second toolbar: Split (clip at playhead) | 2 | Done |
| 3.9 | Second toolbar: Camera (add camera layer) | 2 / 4 | Done |
| 3.10 | Second toolbar: Voice (microphone record) | 5 | Done |
| 3.11 | Second toolbar: Jump to Start | 2 | Done |
| 3.12 | Second toolbar: Rewind 5s / Forward 5s | 2 | Done |
| 3.13 | Second toolbar: Play / Pause | 2 | Verified |
| 3.14 | Second toolbar: time readout 00:00 / total | 2 | Verified |
| 3.15 | Second toolbar: Hand Tool (pan canvas) | 2 | Done |
| 3.16 | Canvas zoom out / in (reference default 40%) | 2 | Done |
| 3.17 | "Dock Timeline to Top" toggle | 2 | Done |
| 3.18 | Undo (with toast) | 2 | Done |
| 3.19 | Redo (with toast) | 2 | Done |
| 3.20 | Toggle Layers visibility panel | 2 | Done |
| 3.21 | Scene selector ("Scene 1") | 2 / 4 | Done |
| 3.22 | Add Scene button (+ toast) | 2 / 4 | Done |
| 3.23 | Scene duration setting (not visible in reference; ours includes it) | 2 | Done |
| 3.24 | Scene transitions (not visible in reference; ours: Cut/Fade) | 4 | Done |
| 3.25 | Delete Selected Layer button | 2 | Done |
| 3.26 | Timeline zoom out / in | 2 | Done |
| 3.27 | Canvas: black 16:9 stage on dark dotted workspace | 2 | Done |
| 3.28 | Camera Framing toggle (keyframe + safe-area guide overlay) | 2 | Done |
| 3.29 | Camera layer (16:9, % scale) with pan/zoom keyframes (simple version) | 4 | Done |
| 3.30 | Timeline ruler 00:00 → total duration, end marker | 2 | Done |
| 3.31 | Playhead + playback resuming from playhead position | 2 | Done |
| 3.32 | Layer rows: Move Up / Move Down | 2 | Done |
| 3.33 | Layer rows: Hide toggle | 2 | Done |
| 3.34 | Layer rows: Lock toggle | 2 | Done |
| 3.35 | Layer rows: Remove Layer | 2 | Done |
| 3.36 | Layer rows: Layer Options menu | 2 | Done |
| 3.37 | Background track shown green in timeline | 2 | Done |
| 3.38 | Audio track shown purple with waveform | 5 | Done |
| 3.39 | Project total duration editable | 2 | Planned |
| 3.40 | Left panel rail with 12 panels (skeleton in editor core; contents in Phases 3–6) | 2 | Done |

## 4. Panel 1 — Character (library, poses, toolbar)

| # | Item | Phase | Status |
|---|---|---|---|
| 4.1 | Character panel with searchable character grid | 3 | Done |
| 4.2 | Click/drag a character to add it to canvas + timeline (click-to-add in ours) | 3 | Verified |
| 4.3 | Pose picker per character (each pose separate artwork state) | 3 | Done |
| 4.4 | Per-pose Edit button → opens Character Studio (ours: free) | 6 | Done — Phase 6B: "Edit in Character Studio" button in the character tools; custom characters load their params, library characters open a blank studio (library art is read-only — Save creates an editable copy) |
| 4.5 | "New Pose" / Bundle button (create a new pose in Studio) → **built as free feature** | 6 | Done — Phase 6B: the Studio's Save Character flow is the bundle action — every saved character is generated in the full 6-pose bundle at once; labelled as such in the Studio |
| 4.6 | Double-click character on canvas opens Character Studio → **built as free feature** | 6 | Done — Phase 6B: double-clicking a character layer selects it and opens the Studio drawer (custom → params loaded; library → blank studio with read-only note) |
| 4.7 | Mouth/face modes under canvas: Idle (in ours: in the selected-character tools block) | 3 | Done |
| 4.8 | Mouth/face modes: Talk — timed mouth flap at ~6 Hz while playing (Talk/Stand poses), Talk pose held when paused (audio-driven lip-sync is 4.10, Phase 5) | 3 / 4 | Done |
| 4.9 | Mouth/face modes: Look Behind | 3 / 10 | Done — Phase 10A: Look Behind now switches to the REAL Back pose artwork for every character that has one (all 30 library people + Character-Studio custom characters); the vehicle/animal entries (bus, mishuk, puppy, parrot) have no Back pose and keep the Phase-3 flip fallback, labelled "· Look Behind" on canvas only in that fallback case |
| 4.10 | Automated audio lip-sync (NOT found in reference) → our extra, simple amplitude-driven Talk | 5 | Done — Phase 10B (our extra): AudioEngine gained an AnalyserNode on the master bus + smoothed-RMS `getLevel()`; in Talk mode with lipSync 'auto' (default) the mouth pose follows the live level while an audio clip is sounding at the playhead — `mouthPoseForLevel` in js/anim.js (threshold 0.08, 90 ms anti-flicker hold, unit-tested) — and falls back to the timed 6 Hz flap when no audio sounds or 'timed' is chosen in the mouth block; the same evaluation runs during export, so lip-sync bakes into exported videos |
| 4.11 | Selected-character toolbar: Flip | 3 | Done |
| 4.12 | Selected-character toolbar: Path (motion path, draggable destination ghost) | 4 | Done |
| 4.13 | Selected-character toolbar: Speed presets 0.5x / 1x / 1.5x / 2x | 4 | Done |
| 4.14 | Selected-character toolbar: Speed slider 0.25x–3x | 4 | Done |
| 4.15 | AI Animate preset: Gentle Float | 4 | Done |
| 4.16 | AI Animate preset: Bounce Hop | 4 | Done |
| 4.17 | AI Animate preset: Breathing | 4 | Done |
| 4.18 | AI Animate preset: Wave Hello | 4 | Done |
| 4.19 | AI Animate preset: Walk Step | 4 | Done |
| 4.20 | AI Animate preset: Surprise Shake | 4 | Done |
| 4.21 | Mask: None | 3 | Done — Phase 6B: Mask select in the Adjust block (None / Rectangle / Rounded / Squircle / Circle / Star / Heart); renderer clips the layer box |
| 4.22 | Mask: Circle | 3 | Done — Phase 6B |
| 4.23 | Mask: Rounded | 3 | Done — Phase 6B |
| 4.24 | Mask: Squircle | 3 | Done — Phase 6B (high-radius rounded-rect approximation) |
| 4.25 | Mask: Star | 3 | Done — Phase 6B (star-polygon clip path) |
| 4.26 | Mask: Heart | 3 | Done — Phase 6B (bézier heart clip path) |
| 4.27 | Adjust: Brightness slider | 3 | Done — Phase 6B: 50–150%, applied via ctx.filter in the renderer (sample/asset/image/video/sprite layers) |
| 4.28 | Adjust: Contrast slider | 3 | Done — Phase 6B: 50–150% |
| 4.29 | Adjust: Saturation slider | 3 | Done — Phase 6B: 0–200% |
| 4.30 | Adjust: Opacity slider | 3 | Done — Phase 6B: 0–100%, drives layer.opacity (globalAlpha) |
| 4.31 | Adjust: Reset / mood presets | 3 | Done — Phase 6B: Reset button + mood presets Warm / Cool / Vintage / Mono (one-click brightness/contrast/saturation combos) |
| 4.32 | Props on character: Cool Sunglasses | 3 | Done — Phase 6B: wearable overlay (original SVG), toggled from the Props chip row, stored as layer.wearables, anchored to the head by box fraction, flips with the layer; works on library + custom characters |
| 4.33 | Props on character: Baseball Cap | 3 | Done — Phase 6B (same wearable system) |
| 4.34 | Props on character: Golden Crown | 3 | Done — Phase 6B (same wearable system) |
| 4.35 | Props on character: Headphones | 3 | Done — Phase 6B (same wearable system) |
| 4.36 | Props on character: Party Hat | 3 | Done — Phase 6B (same wearable system) |
| 4.37 | Props on character: Magic Wand | 3 | Done — Phase 6B (same wearable system; anchored at the hand area) |
| 4.38 | Sort/layer order: Bring to Front | 3 | Done — Phase 6B: ⤒ button in the track row |
| 4.39 | Sort/layer order: Bring Forward | 3 | Done — track-row ↑ button (delivered with the Phase 2 timeline) |
| 4.40 | Sort/layer order: Send Backward | 3 | Done — track-row ↓ button (delivered with the Phase 2 timeline) |
| 4.41 | Sort/layer order: Send to Back | 3 | Done — Phase 6B: ⤓ button in the track row |
| 4.42 | Selected-character toolbar: Delete | 3 | Done — Phase 6B: Delete Layer button inside the character tools block too (toolbar2 Delete Layer already existed) |
| 4.43 | "Protected" default characters (cannot be deleted from library) → ours: built-in library is read-only, user copies are editable | 3 | Done |

### 4A. Characters — all 33 (original equivalents of the same types/roles)

First 12 core characters delivered in Phase 3; **full set of 33 completed in Phase 10A**. Each person character has 7 poses: Stand, Walk, Talk, Sit, Wave, Point, Back (true back artwork added in Phase 10A — see 4A.36). The bus / puppy / parrot entries carry their own variant poses. Note on 4A.31 (Auto Rickshaw): the reference counts it among the 33; our mapping — set in Phase 3 and kept — covers that row with **Kashem**, the rickshaw puller (person), plus the Rickshaw vehicle as Asset AS-21, which is how the total stayed exactly 33. **Phase 10B update: the Auto Rickshaw VEHICLE is now also a character entry in its own right — "Mishuk (Auto Rickshaw)" (see 4A.39) — so the library total is 33 reference roles covered + 1 extra (Mishuk) = 34 characters.** **Roster mirror (Phase 10C, v0.10.3):** the manifest — and therefore the Character drawer, which renders in manifest order — now lists the characters in exactly this §4A row order (the reference panel order 1..33, Mishuk last), and the two mode-default templates carry the panel's functional labels ("Advance Mode Default" / "Easy Mode Default") with the same generic outfit archetypes (light-blue shirt + dark trousers; teal panjabi + blue lungi + gamchha). An outfit audit in the same pass set Burima to a pale/white sari, the Amena Begum counterpart (Salma Ma) to a red sari, the maharaja (Raja Bijoy) to a crown, and the Motu-role counterpart (Golam Mota) to a checkered shirt. Only the order, the functional labels and the generic outfit archetypes mirror the reference — every drawing remains our own original parametric artwork (character ids unchanged, so existing projects keep resolving).

| # | Reference character (type) | Our original equivalent | Phase | Status |
|---|---|---|---|---|
| 4A.1 | Advance Mode Default | Done — our template (id 'rafi-hero', id unchanged): **Advance Mode Default** — young man, light-blue button shirt + dark trousers (Phase 10C roster mirror: panel label + generic outfit archetype; our own parametric drawing) | 10C | Done |
| 4A.2 | Easy Mode Default | Done — our template (id 'esha', id unchanged): **Easy Mode Default** — young MAN in teal panjabi + blue lungi + orange gamchha (Phase 10C roster mirror: the reference's easy default is male; the persona is a mode template, so the identity change is acceptable; our own parametric drawing) | 10C | Done |
| 4A.3 | Character 20 (Free) | Done — our original: **Jolil Chacha**, the farmer (role-equivalent) | 3 | Done |
| 4A.4 | Kona (Pro) → free in ours | Done — our original: **Rina**, young village girl (role-equivalent) | 10 | Done — built as free feature |
| 4A.5 | Nasir Uddin | Done — our original: **Nasir Kaka**, elderly village storyteller (role-equivalent) | 10 | Done |
| 4A.6 | Chutki | Done — our original: **Mitu** (role-equivalent) | 3 | Done |
| 4A.7 | Moharaj Krishno Chandra | Done — our original: **Raja Bijoy**, king / maharaja in a golden turban (role-equivalent) | 10 | Done |
| 4A.8 | Dadu Vai | Done — our original: **Karim Dadu** (role-equivalent) | 3 | Done |
| 4A.9 | Kodom Bepari | Done — our original: **Sattar Mia**, the shopkeeper (role-equivalent) | 3 | Done |
| 4A.10 | Bangladeshi Police | Done — our original: **Constable Rofiq** (role-equivalent) | 3 | Done |
| 4A.11 | Pocha | Done — our original: **Boltu**, village kid with cap (role-equivalent) | 3 | Done |
| 4A.12 | Chota Bheem (third-party figure) | Done — our original: **Bablu**, strong village kid (same role, not that figure) | 10 | Done |
| 4A.13 | Motu (third-party figure) | Done — our original: **Golam Mota**, plump comic man (same role, not that figure) | 10 | Done |
| 4A.14 | Baten | Done — our original: **Nader Majhi**, the boatman (role-equivalent) | 3 | Done |
| 4A.15 | Molla Nasir Uddin | Done — our original: **Imam Hafiz**, cleric / molla (role-equivalent) | 10 | Done |
| 4A.16 | Amena Begum | Done — our original: **Salma Ma**, mother in sari (role-equivalent) | 3 | Done |
| 4A.17 | Burima | Done — our original: **Rokeya Burima** (role-equivalent) | 3 | Done |
| 4A.18 | Munsi Kaka (Free) | Done — our original: **Harun Sir**, the school teacher (role-equivalent) | 3 | Done |
| 4A.19 | Hamid Front Part | Done — our original: **Hamid**, front-facing young man (role-equivalent) | 10 | Done |
| 4A.20 | Tahiya | Done — our original: **Tahiya**, young woman in sari (role-equivalent) | 10 | Done |
| 4A.21 | Gopal Ginni | Done — our original: **Ginni Bou**, comic housewife (role-equivalent) | 10 | Done |
| 4A.22 | Mizan Mia | Done — our original: **Mizan Mia**, middle-aged village man (role-equivalent) | 10 | Done |
| 4A.23 | Lal Chand | Done — our original: **Lal Chand**, man in red panjabi (role-equivalent) | 10 | Done |
| 4A.24 | Camili | Done — our original: **Camili**, woman in violet sari (role-equivalent) | 10 | Done |
| 4A.25 | Nurjahan | Done — our original: **Nurjahan**, woman in traditional dress (role-equivalent) | 10 | Done |
| 4A.26 | Raju | Done — our original: **Arif** (role-equivalent) | 3 | Done |
| 4A.27 | Meena (third-party figure type) | Done — our original: **Priya**, schoolgirl (same role, not that figure) | 10 | Done |
| 4A.28 | Sultan (Free) | Done — our original: **Sultan Ashraf**, sultan / royal ruler (role-equivalent) | 10 | Done |
| 4A.29 | Gopal | Done — our original: **Gopal**, comic folk-tale man (role-equivalent) | 10 | Done |
| 4A.30 | Local Bus (Free) | Done — our original: **Village Bus**, side-view vehicle "character" (poses: Still / Wheels Turned / With Driver / Door Open) | 10 | Done |
| 4A.31 | Auto Rickshaw 2 (Free) | Done — our original: **Kashem**, the rickshaw puller (the person; the rickshaw vehicle itself is an Asset Library prop — and since Phase 10B also a character entry of its own, **Mishuk**, see 4A.39) | 3 | Done |
| 4A.32 | Puppy Walking (Free) | Done — our original: **Bhulu Puppy**, 4-legged puppy (poses: Stand / Walk / Run / Sit) | 10 | Done |
| 4A.33 | Parrot Flying (Free) | Done — our original: **Tiya Parrot** (poses: Perched / Wings Up / Flying) | 10 | Done |
| 4A.34 | Pose set per character: Default (Idle) — our Stand pose | 3 | Done |
| 4A.35 | Pose: Sitting (multiple variants in reference, e.g. Sitting / Sitting 2 / Sitting 3) — v1 Sit pose done for all 12; extra variants Phase 10 | 3 (v1) + 10 (variants) | Done |
| 4A.36 | Pose: Back Part (back view) | 10 | Done — Phase 10A: TRUE back artwork (back of head/hair, back of clothing, arms at sides, no face) as a 7th pose for all 30 people in the Python factory AND in js/charbuilder.js, so custom characters have it too |
| 4A.37 | Pose: Walking (Pro pose in reference) → **built as free feature** — our Walk pose, free for all 12 | 3 | Done — built as free feature |
| 4A.38 | Premium/Pro characters and poses in general → **all built as free features** | 10 | Done — built as free feature: all 33 characters and every pose (incl. Back) are free (Phase 10A) |
| 4A.39 | Auto Rickshaw as a VEHICLE character entry (the vehicle half of reference 4A.31) | Done — Phase 10B EXTRA (beyond the reference's 33): our original **Mishuk (Auto Rickshaw)** — side-view three-wheeler from the factory specials (like Village Bus), poses Still / Wheels Turned / With Driver / Door Open. Library total is now **34 characters: the 33 reference roles all covered + this 1 extra** | 10 | Done |


## 5. Panel 2 — Media (backgrounds + audio library)

| # | Item | Phase | Status |
|---|---|---|---|
| 5.1 | Media panel with Backgrounds and Audio sections (backgrounds grid + voice recording + local audio library) | 3 / 5 | Done |
| 5.2 | Background thumbnail grid (village / street / shop-interior scene types) | 3 | Verified |
| 5.3 | Adding a background creates a background (green) timeline track | 3 | Verified |
| 5.4 | Background layer: Full Screen toggle | 3 | Planned |
| 5.5 | Background layer: Chroma option | 6 | Planned |
| 5.6 | "Upload Single Background" (own image) | 3 | Planned |
| 5.7 | "Reload from Firebase" (reference) → ours: reload built-in library from app assets; cloud reload if Firebase added | 10 | Planned |
| 5.8 | Combo Pack backgrounds with "+Add" (whole scene sets) | 10 | Done — Phase 10A: BG-20/BG-21 ship as combo-pack entries; the Media drawer lists the pack plus a chip per scene variant, and either variant can be set as the scene background (see 5A.20/5A.21) |
| 5.9 | Media Audio library list (pre-made audio files with durations) → ours: local media library list — recordings, uploads & generated SFX with durations, kind badges, preview / add / delete | 5 | Done |
| 5.10 | Upload Audio (reference: to Cloudinary) → ours: to IndexedDB locally; Cloudinary only if user later adds it | 5 | Done |
| 5.11 | "Generate Audio" (voice input / AI generate — seen inconsistently in reference) → ours: TTS-generate in Phase 8, AI-generate optional Phase 10 | 8 / 10 | Planned |

### 5A. Backgrounds — all 21 slots (19 single + 2 combo packs)

Core 10 in Phase 3, **remaining 11 in Phase 10A — all 21 slots delivered**. All original SVG scenes drawn by us.

| # | Slot | Type (from report's observed types) | Phase | Status |
|---|---|---|---|---|
| 5A.1 | BG-01 | Village scene — green-painted village building exterior — Done — our original: **Pond Side (village home beside a pond)** | 3 | Done |
| 5A.2 | BG-02 | Shop interior — village shop (blue-toned) — Done — our original: **Tea Stall (village shop scene)** | 3 | Done |
| 5A.3 | BG-03 | Village road — Done — our original: **Village Road** | 3 | Done |
| 5A.4 | BG-04 | House courtyard (uthan) — Done — our original: **Home Courtyard** | 3 | Done |
| 5A.5 | BG-05 | Room interior — Done — our original: **Inside Home Room** | 3 | Done |
| 5A.6 | BG-06 | River bank — Done — our original: **Riverbank & Boat** | 3 | Done |
| 5A.7 | BG-07 | Paddy field — Done — our original: **Paddy Field** | 3 | Done |
| 5A.8 | BG-08 | Village market / bazaar — Done — our original: **Market Bazaar** | 3 | Done |
| 5A.9 | BG-09 | City street — Done — our original: **City Street Corner** | 3 | Done |
| 5A.10 | BG-10 | School / classroom exterior-interior type — Done — our original: **School Yard** | 3 | Done |
| 5A.11 | BG-11 | Single background slot 11 (village scene variant) — Done — our original: **Village Bamboo Lane** | 10 | Done |
| 5A.12 | BG-12 | Single background slot 12 (street scene variant) — Done — our original: **Town Street & Shops** | 10 | Done |
| 5A.13 | BG-13 | Single background slot 13 (shop variant) — Done — our original: **Grocery Shop Interior** | 10 | Done |
| 5A.14 | BG-14 | Single background slot 14 (interior variant) — Done — our original: **Classroom Interior** | 10 | Done |
| 5A.15 | BG-15 | Single background slot 15 (nature / field variant) — Done — our original: **Meadow & Hills** | 10 | Done |
| 5A.16 | BG-16 | Single background slot 16 (river / water variant) — Done — our original: **River Ferry Ghat** | 10 | Done |
| 5A.17 | BG-17 | Single background slot 17 (night scene variant) — Done — our original: **Village Night** | 10 | Done |
| 5A.18 | BG-18 | Single background slot 18 (rainy / seasonal variant) — Done — our original: **Rainy Monsoon Day** | 10 | Done |
| 5A.19 | BG-19 | Single background slot 19 (festival / special variant) — Done — our original: **Festival Fair (Mela)** | 10 | Done |
| 5A.20 | BG-20 | Combo Pack 1 (matched multi-background scene set) — Done — our original: **Village Combo Pack** — ONE manifest entry carrying 2 scene variants (Village Morning / Village Evening); the Media drawer shows both variant chips and either can be set as the scene background (layer pins the chosen variant file) | 10 | Done |
| 5A.21 | BG-21 | Combo Pack 2 (matched multi-background scene set) — Done — our original: **River Combo Pack** — ONE manifest entry carrying 2 scene variants (River at Noon / River at Sunset); both variants addable from the Media drawer like BG-20 | 10 | Done |

## 6. Panel 3 — Local (offline uploads)

| # | Item | Phase | Status |
|---|---|---|---|
| 6.1 | Local panel: "stored only on this device" offline storage | 6 | Done — Phase 6A: gallery states it plainly; media lives in IndexedDB on this device only |
| 6.2 | Upload images | 6 | Done — Phase 6A: image uploads → image layers (natural aspect, ~40% stage height) |
| 6.3 | Upload videos | 6 | Done — Phase 6A: video uploads → video layers synced to the playhead (loops inside the clip when shorter) |
| 6.4 | Upload audio | 6 | Done — Phase 6A: audio files route into the Phase-5 audio library flow |
| 6.5 | Upload GIFs | 6 | Done — Phase 6A: GIF uploads → image layers (animated frames show in Chrome/Firefox; a static first frame may show in some browsers) |
| 6.6 | Upload sprite sheets | 6 | Done — Phase 6A: sheet upload lives in the Sprite Sheet Studio (slicing lives there); plain sheets in Local stay images until sliced |
| 6.7 | Filters: All / Images / Videos / Audios / GIFs / Sprite Sheets | 6 | Done — Phase 6A: filter chips in the Local gallery |
| 6.8 | "All uploads saved offline automatically" behaviour (IndexedDB persistence) | 6 | Done — Phase 6A: every upload is stored immediately in the media store |
| 6.9 | Panel skeleton entry in editor rail | 2 | Done |

## 7. Panel 4 — Effect (Natural River & Rain Studio)

| # | Item | Phase | Status |
|---|---|---|---|
| 7.1 | Effect panel opens a full-screen studio overlay | 6 | Planned |
| 7.2 | River & Water Flow tool | 6 | Done — Phase 6A simplified: a River effect LAYER (animated water band + drifting fish) instead of the reference's brush/lasso studio |
| 7.3 | River: Fish ON/OFF | 6 | Planned — fish always drift in our River layer; no toggle yet |
| 7.4 | River: Lotus | 6 | Planned |
| 7.5 | River: Small Ilish jumping | 6 | Planned |
| 7.6 | River: Big Ilish jumping | 6 | Planned |
| 7.7 | River: water height control (reference 120px) | 6 | Planned |
| 7.8 | River: brush size control | 6 | Planned |
| 7.9 | River: polygonal lasso | 6 | Planned |
| 7.10 | River: glass-brush erase | 6 | Planned |
| 7.11 | River: Flip / Edit / Preview | 6 | Planned |
| 7.12 | River: Send to timeline | 6 | Done — Phase 6A: "Add to Scene" adds the effect as a timeline layer |
| 7.13 | Natural Rain tool | 6 | Done — Phase 6A simplified: a Rain effect LAYER (deterministic streak particles), no brush painting |
| 7.14 | Rain: Light Drizzle | 6 | Done — Phase 6A: intensity 1 |
| 7.15 | Rain: Normal Rain | 6 | Done — Phase 6A: intensity 2 |
| 7.16 | Rain: Heavy Downpour | 6 | Done — Phase 6A: intensity 3 |
| 7.17 | Rain: Auto Lightning | 6 | Done — Phase 6A: Lightning toggle; deterministic double-blink flash per 6 s cycle |
| 7.18 | Rain: Instant Flash | 6 | Done — Phase 6A simplified: the flash is automatic inside the lightning cycle; no manual trigger button |
| 7.19 | Rain: ripple scale / depth controls | 6 | Planned |
| 7.20 | Rain: brush painting of rain area | 6 | Planned |
| 7.21 | Bird Flock tool: Draw Path | 6 | Done — Phase 10B: a selected Birds effect layer gets "Edit flock path" / "Clear" (Effect drawer + selected-layer tools): click the canvas to add up to 6 points (stage coords, stored as layer.fxPath), drag points to adjust, dashed polyline + numbered handles shown while selected — the same interaction pattern as motion paths. effects.js flies the flock along the polyline at uniform arc-length speed (looping, per-bird trailing offsets); with <2 points the Phase-6A sine sweep is used |
| 7.22 | Bird Flock: bird count control | 6 | Planned |
| 7.23 | Bird Flock: Cross-sky mode | 6 | Done — Phase 6A: the Birds effect is a cross-sky sine-path flock (count/size/speed follow intensity); Phase 10B adds the optional drawn flock path on top (see 7.21) — the sine sweep remains the default when no path is set |
| 7.24 | Bird Flock: Vibrant Mode | 6 | Planned |
| 7.25 | Bird Flock: size control | 6 | Planned |
| 7.26 | Bird Flock: speed control | 6 | Planned |
| 7.27 | Bird Flock: Flip | 6 | Planned |
| 7.28 | Bird Flock: Send to timeline | 6 | Done — Phase 6A: "Add to Scene" adds the effect as a timeline layer |
| 7.29 | Motion Animator (embedded tool): leaf motion on an uploaded image | 6 | Planned |
| 7.30 | Motion Animator: Branch Lock lines | 6 | Planned |
| 7.31 | Motion Animator: leaf spread control | 6 | Planned |
| 7.32 | Motion Animator: branch thickness control | 6 | Planned |
| 7.33 | Motion Animator: Sway Speed control | 6 | Planned |
| 7.34 | Motion Animator: Sway Amount control | 6 | Planned |
| 7.35 | Motion Animator: Rustle control | 6 | Planned |
| 7.36 | Motion Animator preset: Wind / Sway | 6 | Done — Phase 6A simplified: the Leaves effect's sway motion as a layer preset (not leaf motion painted onto an uploaded image) |
| 7.37 | Motion Animator preset: Leaves | 6 | Done — Phase 6A: Leaves effect layer (falling, swaying leaves) |
| 7.38 | Motion Animator preset: Cloud Flow | 6 | Done — Phase 6A: Clouds effect layer (slow drifting cloud blobs) |
| 7.39 | Motion Animator preset: Water Wave | 6 | Done — Phase 6A simplified: the River effect's animated wave band |
| 7.40 | Motion Animator preset: Sparkle | 6 | Done — Phase 6A: Sparkle effect layer (twinkling stars) |
| 7.41 | Motion Animator: Undo / Redo | 6 | Planned |
| 7.42 | Motion Animator: Compare (before/after) | 6 | Planned |
| 7.43 | Motion Animator: Guides toggle | 6 | Planned |
| 7.44 | Motion Animator: Reset | 6 | Planned |
| 7.45 | Motion Animator: Send to timeline | 6 | Done — Phase 6A: every effect's "Add to Scene" sends it to the timeline as a layer |

## 8. Panel 5 — Studio (Character Studio)

| # | Item | Phase | Status |
|---|---|---|---|
| 8.1 | Character Studio opens from Studio panel → **built as free feature (reference: Pro-gated)** | 6 | Done — Phase 6B: parametric Character Studio in the Studio panel, completely free (js/charbuilder.js) |
| 8.2 | Character rigging tools (bone/IK-style pose editing, simple version) | 6 | Done — Phase 6B simplified: parametric appearance + pose editing (full parameter set, 6 generated poses) — NOT bone/IK rigging; full rigging stays 8.3 / Phase 10 |
| 8.3 | Full rigging & IK access (reference Pro feature) → **free in ours, full version** | 10 | Done — Phase 10B, honestly scoped: the Character Studio **Pose Lab** — a basic joint-slider pose lab (Head tilt −20…20°, Left arm −120…30°, Right arm −30…120°, Leg spread 0…30°) applied as transforms over the stand rendering in js/charbuilder.js; "Save as Custom Pose" stores { id: 'customN', label, mods } on the character record, pose chips then offer the custom poses, and the renderer builds them with the saved mods. This is **basic joint-slider posing, NOT full bone IK** — full IK remains unbuilt and is not claimed |
| 8.4 | Create a new pose for an existing character | 6 | Planned |
| 8.5 | Edit an existing character's artwork (layers) | 6 | Planned |
| 8.6 | Save custom character / pose to library (local; reference saved via Firebase/Cloudinary) | 6 | Done — Phase 6B: custom characters saved locally in the IndexedDB media store (kind 'custom-character', params only), listed under My Characters in the Studio + Character panels |
| 8.7 | Panel skeleton entry in editor rail | 2 | Done |

## 9. Panel 6 — Asset Library (49 assets)

20 props delivered in Phase 3 (10 matched to the named slots AS-03/05/08/10/11/12/17/18/19/20 + 10 filling the generic slots AS-21…AS-30); **the remaining 29 delivered in Phase 10A — the full 49 are in the library**. All original SVG assets drawn by us; the "animated" slots (fire, walking cycle, pinwheel, sun, cloud) ship as static SVGs whose motion comes from editor presets/effects, as annotated on their rows. The report names only examples (fire GIFs, Walking Cycle, Tree GIFs, Pinwheel); the rest are tracked as numbered slots so the total of 49 is preserved.

| # | Slot | Item | Phase | Status |
|---|---|---|---|---|
| 9.1 | AS-01 | Fire flame (animated GIF-style asset) — Done — our original: **Fire Flame** (layered-flame SVG, presented static; motion via editor presets/effects) | 10 | Done |
| 9.2 | AS-02 | Walking Cycle (animated) — Done — our original: **Walking Cycle** (4-phase stride strip SVG) | 10 | Done |
| 9.3 | AS-03 | Tree (animated, swaying) — Done — our original: **Mango Tree** (static SVG in v1; sway animation later) | 3 | Done |
| 9.4 | AS-04 | Pinwheel (animated) — Done — our original: **Pinwheel** (static SVG) | 10 | Done |
| 9.5 | AS-05 | Banana tree — Done — our original: **Banana Tree** | 3 | Done |
| 9.6 | AS-06 | Table — Done — our original: **Wooden Table** | 10 | Done |
| 9.7 | AS-07 | Chair — Done — our original: **Wooden Chair** | 10 | Done |
| 9.8 | AS-08 | Tea cup / tea stall set — Done — our original: **Tea Cup Set** | 3 | Done |
| 9.9 | AS-09 | Basket — Done — our original: **Woven Basket** | 10 | Done |
| 9.10 | AS-10 | Lantern — Done — our original: **Lantern** | 3 | Done |
| 9.11 | AS-11 | Book — Done — our original: **Book Stack** | 3 | Done |
| 9.12 | AS-12 | Umbrella — Done — our original: **Umbrella** | 3 | Done |
| 9.13 | AS-13 | Sun (animated rays) — Done — our original: **Sun** (static SVG) | 10 | Done |
| 9.14 | AS-14 | Cloud (drifting) — Done — our original: **Cloud** (static SVG; drifting via the Clouds effect layer) | 10 | Done |
| 9.15 | AS-15 | Flower plant — Done — our original: **Flower Plant** | 10 | Done |
| 9.16 | AS-16 | Village hut element — Done — our original: **Village Hut** | 10 | Done |
| 9.17 | AS-17 | Fence element — Done — our original: **Fence** | 3 | Done |
| 9.18 | AS-18 | Boat — Done — our original: **Boat** | 3 | Done |
| 9.19 | AS-19 | Bicycle — Done — our original: **Bicycle** | 3 | Done |
| 9.20 | AS-20 | Water pot / kolshi — Done — our original: **Clay Pot (Kolshi)** | 3 | Done |
| 9.21 | AS-21 | Done — our original prop: **Rickshaw** | 3 | Done |
| 9.22 | AS-22 | Done — our original prop: **Palm Tree** | 3 | Done |
| 9.23 | AS-23 | Done — our original prop: **School Bag** | 3 | Done |
| 9.24 | AS-24 | Done — our original prop: **Fishing Net** | 3 | Done |
| 9.25 | AS-25 | Done — our original prop: **Plough** | 3 | Done |
| 9.26 | AS-26 | Done — our original prop: **Tube Well** | 3 | Done |
| 9.27 | AS-27 | Done — our original prop: **Hay Stack** | 3 | Done |
| 9.28 | AS-28 | Done — our original prop: **Radio** | 3 | Done |
| 9.29 | AS-29 | Done — our original prop: **Kite** | 3 | Done |
| 9.30 | AS-30 | Done — our original prop: **Dhol (Drum)** | 3 | Done |
| 9.31 | AS-31 | Done — our original prop: **Cow** | 10 | Done |
| 9.32 | AS-32 | Done — our original prop: **Goat** | 10 | Done |
| 9.33 | AS-33 | Done — our original prop: **Hen** | 10 | Done |
| 9.34 | AS-34 | Done — our original prop: **Duck** | 10 | Done |
| 9.35 | AS-35 | Done — our original prop: **Cat** | 10 | Done |
| 9.36 | AS-36 | Done — our original prop: **School Blackboard** | 10 | Done |
| 9.37 | AS-37 | Done — our original prop: **Wooden Almirah** | 10 | Done |
| 9.38 | AS-38 | Done — our original prop: **Wooden Bed (Chowki)** | 10 | Done |
| 9.39 | AS-39 | Done — our original prop: **Clay Oven (Chula)** | 10 | Done |
| 9.40 | AS-40 | Done — our original prop: **Hand Fan (Pakha)** | 10 | Done |
| 9.41 | AS-41 | Done — our original prop: **Broom (Jharu)** | 10 | Done |
| 9.42 | AS-42 | Done — our original prop: **Bucket (Balti)** | 10 | Done |
| 9.43 | AS-43 | Done — our original prop: **Spade (Kodal)** | 10 | Done |
| 9.44 | AS-44 | Done — our original prop: **Flower Garland** | 10 | Done |
| 9.45 | AS-45 | Done — our original prop: **Balloon Bunch** | 10 | Done |
| 9.46 | AS-46 | Done — our original prop: **Football** | 10 | Done |
| 9.47 | AS-47 | Done — our original prop: **Cricket Bat & Ball** | 10 | Done |
| 9.48 | AS-48 | Done — our original prop: **Wall Clock** | 10 | Done |
| 9.49 | AS-49 | Done — our original prop: **Fishing Rod** | 10 | Done |
| 9.50 | Asset Library panel: slow-loading thumbnails in reference → ours: local assets, instant, with loading placeholder only if needed | 3 | Verified |

## 10. Panel 7 — Sprite Sheet Studio

| # | Item | Phase | Status |
|---|---|---|---|
| 10.1 | Full-screen Sprite Sheet Studio | 6 | Done — Phase 6A simplified: the studio lives inside the Sprite panel drawer in ours (not a full-screen overlay) |
| 10.2 | Upload individual frames (PNG) | 6 | Planned |
| 10.3 | Upload a full sprite sheet (PNG/WebP) and slice it | 6 | Done — Phase 6A: upload + cols/rows/count slicing |
| 10.4 | "Add More" frames | 6 | Planned |
| 10.5 | Built-in presets (reference: Knight / Slime / Flame) → our original preset characters of the same types | 6 | Planned |
| 10.6 | Live Animation Player (frame x/y display, e.g. frame 3/6) | 6 | Done — Phase 6A: live preview canvas with a "Frame n/count" readout |
| 10.7 | Frame size handling (e.g. 128×128 frames) | 6 | Done — Phase 6A: frame size = sheet ÷ cols/rows, shown in the studio |
| 10.8 | Default 12 FPS; FPS slider | 6 | Done — Phase 6A: FPS control 1–30, default 12 (numeric input in ours, not a slider) |
| 10.9 | Speed control 0.25x–2.0x | 6 | Planned |
| 10.10 | Playback modes labelled Normal / Walk / Run (speed presets) | 6 | Planned |
| 10.11 | Add to Timeline | 6 | Done — Phase 6A: "Add to Scene" adds a sprite layer (renderer plays frames at the layer's fps; layer anim speed also applies) |
| 10.12 | Remove BG per sprite | 6 | Planned |
| 10.13 | Export GIF | 6 | Planned |
| 10.14 | Save Preset | 6 | Planned |
| 10.15 | Save as Character (reference: Cloudinary + Firebase RTDB) → ours: saved locally to library | 6 | Done — Phase 6A: "Save as Character" stores the slicing config on the local media record; saved sprites are listed in the panel |
| 10.16 | Zoom 1x control | 6 | Planned |
| 10.17 | 16:9 preview frame | 6 | Planned |
| 10.18 | Flip X | 6 | Planned |
| 10.19 | Onion Skinning | 6 | Done — Phase 6A: onion toggle ghosts the previous frame at 35% alpha in the preview |
| 10.20 | Transparency checkerboard background | 6 | Done — Phase 6A: checkerboard behind the sprite preview (and the BG remover / eraser canvases) |
| 10.21 | Loop playback toggle | 6 | Done — Phase 6A simplified: preview and sprite layers always loop (frame index is modulo the frame count); no separate toggle |
| 10.22 | Per-frame: Move Left / Move Right | 6 | Planned |
| 10.23 | Per-frame: Replace | 6 | Planned |
| 10.24 | Per-frame: Duplicate | 6 | Planned |
| 10.25 | Per-frame: Remove BG | 6 | Planned |
| 10.26 | Per-frame: Delete | 6 | Planned |

## 11. Panel 8 — Sounds (SFX library)

| # | Item | Phase | Status |
|---|---|---|---|
| 11.1 | Sounds panel with SFX list, each with Preview / Generate + Add and duration (stored items are deleted from the Media audio library) | 5 | Done |
| 11.2 | SFX: sheep bleating (~2s) | 5 | Done — Phase 10B: **Sheep** (3s) — vibrato sawtooth bleat bursts ("baa-baaa") through a band-pass throat, procedural Web Audio like the Phase-5 five; same OfflineAudioContext → WAV → media-store caching by sfxId + live Preview |
| 11.3 | SFX: birds singing — morning, long (~143s in reference) → ours: Web-Audio generated birdsong (6s), stored as an SFX item in the local library | 5 | Done |
| 11.4 | SFX: rooster crow (~2s) | 5 | Done — Phase 10B: **Rooster** (3s) — cock-a-doodle contour: three short rising barks + one long held crow |
| 11.5 | SFX: cat meow (~6s) | 5 | Done — Phase 10B: **Cat** (3s) — two formant-filtered meow pitch-glides (durations are ours; the synthesis approach matches the reference's library role) |
| 11.6 | SFX: frog croak (~6s) | 5 | Done — Phase 10B: **Frog** (4s) — three croak pulse trains (low square pulses through a resonant low-pass) |
| 11.7 | SFX: farm animals mix (~18s) | 5 | Done — Phase 10B: **Farm Mix** (12s) — layered sheep bleats + hen cluck groups + a rooster crow over the Phase-5 birdsong bed (shared voice primitives, so the mix uses the same animals as 11.2/11.3/11.4) |
| 11.8 | SFX: morning birds (~36s) | 5 | Done — Phase 10B: **Morning Birds** (36s) — a long, gentle dawn chorus built from the Phase-5 chirp voice at a slower, softer pace — the full 36 s, matching the reference's long morning entry (11.3 stays the short 6 s birdsong) |
| 11.9 | Extra SFX slot (reference library totals more than the individually named items) — additional bundled effects (rain, wind) via Web Audio generation | 5 | Done |
| 11.10 | Save path (reference: Cloudinary "sound/" + Firebase "site_assets/sound") → ours: IndexedDB media store for generated + uploaded SFX | 5 | Done |
| 11.11 | Upload own SFX into the library | 5 | Done |

## 12. Panel 9 — Anim IK (White Background Remover)

| # | Item | Phase | Status |
|---|---|---|---|
| 12.1 | White Background Remover opens as an embedded full tool | 6 | Done — Phase 6A: embedded in the Anim IK panel, labelled "works offline" (image version; video processing stays Planned — see 12.2) |
| 12.2 | Drop / upload a video to process | 6 | Planned |
| 12.3 | Zoom control | 6 | Planned |
| 12.4 | Backdrop choices: Checker / white / dark / green / pink | 6 | Planned |
| 12.5 | Quality choices: Original / 1080 / 720 / 480 | 6 | Planned |
| 12.6 | View All Frames | 6 | Planned |
| 12.7 | Auto-remove inner white holes (max % control) | 6 | Planned |
| 12.8 | Key Color picker (default white) + pick-from-image | 6 | Done — Phase 6A: default white, click the preview to pick any colour, swatch + reset-to-white |
| 12.9 | White/color range control | 6 | Done — Phase 6A: Range (tolerance) slider 0–200 on RGB colour distance |
| 12.10 | Edge softness control | 6 | Done — Phase 6A: Edge softness slider (smoothstep alpha feather band) |
| 12.11 | Shrink control | 6 | Planned |
| 12.12 | Halo clean control | 6 | Planned |
| 12.13 | Manual tools: Pen | 6 | Planned |
| 12.14 | Manual tools: Lasso | 6 | Planned |
| 12.15 | Manual tools: Delete / Click fill | 6 | Planned |
| 12.16 | Manual tools: Restore pen | 6 | Planned |
| 12.17 | Pen size control | 6 | Planned |
| 12.18 | Character Alpha Mask output | 6 | Done — Phase 6A simplified: the output is a transparent-PNG image (alpha in the picture itself), not a separate mask file |
| 12.19 | Export: Send to Timeline | 6 | Done — Phase 6A: "Add to Scene" saves the transparent PNG to the media store and adds it as an image layer |
| 12.20 | Export: Current frame PNG | 6 | Done — Phase 6A: "Download Transparent PNG" (the tool is still-image based, so this is the processed image itself) |
| 12.21 | Export: Download transparent video (WebM) | 6 | Planned |
| 12.22 | Export: original resolution option | 6 | Done — Phase 6A simplified: processing happens at the original resolution; very large images use a working copy capped at 1600px on the long side |
| 12.23 | Export: FPS setting (0 = same as source) | 6 | Planned |
| 12.24 | Export: Download GIF (quality, dithering, loop Forever/1/3/5, FPS, max frames) | 6 | Planned |
| 12.25 | Export: sprite sheet + ZIP (PNG/WebP) | 6 | Planned |

## 13. Panel 10 — Eraser ("GOTO Edit" equivalent)

| # | Item | Phase | Status |
|---|---|---|---|
| 13.1 | Photo eraser tool opens as an embedded tool, "Offline Ready" | 6 | Done — Phase 6A: embedded in the Eraser panel with an "Offline Ready" badge |
| 13.2 | Upload Photo | 6 | Done — Phase 6A |
| 13.3 | Undo / Redo in eraser | 6 | Done — Phase 6A simplified: Undo step stack (≤10 snapshots) is built; Redo is not included |
| 13.4 | Zoom control | 6 | Planned |
| 13.5 | Layers in eraser | 6 | Planned |
| 13.6 | Character stroke/border view | 6 | Planned |
| 13.7 | Auto Edge Trim | 6 | Planned |
| 13.8 | Download Transparent PNG | 6 | Done — Phase 6A (plus "Add to Scene" sends it to the timeline as an image layer) |
| 13.9 | More Options menu | 6 | Planned |
| 13.10 | Tool: Inspect / None | 6 | Planned |
| 13.11 | Tool: Clean Eraser (E) | 6 | Done — Phase 6A: the Eraser brush (radial-alpha stamp, size slider) |
| 13.12 | Tool: Soft Feather (S) | 6 | Done — Phase 6A simplified: feathering is the brush Hardness slider (soft radial edge), not a separate tool; a Restore brush (paints the original back) is included too |
| 13.13 | Tool: Color Pick (C) | 6 | Planned |
| 13.14 | Tool: White Eraser (W) | 6 | Planned |
| 13.15 | Tool: Polygonal Lasso (L) | 6 | Planned |
| 13.16 | Tool: Hand (H) | 6 | Planned |
| 13.17 | Status line (Idle, active layer, canvas size e.g. 800×600) | 6 | Done — Phase 6A simplified: status line shows canvas size, brush size and the active brush (no eraser-internal layers) |

## 14. Panels 11–12 — Tutorial & Cinema

| # | Item | Phase | Status |
|---|---|---|---|
| 14.1 | Tutorial panel with Computer / Mobile tabs | 6 | Done — Phase 6B simplified: one responsive accordion guide list that works on computer + mobile (no separate tabs) |
| 14.2 | Tutorial content loaded from a content source (reference: Firebase; theirs was empty) → ours: built-in Bengali text/step guides first | 6 | Done — Phase 6B: 6 original Bangla step guides bundled in the app (projects, characters/poses, AI Animate/path, voice/sound, effects/BG remover, Character Studio) — fully offline, no Firebase |
| 14.3 | Tutorial videos (hosted) added later | 10 | Planned |
| 14.4 | "Secret Admin Trigger" (reference admin easter egg) → not a user feature; ours: no hidden admin trigger — admin/content managed via repo files | — | Done |
| 14.5 | Cinema panel: link out to a cinema/streaming site | 6 | Done — Phase 6B: link card opening https://gotocinema.net in a new tab, with an honest note that the streaming site is separate (see 1.24) |

## 15. Audio workflow

| # | Item | Phase | Status |
|---|---|---|---|
| 15.1 | Voice (mic) button starts recording immediately | 5 | Done |
| 15.2 | Stopping recording adds a purple waveform audio track (WebM) | 5 | Done |
| 15.3 | Recordings kept in a global audio library (reference kept them account-wide) → ours: local audio library in IndexedDB | 5 | Done |
| 15.4 | Delete control for library audio (reference had none visible) → ours includes delete | 5 | Done |
| 15.5 | Audio track trim + volume | 5 | Done |
| 15.6 | Audio plays in sync with playhead | 5 | Done |
| 15.7 | Pre-made "Generated Audio" WAV files in Media (reference) → ours: generated SFX (WAV) stored in the Media library + user recordings/uploads | 5 | Done |
| 15.8 | TTS voice list / languages (NOT in reference editor) → our extra: browser TTS voices listed | 8 | Done — Phase 8: speechSynthesis voices listed in the text/subtitle tools (name + lang, Bangla/English first) — see 19.7 |

## 16. Export

| # | Item | Phase | Status |
|---|---|---|---|
| 16.1 | Export Video dialog "Select Export Quality" | 7 | Verified — Phase 7: dialog with quality radios, format selector, total duration, real-time-recording note, no-watermark line, empty-project warning |
| 16.2 | Export option: 720p HD, 1280×720, 30 FPS ("Mobile Friendly") | 7 | Verified — Phase 7: MediaRecorder at 8 Mbps through the editor canvas in export mode |
| 16.3 | Export option: 1920×1080, 60 FPS ("Studio Master") | 7 | Verified — Phase 7: 1080p offered at BOTH 30 FPS (12 Mbps) and 60 FPS "Studio Master" (20 Mbps) |
| 16.4 | Export format: WebM (Phase A, MediaRecorder + canvas captureStream, audio mixed) | 7 | Verified — Phase 7: canvas.captureStream + AudioEngine master-bus tee into a MediaStreamAudioDestinationNode → one MediaRecorder (vp9/vp8/plain WebM mime preference); video-only when the project has no audio |
| 16.5 | Export format: MP4 (reference Pro modal claim; ours Phase B via ffmpeg.wasm) | 7 | Done — Phase 7: lazily loaded from the jsdelivr CDN (@ffmpeg/ffmpeg 0.12.15 + core 0.12.6, pinned) ONLY when MP4 is chosen; libx264/yuv420p + AAC + faststart; honest ~31 MB one-time-download note shown before loading; failure/cancel keeps the WebM download |
| 16.6 | 4K export (reference Pro modal claim) → **built as free feature** if performance allows | 10 | Verified — Phase 10B, built as free feature: a '4k30' preset per aspect in js/export.js — 16:9 → 3840×2160, 9:16 → 2160×3840, 1:1 → 2160×2160, all 30 FPS, 45 Mbps (16:9/9:16) / 30 Mbps (1:1); the export dialog warns next to the option that 4K recording is heavy and 1080p is the fallback if the tab struggles |
| 16.7 | Format selector in export dialog (not shown in reference) → ours includes WebM/MP4 selector | 7 | Verified — Phase 7 |
| 16.8 | Export progress bar + cancel | 7 | Done — Phase 7: progress = elapsed/total with current scene name (200 ms tick), Cancel discards the recording and restores the editor; MP4 conversion has its own progress + cancel |
| 16.9 | Watermark: reference free tier implied a watermark, Pro = "Zero Watermark" → **ours: no watermark ever, free feature** | 7 | Verified |
| 16.10 | YouTube publish button (NOT in reference) → our extra: download + share link only; direct publish if YouTube API added later | 10 | Planned |
| 16.11 | Export presets follow the project aspect — ours only: 9:16 → 720×1280 / 1080×1920, 1:1 → 960×960 / 1080×1080 (labels HD / Full HD by short side), 16:9 unchanged | 8 | Done — Phase 8: `exportPresetsFor(aspect)` in js/export.js; the dialog + recorder resolve presets per aspect |

## 17. Pricing & Pro gates → free equivalents

| # | Item | Phase | Status |
|---|---|---|---|
| 17.1 | Pricing plans (reference: 200 BDT/30d, 1,000 BDT/6mo, 2,000 BDT/1yr) → **ours: no pricing — fully free app** | — | Done |
| 17.2 | Manual bKash/Nagad/Rocket payment + TrxID admin activation → **not built: no payment in ours** | — | Done |
| 17.3 | No credits system (reference has none) → ours also has none | — | Done |
| 17.4 | Pro feature: Full 1080p & 4K MP4 export → free (see 16.3/16.5/16.6) | 7 / 10 | Done — 1080p MP4/WebM export is a free feature (Phase 7); 4K export is now also delivered and free (Phase 10B, see 16.6 — no longer Phase-10-pending) |
| 17.5 | Pro feature: All premium characters → free (see 4A) | 10 | Done — built as free feature: the full character library — all 33 reference roles + the Phase-10B Mishuk extra (34 entries) — is delivered and free (Phases 10A + 10B) |
| 17.6 | Pro feature: Full rigging & IK access → free (see 8.3) | 10 | Done — built as free feature: the Pose Lab (basic joint sliders + saved custom poses) is free like everything else; see 8.3 for the honest scope (not full bone IK) |
| 17.7 | Pro feature: Unlimited cloud backgrounds & props → free locally; cloud unlimited if Firebase added (see 5A/9) | 10 | Done — built as free feature (local part): the complete local library — 21 backgrounds + 49 props (+ 34 characters) — is delivered and free (Phases 10A + 10B); a cloud tier exists only if Firebase is added later (18.1–18.3 stay Planned) |
| 17.8 | Pro feature: Zero watermark → free (see 16.9) | 7 | Verified |
| 17.9 | Pro gate: Character Studio / new pose / character edit → free (see 8.1) | 6 | Done — Phase 6B: Character Studio, pose bundles and character edit are all free features here |
| 17.10 | Pro gate: individual premium characters (e.g. Kona) → free (see 4A.4) | 10 | Done — built as free feature: our Kona equivalent **Rina** is free like every character (Phase 10A) |
| 17.11 | Pro gate: individual premium poses (e.g. Walking) → free (see 4A.37) | 3 | Planned — built as free feature |
| 17.12 | Pro modal UI itself → ours: an "All features are free" info dialog instead of an upsell modal | 2 | Done |

## 18. Tech package (reference stack → our stack)

| # | Item | Phase | Status |
|---|---|---|---|
| 18.1 | Firebase Realtime Database (library content, tutorials) → optional equivalent: Firebase sync | 10 | Planned |
| 18.2 | Firebase/Google sign-in → optional equivalent: Google login via Firebase | 10 | Planned |
| 18.3 | Cloudinary media hosting → optional equivalent; default is local IndexedDB + bundled assets | 10 | Planned |
| 18.4 | PWA manifest + service worker (offline-first) → ours built in Phase 0 | 0 | Done |
| 18.5 | Internal `/api/` (reference, endpoints not public) → ours: no server API in local version; API only if Firebase/backend added | 10 | Planned |
| 18.6 | Layered PNG/GIF sprite rendering on a 16:9 canvas → ours: Canvas 2D + SVG sprite assets | 2 | Done |
| 18.7 | Voice recordings as WebM → ours: MediaRecorder WebM | 5 | Done |
| 18.8 | Transparent WebM/GIF export from BG remover → ours in Phase 6 (see 12.21/12.24) | 6 | Planned |
| 18.9 | AI provider (reference: not named anywhere) → ours: none required; optional Gemini key for AI generation | 10 | Planned |
| 18.10 | Framework (reference: unknown) → ours: vanilla JS, no build step (documented choice) | 0 | Done |
| 18.11 | Hosting (reference: not named; media CDN Cloudinary) → ours: GitHub Pages | 9 | Verified — live 2026-11-13: deployed on GitHub Pages (branch deploy), https://tubetrendsofficials.github.io/cartoon-studio/ |
| 18.12 | Analytics / licenses page (reference: none found) → ours: credits + open-source notices in README | 9 | Planned |
| 18.13 | App version label (reference shows v84.2.5 in header) → ours: version string in header/footer, starting v0.1.0 | 2 | Done |
| 18.14 | Favicon + logo assets → ours: original logo.svg + favicon.png | 0 | Done |

## 19. Our extras (things the reference does NOT have live)

| # | Item | Phase | Status |
|---|---|---|---|
| 19.1 | Text / titles tool | 8 | Done — Phase 8: "+ Text" button in the second toolbar; kind 'text' layers drawn wrapped on canvas (pure wrap heuristic in js/text.js), styles Plain / Title / Bubble, colour swatches + custom colour, Bold, Align, size 24–160; draggable, AI Animate presets/paths/speed and Adjust apply as for other visual layers |
| 19.2 | Shapes tool | 8 | Done — Phase 10B (our extra): toolbar2 "+ Shape" menu adds kind 'shape' layers — Rectangle / Circle / Triangle / Star / Heart / Arrow drawn in a 200×200 box; shape chips + fill swatches/custom colour + stroke width 0–12 (+ stroke colour) in the selected-layer tools; draggable / scalable / flippable, and Adjust + AI Animate presets / paths apply like other visual layers |
| 19.3 | Subtitles / captions layer | 8 | Done — Phase 8: "+ Subtitle" button; kind 'subtitle' layers pinned to the bottom centre (y = 91% of stage height) on a semi-transparent black bar, size 28–72, drag disabled; stacked clips form a dialogue track |
| 19.4 | Dialogue speech bubbles (part of Text tool) | 8 | Done — Phase 8: the Text tool's 'Bubble' style — white rounded rect + tail with dark text |
| 19.5 | 9:16 vertical projects (Shorts/Reels) | 8 | Done — Phase 8: dashboard aspect picker (16:9 · 9:16 Shorts · 1:1) at creation, aspect badge on cards, stage 720×1280; all editor geometry + export presets follow the aspect (720×1280 / 1080×1920) |
| 19.6 | 1:1 square projects | 8 | Done — Phase 8: same picker; stage 960×960; export presets 960×960 / 1080×1080 |
| 19.7 | TTS preview with browser built-in voices (free) | 8 | Done — Phase 8: Web Speech API in the text/subtitle tools — voice list (Bangla + English sorted first), rate 0.5–2×, Speak button, opt-in auto-speak during preview playback; cancelled on pause/seek/scene switch and hard-blocked during export (preview aid only, never recorded) |
| 19.8 | Script / story generator (marketing claim only in reference) → ours: template-based story starter in Phase 8; AI version optional Phase 10 | 8 / 10 | Planned — Phase 10B review: NOT built, deliberately. The reference has no live script generator (marketing-claim only, per the A-to-Z report), and a story starter was not part of the Phase 10B mop-up scope; it stays an optional future extra (template version needs no backend; an AI version depends on the optional Gemini item 18.9). Nothing in the app claims to have it |
| 19.9 | Collaboration / share project link (not in reference) → with optional Firebase | 10 | Planned |
| 19.10 | Story templates (see 1.26) | 8 | Planned — Phase 10B review: NOT built, deliberately (same reasoning as 19.8 — the reference's template names appear only in its marketing block; see 1.26, also still Planned). The closest shipped equivalent is the bundled Bangla tutorial step-guides (14.2). Stays an optional future extra; not claimed anywhere in the app |

## 20. End-to-end workflow (reference §7) — coverage check

| # | Workflow step | Covered by | Phase | Status |
|---|---|---|---|---|
| 20.1 | Open site, signed in | 1.x dashboard / 18.2 optional login | 1 / 10 | In progress |
| 20.2 | New Project (instant blank) | 2.x | 1 | Verified |
| 20.3 | Add background | 5.x | 3 | Verified |
| 20.4 | Add characters + poses + mouth modes | 4.x / 4A | 3 | Done |
| 20.5 | Animate (presets / path / speed) | 4.12–4.20 | 4 | Done |
| 20.6 | Props, effects, sprites | 7.x / 9.x / 10.x | 3 / 6 | Done |
| 20.7 | Audio (record / library / SFX) | 11.x / 15.x | 5 | Done |
| 20.8 | Add scenes + preview | 3.21–3.31 | 2 / 4 | Done |
| 20.9 | Save (auto + manual) | 2.8 / 2.9 | 1 | Done |
| 20.10 | Export video | 16.x | 7 | Verified |
| 20.11 | GitHub Pages public release of the app itself | 18.11 | 9 | Verified — live 2026-11-13: https://tubetrendsofficials.github.io/cartoon-studio/ loads and runs (see the header note) |

---
*Checklist maintenance rule: when a phase is finished, flip its rows to Done; when it has been run and checked in a browser, flip to Verified. New reference findings get a new row — never delete a row.*
