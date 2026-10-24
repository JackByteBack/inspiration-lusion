# Lumina Studio — Local Mirror

A locally served copy of **https://lusion.co** — the Astro-generated production site plus its custom Three.js/WebGL engine — with every desktop and mobile asset mirrored locally and served by a zero-dependency Node server.

The brand has been renamed to **Lumina Studio**: page titles and meta, header and footer copy, emails, social handles, the header wordmark, the About wordmark (both the static SVG and the 3D mesh), the console credit, and the social share image.

```bash
cd lusion-clone
npm start
# → http://localhost:4173
```

Node 18+. There is no build step and no dependencies. Change the port with `PORT=8080 npm start`, or run `node server.mjs` directly.

---

## Contents

| Path | Size | Contents |
| --- | --- | --- |
| `public/` | 208 MB / 602 files | The production build: 22 HTML documents, 1 stylesheet, 1 compiled module, all assets |
| `public/_astro/about.CNa9RfUh.css` | 90 KB | The complete design system and every page style |
| `public/_astro/hoisted.CUO_IjfL.js` | 1.25 MB | The compiled application: DOM UI + Three.js engine |
| `public/assets/projects/` | 186 MB | 19 project folders: posters, depth maps, galleries, case-study video |
| `public/assets/textures/` | 14 MB | Matcaps, gradients, mattes, SMAA lookup tables, tunnel decals |
| `public/assets/models/` | 3.4 MB | 55 custom `.buf` geometry/animation buffers |
| `public/assets/audios/` | 1.3 MB | 16 `.ogg` UI, page, focus and cinematic sounds |
| `public/assets/team/` | 640 KB | 7 team face meshes + `team.json` |
| `public/assets/fonts/` | 452 KB | Aeonik, IBM Plex Mono, LusionMono (`.woff` + `.woff2`) |
| `public/assets/images/` | 168 KB | Client logos, card back, arrow icons |
| `public/assets/meta/` | 152 KB | Favicons, web manifest, social share image |
| `screenshots/` | 13 MB | Reference captures of the running mirror |
| `server.mjs` | 91 lines | Static server: extensionless routes, MIME types, HTTP range requests |
| `package.json` | — | `npm start` only |

File mix inside `public/`:

```
398 .webp   55 .buf    49 .mp4   22 .html  20 .png  18 .svg
 16 .ogg     6 .woff2   6 .woff   3 .jpg    2 .ico   2 .exr
  1 .webmanifest  1 .txt  1 .json  1 .js  1 .css
```

---

## Routes

| URL | Document | Page class |
| --- | --- | --- |
| `/` | `public/index.html` | `HomePage` |
| `/about` | `public/about/index.html` | `AboutPage` |
| `/projects` | `public/projects/index.html` | `ProjectsPage` |
| `/projects/:slug` | `public/projects/:slug/index.html` | `ProjectPage` |

Project slugs (19):

```
atlas_motion            infinite_passerella      soda_experience
choo_choo_world         lumina_labs              spaace
ddd_2024                maxmara_bearings_gifts   spatial_fusion
devin_ai                my_little_story_book     synthetic_human
everswap                of_the_oak               the_turn_of_the_screw
oryzo_ai                porsche_dream_machine    worldcoin
                                                 zero_tech
```

Every project page is a real, server-rendered document. Direct navigation and refresh work; the client router only takes over for in-app clicks.

---

## How the server works

`server.mjs` is intentionally tiny — it does three things:

1. **Route resolution.** `/about` tries `public/about`, then `public/about.html`, then `public/about/index.html`. `/projects/oryzo_ai` resolves the same way. Trailing-slash URLs go straight to `index.html`.
2. **MIME types.** Explicit map for HTML, CSS, JS, JSON, SVG, images, fonts, `.mp4`, `.ogg`, `.buf`, `.exr`.
3. **Range requests.** Videos are served with `206 Partial Content`, `Content-Range`, `Accept-Ranges: bytes` and a read stream, so seeking and looping work like a normal host.

