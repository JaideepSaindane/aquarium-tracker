# UI/UX Redesign Brief (source document)

> Saved verbatim from Jaideep's consolidated redesign strategy, shared 2026-09-12.
> The execution plan that turns this into ordered work lives at `specs/REDESIGN-2026-09.md` —
> three scoping decisions were settled with Jaideep the same day and are recorded there
> (themes: both with dark default; nav label: "My Tanks" stays; localization: readiness only).

---

# AquaAI — Final UI/UX Redesign Strategy

### Implementation-ready design brief for Claude Code

This is the consolidated version of the review, combining the strongest points from the existing app, my review, and Gemini's review. The goal is to turn the feedback into an **ordered implementation plan that Claude Code can execute piece by piece**, rather than a collection of subjective design comments.

The guiding principle is:

> **AquaAI should feel like a calm, premium aquarium companion — not a dashboard, not a database, and not a generic AI chatbot.**

The product already has strong ingredients: aquarium photography, tank management, species discovery, AI assistance, health checks, community and journaling. The main problem is **coherence**. Many individual components are reasonable, but the overall product currently feels like an MVP where every feature has been given its own card, button and visual treatment.

---

# PART 1 — GLOBAL THINGS TO FIX ACROSS THE APP

These should be addressed **before redesigning individual screens**.

---

## 1. Establish one visual system

The app currently has too many visual treatments for similar interactions.

We need a single design language covering:

* colors
* typography
* spacing
* corner radius
* buttons
* inputs
* cards
* tabs
* segmented controls
* list rows
* icons
* states
* navigation
* empty states
* error states
* loading states

Claude Code should create/reuse shared components rather than styling each screen independently.

### Design principle

**Familiar UX patterns + distinctive AquaAI visual identity.**

Use standard interaction patterns, but don't make the product look like a generic Material/iOS template.

---

## 2. Stop putting everything inside cards

This is probably the biggest visual issue in the entire app.

The current design repeatedly uses:

> rounded rectangle + border + dark fill + another rounded rectangle + another border

This creates excessive visual weight.

### New rule

Use these in this order of preference:

**Whitespace → divider → subtle surface → card → border**

A card should communicate that something is a distinct object, decision or important piece of information.

It should not merely be a container around every section.

### Example

Instead of:

```text
┌─────────────────────────┐
│ FISH              Add ▼ │
└─────────────────────────┘

┌─────────────────────────┐
│ GALLERY           Add ▼ │
└─────────────────────────┘

┌─────────────────────────┐
│ JOURNAL           Add ▼ │
└─────────────────────────┘
```

Prefer:

```text
FISH                              4  ›

────────────────────────────────────

GALLERY                           1  ›

────────────────────────────────────

JOURNAL                           1  ›
```

This one principle should be applied throughout the app.

---

## 3. Inputs need to visibly look like inputs

This is a genuine usability/accessibility issue, not merely an aesthetic preference.

Some current input fields are so close to the surrounding dark surfaces that they can look disabled. Gemini also flagged the dark-on-dark form treatment as a major problem. 

### New input system

**Default**

* surface: `#1C2627`
* border: `#334344`
* text: `#F3F6F5`
* placeholder: `#7F8D8C`

**Focused**

* border: Aqua `#35C6BE`
* optionally a subtle focus glow

Inputs should never visually disappear into the background.

---

## 4. Use fewer borders

Borders should communicate structure, not decoration.

Avoid outlining:

* every field
* every card
* every section
* every row

Use subtle dividers where possible.

---

## 5. Reduce the amount of cyan

The turquoise is good.

The problem is that it currently communicates too many things:

* primary action
* selected state
* navigation
* links
* important text
* status
* accents
* promotional elements

This makes everything compete for attention.

### Aqua becomes a controlled semantic color

Use it primarily for:

* primary action
* active navigation
* active selection
* links
* AquaAI identity

Use green for health.

Use yellow for warnings.

Use coral/red for destructive/urgent states.

