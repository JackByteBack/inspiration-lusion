# Lumina Studio — Local Mirror

A locally served copy of **https://lusion.co** — the Astro-generated production site plus its custom Three.js/WebGL engine — with every desktop and mobile asset mirrored locally and served by a zero-dependency Node server.

The brand has been renamed to **Lumina Studio**: page titles and meta, header and footer copy, emails, social handles, the header wordmark, the About wordmark (both the static SVG and the 3D mesh), the console credit, and the social share image.

```bash
cd lusion-clone
npm start
# → http://localhost:4173
```

Node 18+. There is no build step. Change the port with `PORT=8080 npm start`.

---

## What is in here

| Path | Contents |
| --- | --- |
| `public/` | The production build of the site: HTML, CSS, the compiled app bundle, and all 602 files (≈208 MB) |
| `public/_astro/about.CNa9RfUh.css` | The complete design system / all page styles |
| `public/_astro/hoisted.CUO_IjfL.js` | The compiled application: UI + Three.js engine (~1.2 MB) |
| `public/assets/` | Fonts, models, textures, audio, project videos/images, team data, logos, favicons |
| `screenshots/` | Reference captures of the running mirror (desktop + mobile) |
| `server.mjs` | Static server with extensionless-route resolution and HTTP range support for video |
| `package.json` | `npm start` only; no dependencies |

The original site switches its media base to `https://lusion.dev` when served on `lusion.co`. That CDN switch has been removed, so every asset resolves relative to `/assets/...` and the copy runs entirely offline with no URL rewriting.

**Still external:** Vimeo embeds on *Atlas Motion* and *Spaace*, Google Analytics, and the newsletter form endpoint. Everything else is local.

---

## Routes

```
/                         Home
/about                    About
/projects                 Projects index (19 projects)
/projects/:slug           Project case study
```

Project slugs:

```
atlas_motion          infinite_passerella       soda_experience
choo_choo_world       lumina_labs               spaace
ddd_2024              maxmara_bearings_gifts    spatial_fusion
devin_ai              my_little_story_book      synthetic_human
everswap              of_the_oak                the_turn_of_the_screw
                      oryzo_ai                  worldcoin
                      porsche_dream_machine     zero_tech
```

The server resolves `/about` → `public/about/index.html` and `/projects/oryzo_ai` → `public/projects/oryzo_ai/index.html`, so the site's absolute links and its XHR page-preloading both work unchanged.

---

## Architecture

### Stack

- **Astro** static output: one HTML document per route, one global stylesheet, one compiled module script.
- **Three.js r158** plus a large custom engine — no React/Next, no GSAP, no Lenis, no Howler. Scrolling, routing, transitions, audio, and post-processing are all hand-written.
- **WebGL2** single full-screen canvas (`#canvas`) behind a DOM UI layer (`#ui`).
- Custom binary `.buf` files for geometry/animation, `.exr` matcaps, `.ogg` positional audio, `.mp4` video textures.

### Runtime flow

1. **Preloader** — loads the page's models, textures, audio, and fonts while animating the percentage digits.
2. **App bootstrap** — creates `PageManager`, `RouteManager`, `ScrollManager`, `Header`, `Preloader`, and `GlobalAudios`.
3. **Virtual scroll** — the home page is ~51,555 px tall, but the window itself never scrolls. Wheel/touch input is damped and applied to a translated `#page-container`; sections are laid out inside it. This is what produces the slow, weighted feel and the tiny progress bar.
4. **Page composition** — `PageManager` owns `HomePage`, `AboutPage`, `ProjectsPage`, and `ProjectPage`. Each page composes section classes and a WebGL scene.
5. **Routing** — links are intercepted; the next page's HTML is fetched in the background, then a WebGL transition overlay swaps scenes. Direct URLs are server-rendered, so refresh/deep-link works.
6. **Render loop** — one `requestAnimationFrame` loop updates scroll, page, sections, shaders, post-processing (Bloom, Blur, SMAA), audio, and DOM sync.

### Main classes in the bundle