Path traversal is blocked by normalising the resolved path and checking it still starts with `public/`. Responses use `cache-control: no-cache` so edits show up on refresh.

---

## Architecture

### Stack

- **Astro** static output: one HTML document per route, one global stylesheet, one compiled module script.
- **Three.js r158** plus a large custom engine. No React/Next, no GSAP, no Lenis, no Howler — scrolling, routing, transitions, audio and post-processing are all hand-written.
- **WebGL2** single full-screen canvas (`#canvas`) behind a DOM UI layer (`#ui`).
- Custom binary `.buf` files for geometry and animation, `.exr` matcaps, `.ogg` positional audio, `.mp4` video textures, `.webp` image textures.

### Boot sequence

1. `preRun()` registers the `FontItem` loader type, initialises `routeManager`, adds the Aeonik font, and starts the loader.
2. **Preloader** loads the current page's models, textures, audio and fonts, animating the percentage digits in `#preloader-percent-digits`.
3. When progress hits `1`, `run()` builds the app: `properties`, `PageManager`, `RouteManager`, `ScrollManager`, `Header`, `Preloader`, `GlobalAudios`, `videoOverlay`.
4. The page class composes its sections and WebGL scene; `is-ready` is added to `<html>` and the preloader fades out.

### Render loop

One `requestAnimationFrame` loop per frame:

```
input → scrollManager → pageManager → active page → sections → shaders →
post-processing (Bloom → Blur → SMAA) → audio → DOM transform sync
```

`properties` is the shared state hub: viewport size, DPR, time, `useMobileLayout`, `hasStarted`, shared uniforms, the post-processing queue.

### Virtual scroll

The window itself never scrolls. `ScrollManager` owns a damped pixel value:

- Wheel/touch deltas feed a target; the current value eases toward it every frame.
- `#page-container` is translated by the eased value.
- `ScrollDomRange` objects measure each section once and report `screenRatio`, `screenY`, `isActive` as it moves.
- The home page is **~51,555 px** tall at 1440×900. The thin `#scroll-indicator-bar` is the only native-feeling scroll cue.

This is what produces the slow, weighted, cinematic feel — and why `page.mouse.wheel()` works in automation while `window.scrollTo()` does nothing.

Home section heights at 1440×900:

| Section | Height |
| --- | --- |
| `#home-hero` | 900 px |
| `#home-reel` | 2,533 px |
| `#home-featured` | 3,904 px |
| `#home-goal` | 39,855 px |
| `#end-section` | 3,150 px |
| `#footer-section` | 900 px |
| `#scroll-nav-section` | 313 px |

### Routing and transitions

- Internal links are intercepted by `RouteManager`.
- The next document is fetched in the background while the current page is still live.
- A WebGL overlay (render-target copy + wipe shader) covers the swap; the new page's sections mount underneath, then the overlay opens.
- Scroll position, audio and the active page are reset on completion.

### Page composition

Each page class is a thin coordinator that owns its sections:

| Page | Sections |
| --- | --- |
| `HomePage` | `HomeHeroSection`, `HomeReelSection`, `HomeFeaturedSection`, `HomeGoalSectionTunnelTitle`, `HomeBalloons*`, shared `EndSection`, `FooterSection`, `ScrollNavSection` |
| `AboutPage` | `AboutHero` (letters, particles, rocks, fog, ground, halo, light field, lines, person), `AboutWhoSection` (we-are, details, team), `AboutClientSection`, `AboutAwardSection`, `AboutCapabilitySection` |
| `ProjectsPage` | `ProjectsMainSection` + shared tail |
| `ProjectPage` | `ProjectDetailsSection`, `ProjectDetailsScreen`, `ProjectDetailsItems` + shared tail |

The shared tail (`PageExtraSections`) is identical on every page: the “let’s work together” end section, the footer, and the next-page scroll nav.

### Main classes in the bundle