The same principle is reflected in Gemini's recommendation to use the cyan more strictly as an accent. 

---

## 6. Recommended global palette

### Background

`#0B1112`

### Surface

`#151D1E`

### Elevated surface

`#1C2627`

### Divider / border

`#293637`

### Primary text

`#F3F6F5`

### Secondary text

`#9BA9A8`

### Muted text

`#71807F`

### Aqua / primary

`#35C6BE`

### Healthy

`#65C98B`

### Warning

`#E7B75E`

### Danger

`#E77967`

Don't introduce lots of additional colors without a semantic reason.

---

## 7. Typography system

Use one highly legible sans-serif family throughout.

Inter, SF Pro, Roboto or an equivalent is appropriate.

Recommended scale:

| Element       |    Size |
| ------------- | ------: |
| Display       |    32px |
| Screen title  |    28px |
| Section title |    20px |
| Body          |    16px |
| Secondary     |    14px |
| Caption       | 12–13px |

The current UI often makes both primary and secondary text large and bold.

### New principle

> **Only the information that deserves attention should look important.**

Don't make everything bold.

---

## 8. Standardize spacing

Use an 8-point spacing system.

Primary values:

`4 / 8 / 12 / 16 / 24 / 32 / 40`

Avoid arbitrary spacing.

This should become part of the shared design tokens.

---

## 9. Standardize corner radii

Use a smaller set of radii:

* Input: **12px**
* Standard card: **16px**
* Large surface: **20px**
* Pills: **999px**

The current app uses large rounded corners almost everywhere, which contributes to the "everything is a floating pill/card" appearance.

---

## 10. Standardize buttons

### Primary

Solid Aqua.

Examples:

**Continue**

**Save tank**

**Check tank**

### Secondary

Dark surface / subtle border.

### Tertiary

Text button.

Not every action should be a giant pill.

The visual size of a button should correspond to the importance of the action.

---

## 11. Make status communicate meaning, not just color

Never have:

> ● Healthy

with no explanation.

Prefer:

**Healthy**
`4 key parameters look good`

or:

**Needs attention**
`Ammonia hasn't been checked recently`

This is especially important for a product whose promise is grounded, trustworthy advice.

---

## 12. Accessibility becomes a launch requirement

Claude Code should explicitly check:

### Contrast

Especially:

* secondary text
* inputs
* destructive states
* muted labels

### Touch targets

Icon controls should have sufficiently large hit areas even if the visible icon is small.

### Color independence

Don't communicate meaning through color alone.

For example:

**✓ Healthy**

rather than just a green dot.

### Text scaling

Layouts must survive larger accessibility font sizes.

---

## 13. Globalization must affect the architecture

Don't treat localization as replacing English strings later.

The UI needs to accommodate:

* longer translations
* shorter translations
* German compound words
* Hindi / Marathi
* Arabic and RTL
* Thai
* Japanese
* different date conventions

AI responses and community posts especially need flexible vertical sizing.

Gemini specifically called out longer-language layouts and RTL support as things the AI/chat experience should anticipate. 

---

## 14. Support international units

For tank measurements:

* cm / inches
* liters / gallons
* °C / °F

Volume should automatically calculate from dimensions.

Ideally show the equivalent value without forcing the user to do conversion manually.

For example:

**54.9 L · 14.5 gal**

Metric/imperial support should exist throughout the product, not just on the Add Tank screen. 

---

## 15. Dates must be locale aware

Don't hard-code display formats.

Use the user's locale/device settings for:

* dates
* time
* relative time
* temperature
* units

Gemini correctly flagged localization of date formats as a global requirement. 

---

## 16. Don't make AI the entire product

This is strategically important.

The product is **not an AI chatbot with aquarium features**.

It should feel like:

> **An aquarium management product made dramatically better by AI.**

Therefore:

**Tank → Fish → Health → Knowledge**

should remain more important than:

**Chat → Chat → Chat**

---

## 17. New product hierarchy

