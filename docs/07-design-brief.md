# Aquarium Tracker App — Design Brief
_Built from your 3 UI-style references + your blue palette reference. Hand this whole file to Claude Code as context before it writes any UI code._

**Correction from the last version:** this is an aquarium tracker, not a plant care app — that's exactly why blue was the right call, not a departure from anything. The reference screenshots were style references only (dashboard layout, card patterns, glassmorphism treatment, onboarding flow), not literal subject matter — everywhere below that said "plant," swap in fish/livestock/water. This also connects directly to the freshwater/brackish fish, plant, shrimp, and snail database (465 species) we already built earlier in this conversation — that's very likely the backend content this UI is meant to display.

## What's actually going on in these references
These are Figma-style marketing mockups: real photography, phone-bezel framing, glassmorphism panels. A code-generation tool never invents photography — it writes CSS/markup. If you ask for "make it look premium" with no photography, palette, or type direction, it falls back to its defaults: a rounded card, a grey shadow, a gradient. That's most of the gap you're seeing.

## Palette — blue (your reference, and the correct call for an aquarium app)
`#021024` near-black navy ink · `#052659` deep navy blue · `#5483B3` steel blue · `#7DA0CA` light blue-grey · `#C1E8FF` pale sky blue

Water is blue — this palette needs no justification the way it would've for a plant app. Tonal navy-to-sky range reads as "aquarium," not as a generic SaaS gradient, as long as you keep it tonal (one hue family, varying only in depth/lightness) rather than reaching for a flat two-stop indigo gradient.

## What each reference screen maps to for an aquarium app
Reinterpret the UI *patterns*, not the plant content:

| Reference element | Aquarium equivalent |
|---|---|
| "Research Center" dashboard overview | Tank/Aquarium Dashboard |
| "Environment: Temperature / Humidity / CO2 — Optimal" | Water Parameters: Temp / pH / Ammonia (or Nitrite/Nitrate) — Optimal |
| "Growth Dynamics / Nutrient Response / Stress Tolerance" mini-charts | Water param trends, feeding schedule adherence, livestock health/stress indicators |
| "Arabidopsis thaliana — Healthy — Growth Rate +18.6%" species detail | A specific fish/plant/shrimp/snail from your database — Healthy — growth or bioload trend |
| "Biomass / Leaf Area" stats | Length/weight (fish), bioload (tank), or population count (shrimp/snail colony) |
| "Team · 5 members · 2 online" | Tank co-owners / shared aquarium members, if multi-user |
| "AI Plant Scan — Identify any plant in seconds" | **AI Species ID** — photograph a fish/plant and match it against your 465-species database. This is a very natural feature given the database already exists. |
| "Recent Identifications: Monstera Deliciosa" | Recent scans: e.g. "Neon Tetra," "Java Fern" |

## Photography direction (this is where it gets easy — you already have the pipeline)
Real photography is still the biggest lever for the "expensive" feel, and you're in an unusually good position here: the `scrape_sites.py` / `match_and_download.py` pipeline we built earlier pulls real product photography for every species in your database. That's not just for a spreadsheet — those images are exactly the hero photography this UI needs (species detail cards, tank livestock thumbnails, onboarding hero shots, the "AI Scan" result cards). Color-grade or lightly duotone them toward navy/steel-blue for visual consistency across photos sourced from different retailers.

## Extracted palettes from your original 3 UI-style references (for typography/layout reference only — ignore the colors, use the blue palette above)

**Ref 1 — glassmorphism / frosted dashboard style**
`#2d4b1d` · `#587444` · `#6f8668` · `#85967a` · `#bac2b6` · `#545450`

**Ref 2 — stats dashboard style**
`#393a17` · `#e9e6d8` · `#8f9146` · `#b5b28a` · `#776a38`

**Ref 3 — AI-scan onboarding flow style**
`#131f12` · `#e6ecde` · `#3d5d28` · `#305144` · `#7d9580`