| Group | Classes |
| --- | --- |
| App shell | `App`, `PageManager`, `RouteManager`, `ScrollManager`, `ScrollPane`, `ScrollDomRange`, `Preloader`, `Header`, `PageExtraSections` |
| Pages | `HomePage`, `AboutPage`, `ProjectsPage`, `ProjectPage`, `PlaygroundPage` |
| Home sections | `HomeHeroSection`, `HomeReelSection`, `HomeFeaturedSection`, `HomeGoalSectionTunnelTitle`, `HomeBalloons`, `HomeBalloonsBody`, `HomeBalloonsPhysics`, `HomeBalloonsBackground`, `EndSection`, `FooterSection`, `ScrollNavSection` |
| About hero | `AboutHero`, `AboutHeroLetters`, `AboutHeroParticles`, `AboutHeroParticlesSimulation`, `AboutHeroRocks`, `AboutHeroScatter`, `AboutHeroFog`, `AboutHeroGround`, `AboutHeroHalo`, `AboutHeroLight`, `AboutHeroLightField`, `AboutHeroLines`, `AboutHeroFaces`, `AboutPageHeroEfx` |
| About content | `AboutWhoSection`, `AboutWhoLogo`, `WhoSubsectionWeAre`, `WhoSubsectionDetails`, `WhoSubsectionTeam`, `AboutCapabilitySection`, `AboutClientSection`, `AboutAwardSection` |
| Projects | `ProjectsMainSection`, `ProjectItem`, `ProjectItemList`, `ProjectDetailsSection`, `ProjectDetailsScreen`, `ProjectDetailsItems`, `ProjectDetailsItem`, `ProjectDetailsData` |
| Engine | `Loader`, `BufItem`, `TextureItem`, `AudioItem`, `FontItem`, `ShaderHelper`, `TextureHelper`, `UfxMesh`, `CameraControls`, `PostProcess`, `Bloom`, `Blur`, `SMAA`, `BrownianMotion` |
| Audio | `Audios`, `AudioGroup`, `AudioItem`, `GlobalAudios`, `HomePageAudios`, `AboutPageAudios` |

### Header and menu

`#header` has three zones:

- **Left** — `#header-logo`, an inline SVG wordmark (`width: 7.5em`, colour driven by `--header-color` / `--project-details-highlight`).
- **Centre** — `#header-center-project-back-btn`, only visible on project pages.
- **Right** — sound toggle (`#header-right-sound-btn`, canvas waveform), “Let’s talk” (`mailto:`), menu button (`#header-right-menu-btn`).

The menu is a DOM panel toggled with `--menu-opened` on `#header`: links, newsletter form, contact, and a Labs card. It is animated by the same render loop (no CSS transitions for the main motion).

### Audio

- `USE_AUDIO` is enabled only when the browser supports Ogg and is not mobile.
- `GlobalAudios` owns UI sounds: hover, click, focus, page, glass, cinematic, generic.
- Positional sounds use `PositionalAudio`; page-specific groups are created per page and disposed on route change.
- The sound button reflects state; audio starts muted until the user interacts.

### Post-processing

A single `PostProcess` queue runs after the scene render:

- **Bloom** — threshold/radius/strength per page (`AboutHero` pushes the amount to 4).
- **Blur** — used by the reel and transitions.
- **SMAA** — edge AA using the bundled `smaa-area.png` / `smaa-search.png` lookup textures.

`UfxMesh` is the bridge between DOM and WebGL: it reads a DOM element's rect (`syncDom`), renders a plane with a custom shader into the same screen position, and is used for the project cards, the About wordmark, the reel and the footer effects.

---

## Page anatomy

### Home

| Section | What happens |
| --- | --- |
| `#home-hero` | Full-bleed WebGL scene of glossy 3D crosses (`.exr` matcaps, bloom). The intro copy and “Scroll to explore” sit above it. |
| `#home-reel` | Showreel panel with a video texture, play button, corner decorations, hover ripples. |
| `#home-featured` | Featured project cards with depth-mapped hover previews and per-project colour themes. |
| `#home-goal` | ~40,000 px tunnel: camera flies through a generated grid tunnel with stickers, astronaut geometry, line meshes and a giant “GOAL” title sequence. |
| `#end-section` | Shared CTA: “Let’s work together”, project enquiry link. |
| `#footer-section` | Address, socials, enquiries, newsletter, copyright, back-to-top. |
| `#scroll-nav-section` | Next-page hand-off with a progress bar and a large page name. |