Every major surface should fit into this hierarchy:

### Level 1 — My aquarium

My tanks, fish, water, health.

### Level 2 — Understand my aquarium

Species, parameters, photographs, journal.

### Level 3 — Get help

AquaAI and Health Check.

### Level 4 — Community

Learn from other aquarists.

This prevents the product from feeling like unrelated features placed in one app.

---

## 18. Navigation redesign

Current:

**Dex | My Tanks | Ask Aqua | Community | My Profile**

Recommended:

### **Tanks | Discover | Ask Aqua | Community | Profile**

### Tanks

The actual home/dashboard.

### Discover

Species + aquarium knowledge.

### Ask Aqua

AI expert.

### Community

Social.

### Profile

Identity + preferences + account.

I would rename **Dex → Discover**.

"Dex" is understandable, but it introduces gaming terminology that isn't necessary for a global consumer product.

---

# PART 2 — SCREEN-BY-SCREEN REDESIGN

The screens should now be tackled in the following order.

---

# SCREEN 1 — MY TANKS / HOME

## Objective

This is the user's home.

It should answer immediately:

> **How are my aquariums doing?**

---

## Problems

### Critical

The "Emergency" messaging has too much prominence.

### High

The greeting and background image compete with one another.

### High

The tank itself isn't receiving enough hierarchy relative to the surrounding UI.

### Medium

Quick actions are visually disconnected from the main tank experience.

Gemini also identified the overlapping header treatment and emergency presentation as major issues. 

---

## New structure

```text
Good evening, Jaideep

Your aquariums

[ LARGE TANK PHOTO ]

2ft planted tank
54.9 L · Freshwater

● Healthy

4 fish · 27–28°C


Tanks / actions below
```

The greeting should be small.

The tank should be the hero.

---

## Emergency

Replace:

> Something wrong with a fish right now?
> Emergency →

with:

### Need help?

**Something doesn't look right?**

`Get help →`

The word **Emergency** should exist inside an urgent diagnostic flow, not dominate the ordinary home experience.

---

## Tank card

The image should occupy most of the card.

Below it:

**2ft planted tank**

`54.9 L · Freshwater · Planted`

**● Healthy**

`4 fish · 27–28°C`

Don't add unnecessary controls inside the card.

---

## Actions

Provide a simple action row underneath:

**Add tank**

**Help me build a tank**

**Ask Aqua**

Only if these actions are genuinely useful at this point in the user's journey.

---

# SCREEN 2 — TANK DETAIL

## Objective

This should become the **most important screen in the product**.

The mental model should change from:

> Fish / Gallery / Journal

to:

> **How is my aquarium doing?**

---

## Problems

### High

The current Size / Volume / Temp metrics have weak hierarchy.

### High

Fish/Gallery/Journal accordions are visually heavy.

### High

"Healthy" lacks enough context.

### Medium

"Created 12 Sept 2026" has too much prominence for its value.

Gemini similarly recommends restructuring the metrics and simplifying the lower sections. 

---

## New layout

```text
←                         ⋯

2ft planted tank       Freshwater

● Healthy
4 key indicators look good


[ LARGE AQUARIUM PHOTO ]


54.9 L             27.4°C
61 × 30 × 30 cm


Water

pH                       7.2 ✓
Ammonia                  0 ✓
Nitrite                  0 ✓
Nitrate                  15 ✓


Fish                         4 ›
Photos                       1 ›
Journal                      1 ›


[ Check tank health ]
```

---

## Metrics

Don't show:

> Size | Volume | Temp

with equal visual weight.

Instead:

### Primary metrics

**54.9 L**

**27.4°C**

Then a smaller line:

`61 × 30 × 30 cm`

This creates clearer hierarchy.

---

## Health

Health should explain its status.

Example:

**● Healthy**

`Water parameters currently look good`

Then allow:

**View details →**

---

## Bottom sections

Turn Fish / Gallery / Journal into simple rows.

The user doesn't need three giant bordered accordions.