## Suggested unified token system
- **Background:** `#F3F8FD` (near-white with a whisper of blue) — light-mode base, same feel as Ref 1–3's off-white
- **Ink/text:** `#021024` (near-black navy, never pure `#000`)
- **Primary accent:** `#052659` (deep navy) — buttons, headlines, key UI
- **Secondary/muted:** `#5483B3` (steel blue) — secondary actions, active states
- **Tertiary/muted:** `#7DA0CA` (light blue-grey) — borders, disabled states, chart gridlines
- **Light accent:** `#C1E8FF` (pale sky) — highlight fills, chart bars, success/positive states
- **Glass surface:** white at 60–75% opacity + `backdrop-filter: blur(20px)`, very faint navy tint if you want it to read as "blue glass" rather than neutral glass
- **Radius:** 20–28px on major cards — pick one value and hold it everywhere
- **Shadow:** soft and *colored*, not grey — `rgba(5,38,89,0.10)`, large blur, low opacity

**Optional dark-mode direction:** the reference image itself is a moody navy gradient poster (light sky blue at top fading to near-black navy at bottom). If you want a dark-first app rather than light-with-glass-cards, flip the roles: `#021024`/`#052659` as background, `#C1E8FF`/`#7DA0CA` as text and accents, glass panels in white-at-8–12%-opacity instead of 60–75%. Pick one direction (light or dark) as primary — don't try to support both equally well on a first pass.

## Typography
The references use a clean geometric/humanist sans — not a decorative font, not the browser-default `system-ui` fallback shadcn ships with. Pick ONE distinctive family:
- Inter, Plus Jakarta Sans, General Sans, or Switzer (Fontshare) all fit this register
- Confident headline sizes (32–40px), tight line-height, generous body text
- Don't reach for a second typeface for "personality" — weight and size do that job here

## The techniques doing the actual work (in order of impact)
1. **Real photography as material.** You already have this pipeline built — use the retailer-scraped species photos (fish, plants, shrimp, snails) as hero material for tank/species cards, lightly duotoned toward navy/steel-blue for consistency. This is the single biggest lever — no CSS trick replaces it.
2. **Glassmorphism is just CSS**, but it needs something rich behind it to blur. Semi-transparent panel + `backdrop-filter: blur()` over a photo, not over a flat color.
3. **A narrow, disciplined palette** (the 5 blues above, used consistently) — not a flat, saturated default "SaaS blue" gradient. Tonal range (navy → steel → sky) reads as considered; a two-stop indigo-to-purple gradient reads as a template.
4. **One consistent radius + soft colored shadow**, applied deliberately, not maxed out everywhere.
5. **Small polished details**: status pills, sparkline charts, avatar clusters, progress rings — these read as "considered" more than any big flourish does.
6. **Restraint.** Not every card needs a shadow. Not every element needs decoration. Quiet supporting elements make the one bold thing land.

## Checklist: the tells that make UI read as "AI-generated" (avoid these)
- Warm cream background + terracotta/orange accent as the default "premium" palette
- The "SaaS card kit": identical rounded cards, one border-radius on everything, same flat grey shadow under each, gradient washes as decoration
- Tracked-out ALL-CAPS eyebrow labels above every heading
- Meta text joined with middots (`A · B · C`)
- A `→` tacked onto every button/link
- Fade-and-slide-up animation on every section, hover effects on every card

## How to actually prompt Claude Code
1. **Attach your 3 UI-style references + this brief** in your first message — don't describe the look in words alone. Be explicit that they're style references (layout, glass treatment, palette), not literal content — Claude Code otherwise may build plant-specific copy/icons by taking the screenshots too literally.
2. **Ask for two passes, not one shot**: first a design-token plan (palette/type/layout/principles) for you to approve, *then* the build. One-shotting the whole UI is exactly how you get generic defaults.
3. **Feed it real species photography** from your scraped catalog — hand it actual file paths or URLs, matched to the blue palette above.
4. **Clarify browser webapp vs. mobile-style reference.** These are phone-bezel mockups; decide explicitly whether you want that literal framing or just the visual language (glass cards, palette, type) applied to real browser layouts.
5. **Iterate with screenshots**, not one big prompt. Build one screen, screenshot it, compare against the reference, refine. Skip this and it drifts back to defaults.
6. **Check Claude Code's Skills support** — if it's on a recent version, you can add a design-system skill file to your repo (palette, type, radius, shadow rules) that it reads automatically before generating any UI, so you're not re-explaining this brief every session.