### About

| Block | What happens |
| --- | --- |
| `#about-hero` | Particle/rock landscape with a person mesh, fog, halo and light field; the camera follows a spline (`camera_spline.buf`). |
| `#about-who` | “WE ARE **LUMINA**”: the big wordmark is a WebGL mesh that rises letter-by-letter, then morphs into the small inline SVG next to “WE ARE”. Below: studio copy and a team carousel with 3D face meshes. |
| `#about-clients` | Logo carousel of client marks. |
| `#about-award` | Award list. |
| `#about-capability` | Capability cards with 3D icons and staggered type. |

### Projects

- `#projects-main` renders the 19 cards in a 2-column grid (1-column on mobile).
- Each card carries `data-color-bg`, `data-color-text`, `data-color-shadow` and `data-id`; hovering swaps the page theme and plays a depth-mapped preview.
- Clicking routes to `/projects/:slug` through the WebGL transition.

### Project detail

- Hero title, meta, description, services and external links.
- `ProjectDetailsItems` lays out the case-study media (images and videos) with sticky preview panels and a progress bar.
- Each page injects its palette via `data-color-*` on the `<html>` / `<body>` wrapper.

---

## Asset pipeline

### `.buf` format

All geometry and animation is stored in a custom binary container:

```
[ uint32 LE jsonLength ][ json header ][ attribute data ... ]
```

Header:

```json
{
  "vertexCount": 98,
  "indexCount": 264,
  "attributes": [
    { "id": "indices",  "needsPack": false, "componentSize": 1, "storageType": "Uint16Array" },
    { "id": "position", "needsPack": true,  "componentSize": 3, "storageType": "Uint16Array",
      "packedComponents": [
        { "from": 0, "delta": 1 },
        { "from": 0, "delta": 0.18761626361945258 },
        { "from": 0, "delta": 1 }
      ] },
    { "id": "char", "needsPack": false, "componentSize": 1, "storageType": "Uint8Array" }
  ],
  "meshType": "Mesh"
}
```

- Attributes are concatenated in header order; each is read as a typed array view at the running offset.
- `needsPack: true` dequantises each component with `(raw / max) * delta + from` into a `Float32Array`.
- `meshType` is `Mesh`, `LineSegments` or `Points`.
- Optional `sceneData` splits one file into named sub-meshes with their own transform.

`BufItem` loads the file as an `ArrayBuffer`, parses the header, builds a `BufferGeometry`, and hands it to the loader.

### Textures and media

| Kind | Convention |
| --- | --- |
| Project poster | `projects/<slug>/home.webp` |
| Hover depth map | `projects/<slug>/home_depth.webp` |
| Gallery image | `projects/<slug>/image_1.webp`, `image_2.webp`, … |
| Gallery video | `projects/<slug>/main.mp4`, `launch.mp4`, `bts.mp4`, … |
| Mobile image | `projects/<slug>/mobile_image_1.webp`, … |
| Mobile video | `projects/<slug>/mobile_video_1.mp4`, … |
| Matcap / gradient | `textures/**/*.exr`, `textures/**/*.png` |
| SMAA lookup | `textures/smaa-area.png`, `textures/smaa-search.png` |

The engine swaps `image` → `mobile_image` and `video` → `mobile_video` automatically when `browser.isMobile` is true. Low-detail variants (`*_ld`, `*_low`) are used on small screens or while loading.

### Audio

```
audios/
├─ hover_0..2.ogg      UI hover
├─ click_0..1.ogg      UI click
├─ focus_0..2.ogg      focus / selection
├─ page_0..1.ogg       page transitions
├─ cinematic_0..3.ogg  About / tunnel beds
├─ generic.ogg         ambient loop
├─ generic_end.ogg     ambient tail
└─ glass_broken.ogg    transition accent
```