---

# SCREEN 3 — HELP ME BUILD A TANK

## Objective

Make this a genuinely beginner-friendly guided setup.

---

## Problems

The existing flow is understandable, but it feels heavier than the decision requires.

The selected state can also be modernized and the CTA is visually disconnected from the content. Gemini identified the CTA/card relationship and inconsistent icon styling as issues. 

---

## New layout

```text
←   Build your tank

1 of 3

What are you building?


🌿  Planted
    Live plants + aquascape

🪨  Hardscape
    Rocks + driftwood

○   Bare bottom
    No substrate
```

Then:

**Continue**

Don't write:

> Next — what fish do you want?

The system already knows what the next step is.

"Continue" is cleaner and more universally understood.

---

## Selection state

Inactive:

Subtle surface.

Selected:

* Aqua border
* slightly tinted surface
* checkmark

Avoid giant cyan fills.

---

## Beginner assistance

Add:

**Not sure?**

This could reveal a brief explanation.

The goal is to make terms like "hardscape" understandable without cluttering the main UI.

---

# SCREEN 4 — ADD NEW TANK

## Objective

Collect essential information without making tank creation feel like filling out a database record.

---

## Problems

### Critical

Inputs don't have enough visual separation from the background.

### High

Too much information on one page.

### High

Dimensions controls feel unnecessarily awkward.

### Medium

The top circular fish image feels decorative rather than useful.

Gemini identified the input contrast, dimensions control and top illustration as specific issues. 

---

## New layout

```text
← New tank                         Save


Your aquarium

[ Add tank photo ]


Name

[ Living Room 60L ]


Dimensions

[ 61 ] [ 30 ] [ 30 ]

cm / in


Volume

54.9 L · 14.5 gal


Water

[ Freshwater ] [ Brackish ]


More details ›

Established
Location
```

---

## Important

Don't force users to specify everything.

### Essential:

* name
* dimensions
* water type

### Secondary:

* photo
* location
* established date

This makes tank creation much faster.

---

## City

Don't make City feel like a fundamental tank field.

Only request location where it provides real product value, such as environmental/water personalization.

---

# SCREEN 5 — ASK AQUA

## Objective

Make the AI feel like an **aquarium expert who knows the user's tank**, not a generic chatbot.

---

## Problems

### High

The Early Bird promotional area competes with the chat input.

### High

Too much unused vertical space.

### Medium

Large centered suggestion buttons feel heavy.

### Medium

The category selector is more prominent than necessary.

Gemini similarly recommends cleaning the chat input area and reducing the large empty/suggested-content treatment. 

---

## New empty state

```text
Your aquarium expert

Ask about your fish, water or setup.

2ft planted tank · 54.9 L · 27–28°C


Suggested questions

Can I add another fish?

Why is my Molly hiding?

Is my tank cycled?


[ Ask about your aquarium...       ➤ ]
```

---

## Crucial principle

The AI should use tank context visibly.

Instead of merely saying:

> Ask me anything.

it should communicate:

> **I know your aquarium.**

That is part of AquaAI's product differentiation.

---

## Input

The composer should be clean.

No promotional copy directly above/inside it.

The Early Bird message can move to Profile → Plan or become a dismissible announcement.

---

# SCREEN 6 — SPECIES DEX → DISCOVER

## Objective

Turn the species database into a beautiful aquarium encyclopedia rather than a game-like locked collection.

---

## Navigation

Rename:

**Dex**

to:

**Discover**

Rename:

**My Fish**

to:

**My Species**

---

## Current problem

"4 of 1484 unlocked" introduces an unnecessary gaming mentality.

---

## New framing

```text
Discover

My species     Explore


[ Search species... ]


Fish      Shrimp      Snails      Plants
```

"My species" shows owned/added species.

"Explore" shows the catalogue.

---

## Species card

```text
[ REAL PHOTO ]

Betta
Fish · Beginner

›
```

For added species:

**✓ Added**

For unadded species:

subtle neutral state.

Avoid dramatic padlocks.

Gemini also recommends softer locked states and identifies the current treatment as unnecessarily punitive. 

---

## Most important visual change

Use actual species imagery wherever possible.

The generic placeholder fish graphics make the database look unfinished.

The Species experience could become one of the most visually beautiful parts of the app.

---

# SCREEN 7 — COMMUNITY

## Objective

Make Community feel like a living aquarium community, not a list of giant database cards.

---

## Problems

### Medium

Post cards are too large.

### Medium

Too much internal padding.

### Medium

Likes/comments are visually understated.

### Medium

Translate isn't visually obvious as an action.

Gemini also recommends reducing card padding/outlines and making social interactions easier to discover. 

---

## New feed

```text
Community

For You    Following    Local


Jaideep · 2h

How do I check TDS?

♡ 4    💬 2

────────────────────────────────────

Sarah · 5h

[ Aquarium image ]

My planted tank after 6 months

♡ 19    💬 5
```

---

## Cards

Don't outline every post heavily.

Use:

* whitespace
* dividers
* subtle surfaces for image posts

Text posts can be very compact.

---

## Translation

Keep translation. It is a major global opportunity.

Instead of:

**Translate**

use:

**Translated from Marathi · Show original**

This makes the functionality self-explanatory.

---

## New Post

A FAB can work here because posting is genuinely the primary creation action.

However, don't blindly apply FABs everywhere. Action placement should depend on context.

---

# SCREEN 8 — PROFILE

## Objective

Make Profile about the person, not a giant editable form.

---

## Problems

The current profile page dedicates too much space to fields that users rarely edit.

Everything appears equally important.

---

## New layout

```text
Profile


[ Avatar ]

Jaideep
@jd_aquatic

Edit profile ›


Preferences

Language                    English ›
Appearance                   Dark ›


Plan

Early Bird                  Active ›


Account

Export data                     ›
Sign out                        ›


Danger zone

Delete account                  ›
```

---

## Profile editing

Move actual editable fields into:

**Edit profile**

Don't make every field permanently look editable.

---

# SCREEN 9 — SETTINGS

## Objective

Make Settings scannable and conventional.

---

## Replace giant controls

Current language and appearance controls are visually oversized.

Gemini specifically flags these as disproportionately large and recommends standard segmented controls/submenus. 

---

## New structure

### Preferences

**Language**
English ›

**Appearance**
Dark ›

### Notifications

Only if/when notifications actually exist.

### Account

**Export data** ›

**Sign out** ›

### Danger zone

**Delete account** ›

---

## Language

"Hinglish" can remain as an option for the relevant audience, but should not dictate the global architecture.

The actual language selector should eventually support a broader locale list.

---

# SCREEN 10 — SIGN OUT / DELETE ACCOUNT

These should not be oversized standalone cards.

## Sign out

Use a conventional destructive action.

## Delete account

Separate it visually inside:

### Danger zone

Then require confirmation.

The destructive hierarchy should be:

**Normal → destructive → irreversible**

rather than making the entire settings screen feel threatening.

---

# SCREEN 11 — ONBOARDING

## Objective

Get the user to the product's first meaningful value as quickly as possible.

---

## Current problem

The onboarding screen tries to do too much:

* marketing
* name
* city
* language
* theme
* preferences
* visual customization

It feels like a settings screen pretending to be onboarding.

---

# New onboarding flow

## Screen 1

### Welcome to AquaAI

**Your aquarium's AI companion.**

Take a photo of your tank.
Understand your fish.
Keep your aquarium healthy.

**Get started**

---

## Screen 2

### What should we call you?

`Your name`

**Continue**

---

## Screen 3

### Tell us about your aquarium

or ideally:

### Show us your aquarium

Allow the user to begin with a photo.

This creates the first emotional/product moment.

---

## Screen 4

### Set up your tank

Collect:

* tank name
* dimensions
* water type

Everything else can come later.

---