| Group | Classes |
| --- | --- |
| App shell | `App`, `PageManager`, `RouteManager`, `ScrollManager`, `ScrollPane`, `ScrollDomRange`, `Preloader`, `Header`, `PageExtraSections` |
| Pages | `HomePage`, `AboutPage`, `ProjectsPage`, `ProjectPage`, `PlaygroundPage` |
| Home sections | `HomeHeroSection`, `HomeReelSection`, `HomeFeaturedSection`, `HomeGoalSectionTunnelTitle`, `HomeBalloons*`, `EndSection`, `FooterSection`, `ScrollNavSection` |
| About sections | `AboutHero`, `AboutHeroLetters`, `AboutHeroParticles`, `AboutHeroParticlesSimulation`, `AboutHeroRocks`, `AboutHeroFog`, `AboutHeroGround`, `AboutHeroHalo`, `AboutHeroLightField`, `AboutWhoSection`, `AboutWhoLogo`, `AboutCapabilitySection`, `AboutClientSection`, `AboutAwardSection` |
| Projects | `ProjectsMainSection`, `ProjectItem`, `ProjectItemList`, `ProjectDetailsSection`, `ProjectDetailsScreen`, `ProjectDetailsItems`, `ProjectDetailsItem` |
| Engine | `Loader`, `BufItem`, `TextureItem`, `AudioItem`, `ShaderHelper`, `TextureHelper`, `CameraControls`, `PostProcess`, `Bloom`, `Blur`, `SMAA` |

### Asset conventions

```
assets/
├─ fonts/       Aeonik (400/500/italic), IBM Plex Mono (400/500), LusionMono
├─ models/      .buf — custom packed geometry + animation buffers
├─ textures/    .webp / .png / .exr (matcaps, heightmaps, mattes, SMAA)
├─ audios/      .ogg — UI, page, focus, cinematic, positional
├─ projects/    <slug>/home.webp, home_depth.webp, image*.webp, video*.mp4
├─ team/        <member>.buf + team.json
├─ images/      logos, card backs, icons
└─ meta/        favicons, web manifest, social image
```

Images/videos have desktop and mobile variants (`mobile_image*.webp`, `mobile_video*.mp4`); the engine swaps them using `browser.isMobile`.

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

Project pages inject their own theme through `data-color-*` attributes:

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

Display sizes are viewport-driven (`19.5vw` hero, `10vw`, `6.7vw`, `7.5em`); labels are uppercase mono with tight tracking. Body copy is small, high-contrast, and generously leaded.

### Layout

```css
--grid-space: calc((100% - 11 * var(--grid-gap)) / 12); /* 12 columns */
--grid-gap: 2vw;                                       /* 4vw on smaller screens */
--base-padding-x: max(5vw, 40px);                      /* 6vw / 60px ≥1600px */
--base-padding-y: clamp(30px, 4vw, 50px);
--global-border-radius: 20px;                          /* 15px / 10px at breakpoints */
```

Breakpoints: `1600`, `1200`, `1000`, `812`, `560`, `480`, `400`, `380` px. Sections are full-viewport panels with generous negative space; the 3D canvas is always behind, and DOM content floats above it with mix-blend/contrast rules.

### Motion language

- Damped virtual scroll (wheel/touch) rather than native scrolling — slow, heavy, cinematic.
- Preloader with animated percentage; WebGL wipe transitions between routes.
- Scroll-driven camera moves, tunnel fly-throughs, particle fields, morphing typography.
- Hover-reactive project cards with 3D previews and depth maps.
- Custom cursor, magnetic buttons, and UI sound effects on hover/click.
- Post-processing: bloom, blur, SMAA; `.exr` matcaps for the glossy 3D crosses.

---

## Verification

Captured and checked at 1440×900 and iPhone 13:

- Home, About, Projects, and all 19 project pages load with zero local 404s.
- Home scroll sections, footer, and next-page hand-off render.
- Header menu, project-card routing, and back navigation work.
- All local images, videos, fonts, models, and audio resolve.
- Only external failures are the two Vimeo embeds (Vimeo-side 404) and analytics — not local assets.

Reference images are in `screenshots/`.

---

## Notes

- This is a **mirrored production build**, not the original Astro source. The original components, shaders, and build config are not public. The HTML is fully editable, but rebuilding from components would require the original source.
- The underlying content, case-study media, and 3D assets remain © Lusion Creative Studio. The Lumina Studio branding is a local rename for study/reference; this is not affiliated with or endorsed by Lusion.
- The original site is © Lusion Creative Studio — https://lusion.co