### Fonts

| File | Use |
| --- | --- |
| `Aeonik-Regular` / `Aeonik-Medium` / `Aeonik-RegularItalic` | All UI and display type |
| `IBMPlexMono-Regular` / `IBMPlexMono-Medium` | Labels, metadata, small caps |
| `LusionMono` | Monospaced accents (footer, capability cards) |

### Team

`team.json` lists seven members (`edan`, `ffi`, `pierre`, `yannic`, `paul`, `andrii`, `sunny`) with name and role. Each has a `.buf` face mesh used by the About team carousel.

---

## Design system

All tokens live at the top of `public/_astro/about.CNa9RfUh.css`.

### Palette

| Token | Value | Use |
| --- | --- | --- |
| `--color-black` | `#000000` | Primary ink |
| `--color-white` | `#ffffff` | Paper / inverted type |
| `--color-off-white` | `#f0f1fa` | Default page background |
| `--color-dark-white` | `#e4e6ef` | Secondary surfaces |
| `--color-off-white-semi` | `rgba(240,241,250,.7)` | Muted labels |
| `--color-grey-blue` | `#2b2e3a` | Dark UI / “Let’s talk” button |
| `--color-blue` | `#1a2ffb` | Brand blue, hero crosses |
| `--color-dark-blue` | `#071bdf` | Deep blue shadow |
| `--header-color` | `#0016ec` | Header accent blue |
| `--color-green` | `#c1ff00` | Acid highlight |
| `--color-red` | `#ff4c41` | Alert / reel accent |
| `--color-purple` | `#8832f7` | Synthetic Human accent |
| `--color-error` | `#e90000` | Form errors |

### Project themes

Each project page injects its own palette through `data-color-*` attributes:

| Project | Background | Text | Accent |
| --- | --- | --- | --- |
| Oryzo AI | `#1a1411` | `#ffedd7` | `#dc5000` |
| Atlas Motion | `#181818` | `#FFFDE0` | — |
| Devin AI | `#121414` | `#ffffff` | — |
| Of The Oak | `#111a13` | `#d9f3de` | — |
| Everswap | `#E3E3F8` | `#000000` | — |
| Porsche: Dream Machine | `#EFD5D3` | `#000000` | — |
| Synthetic Human | `#9d8aff` | `#ffffff` | — |
| DDD 2024 | `#261c46` | `#ffffff` | — |
| Spaace | `#010a16` | `#ffece2` | — |
| Choo Choo World | `#E8EEF8` | `#000000` | — |
| Zero Tech | `#192743` | `#ffffff` | — |
| Meta: Spatial Fusion | `#D6C8ED` | `#000000` | — |
| Worldcoin Globe | `#F3F4F9` | `#000000` | — |
| Lumina Labs | `#1F2022` | `#ffffff` | — |
| My Little Story Book | `#D1DDF2` | `#000000` | — |
| Soda Experience | `#E1E2E4` | `#000000` | — |
| Infinite Passerella | `#28262B` | `#ffffff` | — |
| The Turn Of The Screw | `#2B3037` | `#ffffff` | — |
| Max Mara: Bearings & Gifts | `#d2c6b2` | `#000000` | — |

### Typography

| Family | Weights | Role |
| --- | --- | --- |
| **Aeonik** | 400, 500, 400 italic | Everything: display, body, buttons |
| **IBM Plex Mono** | 400, 500 | Technical labels, metadata, small caps |
| **LusionMono** | 400 | Custom monospaced accents |

Display sizes are viewport-driven (`19.5vw` hero, `10vw`, `6.7vw`, `7.5em`); labels are uppercase mono with tight tracking. Body copy is small, high-contrast and generously leaded.

### Layout