## Language and Theme

Move these into:

**Settings**

rather than onboarding.

The current onboarding puts too many unrelated controls in one place.

---

# PART 3 — DESIGN COMPONENT RULES FOR CLAUDE CODE

Claude Code should implement these as reusable components/tokens rather than repeatedly recreating styles.

---

## Buttons

### PrimaryButton

* Aqua fill
* dark text
* 48–52px height
* 12–16px radius

### SecondaryButton

* surface fill
* subtle border

### TextButton

* Aqua text
* no container

---

## Inputs

### TextInput

* clearly visible fill
* subtle border
* strong focus state
* accessible contrast
* flexible height for localization

---

## Choice cards

Use only where the decision itself deserves a visual card.

Selected:

* Aqua border
* slightly tinted surface
* checkmark

Unselected:

* subtle surface
* no aggressive border

---

## List rows

Use for:

* Fish
* Gallery
* Journal
* Settings
* Account
* Profile options

Structure:

```text
Icon / label
Secondary metadata                 ›
```

---

## Status

Standard component:

**StatusIcon + StatusLabel + Explanation**

Examples:

`✓ Healthy — 4 indicators look good`

`! Needs attention — Ammonia needs checking`

---

# PART 4 — WHAT NOT TO DO

Claude Code should explicitly avoid these patterns.

### Don't add more cards to solve hierarchy problems.

### Don't add more colors.

### Don't make every action turquoise.

### Don't make every screen extremely rounded.

### Don't put important text over busy photography without a deliberate contrast treatment.

### Don't use huge controls where a simple list row will do.

### Don't make every page look like a dashboard.

### Don't introduce features while doing the redesign.

### Don't change functionality unless there is a UX reason.

### Don't replace good aquarium imagery with generic illustrations unnecessarily.

### Don't make Species Dex look like a game unless we deliberately decide to gamify it later.

### Don't make AquaAI look like generic ChatGPT.

---

# PART 5 — IMPLEMENTATION ORDER FOR CLAUDE CODE

This is the order I recommend actually executing the work.

---

## PHASE 0 — DESIGN FOUNDATION

Before changing screens:

### Task 0.1

Create global design tokens.

### Task 0.2

Create typography scale.

### Task 0.3

Create spacing scale.

### Task 0.4

Create radius system.

### Task 0.5

Create button components.

### Task 0.6

Create input components.

### Task 0.7

Create tabs/segmented controls.

### Task 0.8

Create list-row component.

### Task 0.9

Create status component.

### Task 0.10

Create consistent icon sizing/touch targets.

**Acceptance criterion:** no screen should need to invent its own version of these primitives.

---

## PHASE 1 — NAVIGATION + HOME

### Task 1.1

Change navigation architecture to:

**Tanks | Discover | Ask Aqua | Community | Profile**

### Task 1.2

Redesign My Tanks.

### Task 1.3

Remove visually dominant Emergency messaging.

### Task 1.4

Make tank photography the visual hero.

**Acceptance criterion:** A first-time user should immediately understand that Tanks is the primary destination.

---

## PHASE 2 — TANK EXPERIENCE

### Task 2.1

Redesign Tank Detail.

### Task 2.2

Replace accordion/card sections with list rows.

### Task 2.3

Redesign metrics.

### Task 2.4

Improve Health status explanation.

### Task 2.5

Make Health Check a meaningful action.

**Acceptance criterion:** Tank Detail should communicate aquarium health before database content.

---

## PHASE 3 — ONBOARDING + TANK CREATION

### Task 3.1

Simplify onboarding.

### Task 3.2

Separate preferences from onboarding.

### Task 3.3

Redesign Help Me Build a Tank.

### Task 3.4

Redesign Add New Tank.

### Task 3.5

Fix input accessibility.

### Task 3.6

Implement metric/imperial support correctly.

**Acceptance criterion:** a new user can create a tank with minimal friction.

---

## PHASE 4 — DISCOVER / SPECIES