```css
--grid-space: calc((100% - 11 * var(--grid-gap)) / 12); /* 12 columns */
--grid-gap: 2vw;                                       /* 4vw below 1000px */
--base-padding-x: max(5vw, 40px);                      /* 6vw / 60px ≥1600px */
--base-padding-y: clamp(30px, 4vw, 50px);
--global-border-radius: 20px;                          /* 15px / 10px at breakpoints */
```

Breakpoints and queries used:

```
min-width: 1600px
max-width: 1200px
max-width: 1000px
max-width: 812px
max-width: 560px
max-width: 480px
max-width: 400px
max-width: 380px
max-height: 650px
min-aspect-ratio: 21/9
hover: hover
```

Sections are full-viewport panels with generous negative space. The 3D canvas is always behind; DOM content floats above it with mix-blend and contrast rules.

### Motion language

- Damped virtual scroll instead of native scrolling — slow, heavy, cinematic.
- Preloader with animated percentage; WebGL wipe transitions between routes.
- Scroll-driven camera moves, tunnel fly-throughs, particle fields, morphing typography.
- Letter-by-letter reveals and per-letter stagger (`char` attribute in the wordmark shader).
- Hover-reactive project cards with depth-mapped previews and theme swaps.
- Custom cursor, magnetic buttons, UI sound effects on hover/click.
- Post-processing: bloom, blur, SMAA; `.exr` matcaps for the glossy 3D crosses.

---

## The Lumina Studio rebrand

Everything below was done **without a build step**, by editing the shipped HTML, CSS, JS and binary assets.

### Text and metadata

| Before | After |
| --- | --- |
| `Lusion - …` titles / descriptions | `Lumina Studio - …` |
| `LUSION Creative Studio` | `LUMINA Studio` |
| `Built by Lusion with ❤️` | `Built by Lumina Studio ❤️` |
| `hello@lusion.co` / `business@lusion.co` | `hello@luminastudio.co` / `business@luminastudio.co` |
| `labs.lusion.co` | `labs.luminastudio.co` |
| `lusionltd` socials | `luminastudio` |
| `https://lusion.co` (OG / canonical) | `https://luminastudio.co` |
| `Lusion Labs` | `Lumina Labs` |
| console credit | `Created by Lumina Studio: https://luminastudio.co/` |

The CDN switch (`location.hostname === "lusion.co"` → `https://lusion.dev`) was removed so `CDN_PATH` stays empty and all assets resolve relatively on any host.

### Header and About wordmark

The original wordmark was Aeonik Medium with ~48 font units of tracking. The new **LUMINA** path was generated from `Aeonik-Medium.woff` with `opentype.js`, using the same cap height and tracking, then normalised to its bounding box:

- Header SVG: `viewBox="0 0 3763 706"`, same `mix-blend-mode: exclusion` wrapper and `currentColor` fill.
- About static SVG: same path and viewBox.
- Result: 3,763 × 706 units, aspect **5.330**.

### 3D wordmark (`logo_text.buf`)

The About page's big wordmark is not an SVG — it is a WebGL mesh rendered by `AboutWhoLogo` from `public/assets/models/about/logo_text.buf`. That file was regenerated for LUMINA:

1. Extract glyph outlines for `L, U, M, I, N, A` from Aeonik Medium.
2. Flatten curves, detect counters (the `A` hole), triangulate with `earcut`.
3. Emit the same `.buf` layout: `indices` (Uint16), packed `position` (Uint16, x/y/z deltas), `char` (Uint8, one value per letter).
4. Normalise to x `0..1`, y `0..1/aspect` (0 at the bottom), z `0.92..1.0` so the shader's `fwidth` alpha stays fully opaque.
5. Update `u_aspect` in the bundle from `1/.200957` to `5.330028328611898`, and both About SVG viewBoxes to match.

The result is 98 vertices / 88 triangles (the original LUSION mesh was 1,400 / 6,270 because of its curved `S` and `O`).

The shader still does its original job: letters rise from below on entry, then morph into the small inline SVG position as you scroll, staggered per letter via the `char` attribute.

### Other assets