### Task 4.1

Rename Dex → Discover.

### Task 4.2

Redesign My Species / Explore.

### Task 4.3

Implement cleaner search/filter architecture.

### Task 4.4

Replace placeholder species imagery where possible.

### Task 4.5

Tone down locked states.

**Acceptance criterion:** Discover feels like an aquarium encyclopedia, not a gamified database.

---

## PHASE 5 — ASK AQUA

### Task 5.1

Redesign empty state.

### Task 5.2

Clean the chat composer.

### Task 5.3

Remove Early Bird promo from composer area.

### Task 5.4

Add visible tank context.

### Task 5.5

Convert large suggested buttons into lightweight suggestions/chips.

**Acceptance criterion:** AquaAI feels like a specialist aquarium assistant that understands the user's tank.

---

## PHASE 6 — COMMUNITY

### Task 6.1

Reduce post card weight.

### Task 6.2

Improve feed density.

### Task 6.3

Improve Like/Comment affordances.

### Task 6.4

Improve translation UX.

### Task 6.5

Add FAB only if appropriate to the existing interaction model.

**Acceptance criterion:** the feed should feel alive and easy to scan.

---

## PHASE 7 — PROFILE + SETTINGS

### Task 7.1

Separate profile from settings conceptually.

### Task 7.2

Move editing into Edit Profile.

### Task 7.3

Convert settings into list-based architecture.

### Task 7.4

Clean up plan presentation.

### Task 7.5

Create proper Danger Zone.

### Task 7.6

Fix language architecture.

---

## PHASE 8 — FINAL POLISH

Only after the previous phases:

### Accessibility audit

### Localization audit

### RTL audit

### Empty states

### Error states

### Loading states

### Responsive text scaling

### Animation/transitions

### Touch targets

### Micro-interactions

### Image treatment

This should be the final layer, not the starting point.

---

# PART 6 — OVERALL PRODUCT DESIGN SCORE

After reviewing the complete experience:

| Category                 | Current |   Target |
| ------------------------ | ------: | -------: |
| Visual Design            |    7/10 | **9/10** |
| Usability               |    7/10 | **9/10** |
| Information Architecture |  6.5/10 | **9/10** |
| Accessibility            |    6/10 | **9/10** |
| Global Appeal            |  6.5/10 | **9/10** |

The target isn't achieved by adding complexity.

It is achieved by **removing unnecessary complexity**.

---

# THE TOP 10 CHANGES THAT MATTER MOST

If implementation time becomes constrained, these are the priorities:

### 1.

**Create the design system before redesigning screens.**

### 2.

**Reduce excessive cards and borders throughout the product.**

### 3.

**Make Tank Detail the product's central health dashboard.**

### 4.

**Make My Tanks tank-first rather than greeting-first.**

### 5.

**Simplify onboarding dramatically.**

### 6.

**Fix input contrast and accessibility everywhere.**

### 7.

**Make AquaAI contextual to the user's actual aquarium.**

### 8.

**Turn Species Dex into a premium Discover/encyclopedia experience.**

### 9.

**Turn Profile/Settings into a clean list-based settings architecture.**

### 10.

**Treat localization, units, dates, RTL and text expansion as architecture requirements.**

---

# FINAL PRODUCT DIRECTION

The current AquaAI has **good functionality and a promising identity**.

What it lacks is a strong enough design philosophy tying everything together.

The final product should feel like this:

> You open AquaAI and immediately see your aquarium.
>
> You understand its current health.
>
> You can inspect your fish and water.
>
> When you have a question, AquaAI already knows your tank.
>
> When you want to learn, Discover gives you the broader aquarium world.
>
> When you want other humans, Community is there.
>
> Everything else stays quiet until you need it.

That should be the product experience.

### The single most important shift

**From:**

> "Here are all the features AquaAI has."

**To:**

> **"Here is your aquarium. We're helping you take care of it."**

That is the design direction I would hand directly to Claude Code and use as the basis for the redesign.