- `lusion_labs` → `lumina_labs` for the project folder, asset folder, links and `data-id`.
- `assets/meta/site.webmanifest` name and short name updated.
- `robots.txt` sitemap host updated.
- `assets/meta/social_sharing.jpg` regenerated at 1200×630 from the home hero render with a centred LUMINA wordmark.
- Favicons kept: the mark is a simple geometric “L”, which still reads as Lumina.

Technical identifiers that were intentionally **not** renamed: the `LusionMono` font family and its files, the `ease.lusion` easing function, and third-party links whose URLs happen to contain `lusion` (Awwwards, FWA, Porsche Newsroom).

---

## Verification

Checked at 1440×900 and 390×844 (iPhone 13):

- Home, About, Projects and all 19 project pages return `200` with **zero local 404s**.
- All 22 documents start with `Lumina Studio` in `<title>`.
- Home scroll sections, reel, featured cards, tunnel, end section, footer and next-page hand-off render.
- About hero particles, the 3D wordmark, the small inline wordmark, team carousel and capability cards render.
- Header menu opens, project-card routing works, back button returns.
- Videos serve range requests and loop; audio loads; fonts load.
- Console credit prints the new brand.
- Mobile layout swaps to `mobile_*` assets and renders correctly.

Reference images in `screenshots/`:

```
home-hero.png          home-tunnel.png        about-hero.png
projects.png           project-oryzo-ai.png   menu.png
mobile-home.png
```

---

## Known limitations

- **External, not mirrored:** the Vimeo embeds on *Atlas Motion* and *Spaace* (the Vimeo videos themselves return 404), Google Analytics, and the newsletter form endpoint (a Mailchimp list).
- **Not the original source.** This is the production build. The Astro components, shader source files and build config are not public; the HTML/CSS/JS here are the compiled output.
- **No sitemap.** `sitemap-index.xml` is not generated by the site; `robots.txt` still points at it.
- **Large repo.** 208 MB of media. Cloning is slow; the repo is best kept private or used locally.
- **Browser support.** WebGL2 is required. Without it the canvas stays empty (the DOM still renders).
- **Autoplay.** Audio and some videos need a user gesture; headless testing uses `--autoplay-policy=no-user-gesture-required`.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `EADDRINUSE` on start | Another server is on 4173 — `PORT=8080 npm start` or kill the old process |
| Blank page, no 3D | Check WebGL2 support and the browser console for shader errors |
| Route 404s | Make sure you are using `server.mjs` (or a host with extensionless route resolution), not a plain file server |
| Videos do not seek | The host must support `Range` requests; `server.mjs` does |
| Fonts look wrong | `public/assets/fonts/` must be served with `font/woff2` / `font/woff` MIME types |
| Menu/project clicks do nothing in automation | The site uses custom hit-testing; call `element.click()` instead of synthetic mouse clicks |

---

## Editing guide

| Want to change | Edit |
| --- | --- |
| Copy, titles, meta | the relevant `public/**/index.html` |
| Colours, type, layout | `public/_astro/about.CNa9RfUh.css` (`:root` tokens at the top) |
| Header logo | the inline SVG inside `#header-logo` in each HTML file |
| About static wordmark | `#about-who-title-left-2 svg path` in `public/about/index.html` |
| About 3D wordmark | `public/assets/models/about/logo_text.buf` + `u_aspect` in the bundle |
| Project order / cards | `public/projects/index.html` (`data-id`, `data-color-*`, hrefs) |
| Server behaviour | `server.mjs` |

If you change the wordmark aspect, update **all three** in sync: the header SVG viewBox, the About SVG viewBox, and `u_aspect` in `hoisted.CUO_IjfL.js`.

---

## Credits

- Original site, design, code, 3D work and case-study media: **Lusion Creative Studio** — https://lusion.co
- This mirror is a local study/reference build, renamed to Lumina Studio. It is not affiliated with or endorsed by Lusion.
- Fonts (Aeonik, IBM Plex Mono) and client logos remain the property of their respective owners.
