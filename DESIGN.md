---
name: Al Mashriq Trading (public website)
description: Corporate Japanese vehicle exporter with a marketplace stock list; white and navy, muted gold accent.
colors:
  navy: "#10243a"
  navy-hi: "#1c3a5a"
  navy-deep: "#0b1a2b"
  steel: "#315a78"
  gold: "#c5a15a"
  gold-hover: "#d4b273"
  gold-on-navy-text: "#dcc28e"
  page: "#f5f6f8"
  surface: "#ffffff"
  tint: "#eef2f6"
  ink: "#0a0a0c"
  ink-2: "#33363d"
  ink-3: "#555a63"
  ink-4: "#6b7079"
  ink-on-navy: "#f4f6f8"
  whatsapp: "#25D366"
typography:
  display:
    fontFamily: "Manrope, Plus Jakarta Sans, Noto Sans JP, system-ui, sans-serif"
    fontSize: "2.6rem"
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Manrope, Plus Jakarta Sans, Noto Sans JP, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 900
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Manrope, Plus Jakarta Sans, Noto Sans JP, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 800
    lineHeight: 1.375
  body:
    fontFamily: "Manrope, Plus Jakarta Sans, Noto Sans JP, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Manrope, Plus Jakarta Sans, Noto Sans JP, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.33
    letterSpacing: "0.05em"
  price:
    fontFamily: "Manrope, Plus Jakarta Sans, Noto Sans JP, system-ui, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 800
    lineHeight: 1.25
    fontFeature: "tnum"
rounded:
  badge: "8px"
  control: "12px"
  card: "16px"
  panel: "24px"
  pill: "9999px"
spacing:
  gutter-phone: "16px"
  gutter-desktop: "24px"
  card-pad: "14px"
  panel-pad: "20px"
  section-gap: "48px"
components:
  button-primary:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.navy-hi}"
  button-gold:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.navy}"
    rounded: "{rounded.control}"
    padding: "0 24px"
    height: "48px"
  button-gold-hover:
    backgroundColor: "{colors.gold-hover}"
  button-whatsapp:
    backgroundColor: "{colors.whatsapp}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "48px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "48px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-pad}"
  price-panel:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "16px"
  badge-new-arrival:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.navy}"
    rounded: "{rounded.badge}"
    padding: "2px 8px"
  nav-bar:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.surface}"
---

# Design System: Al Mashriq Trading (public website)

Scope: the public website only (`src/app/(site)/` and `src/components/site/`), everything inside the `.site-glass` wrapper. The staff ERP under `src/app/admin` keeps its own logo-red and cerulean look, driven by the shared Tailwind `brand` / `navy` / `cerulean` scales, and is out of scope here. On the public site those shared scales are remapped in `site.css` to the navy, steel and gold below. Invoices and the ERP stay red.

## Overview

**Creative North Star: "The Export House Ledger"**

The site reads like an established Japanese trading house that also runs a busy stock floor. Deep navy carries authority: the top strip, the desktop menu bar, the home hero band, the price panel and the footer. The working surfaces stay light and dense: a cool grey page (#f5f6f8) holding white cards, each a real car with a stock number, photos, four facts and an FOB price. Muted gold is the house's seal. It shows up as rules, hairlines, the route line of the buying journey, icons on navy, and the one gold button that starts a search or a quote.

Density follows the marketplace, not the brochure. Phones show stock as compact rows (photo left, facts right) so several cars fit on one screen. Swipe rows bleed to the screen edge and turn into grids on desktop. Everything is one face, Manrope, with weight (800 to 900) doing the hierarchy work and tabular numerals wherever a number is compared.

Trust is shown through evidence, not decoration. Counts come from live data, badges come only from stock status, and shipping is always quoted, never shown as a fixed price.

**Key Characteristics:**
- Navy bands for authority, white cards for inventory, gold only as rule and seal.
- One typeface (Manrope); weight-led hierarchy; tabular prices.
- Light hairline-and-haze cards that lift 2px on hover.
- Marketplace density: compact phone rows, edge-bleeding swipe rows, 4-up desktop grids.
- Status-driven badges and live counts only.

## Colors

A restrained corporate palette: one deep navy, one steel blue for links, one muted gold accent, on cool neutrals.

### Primary
- **Harbour Navy** (`navy`): primary buttons, dark bands (top strip, desktop menu bar, home hero, footer), the price panel on stock pages, step discs in the journey, and car-card prices. `navy-hi` is its hover. `navy-deep` sits a step darker for the thin utility strip and the bottom of the footer gradient, so stacked dark rows read apart.

### Secondary
- **Steel Blue** (`steel`): text links ("View all stock", "All reviews"), card-title hover, the focus outline, the input focus border and ring, the text caret and the scrollbar thumb. This is the only blue that goes on white as text.

### Tertiary
- **Muted Gold** (`gold`): heading rules, the hero's bottom hairline, the journey route line, the 2px gold bar on the price panel, icons and column headings on navy, the "to your port" phrase in the hero headline, text selection (35% alpha), and the fill of the gold button and the "New arrival" badge. `gold-hover` is the gold button's hover. Inside `.on-dark` areas, `gold-on-navy-text` replaces steel as the link and focus colour.

### Neutral
- **Cool Paper** (`page`): page background, with two very faint static glows (gold top-right, steel left, 7% alpha).
- **White** (`surface`): cards, panels, inputs, the desktop logo row and the phone top bar.
- **Mist Tint** (`tint`): soft icon wells (the remapped `bg-brand-50`).
- **Jet Ink** (`ink`) through `ink-4`: body text, secondary text, captions and placeholders. Faint text utilities are lifted to 72% of the foreground so they keep 4.5:1 or better on the page and in tinted panels.
- **Navy Ink** (`ink-on-navy`): primary text in navy areas.
- **WhatsApp Green** (`whatsapp`): third-party brand colour, used only on WhatsApp actions, always with jet text (or emerald-700 on the 15% tint inside cards).

### Named Rules
**The Gold Seal Rule.** Gold marks things; it never speaks on white. Use it for rules, hairlines, icons and text on navy, and as a fill under navy text. Never set body or link text in gold on a white or light grey surface.

**The Flip Rule.** Tailwind `white` resolves to `--fg`. The light page sets it to jet black, and `.on-dark` areas (plus solid navy, black, emerald, amber and red fills) set it back to white. Write `text-white/70` once and it reads correctly on both grounds. Any new dark area must carry `.on-dark` rather than hard-coding colours.

**The House Palette Rule.** On the public site, logo red and cerulean do not appear. New markup uses the CSS variables (`--accent`, `--accent-hi`, `--accent-text`, `--gold`) directly. The `brand-*` remaps exist so older markup follows the palette; they are a compatibility layer, not a vocabulary to extend.

## Typography

**Display Font:** Manrope (with Plus Jakarta Sans, then Noto Sans JP for Japanese, then system-ui)
**Body Font:** Manrope
**Label/Mono Font:** Manrope (no mono)

**Character:** A single geometric-humanist sans, set heavy for headings and plain for body. It reads as corporate and international, and stays legible for second-language readers on mid-range phones. Headings get -0.02em tracking and balanced wrapping; paragraphs use `text-wrap: pretty`.

### Hierarchy
- **Display** (800, 1.9rem on phones to 2.6rem from sm, 1.08): the home hero headline only.
- **Headline** (900, 1.25rem to 1.5rem, tight): section headings with the gold section mark. Stock-page titles use 800 at 1.5rem to 2rem.
- **Title** (800, 14px to 15px, snug): car-card titles (one line on cards, two in phone rows), panel headings.
- **Body** (400, 14px to 15px, 24px line height): intros, review quotes, step descriptions; measure kept to about 34 to 52ch in hero and CTA copy.
- **Label** (700, 11px to 12px, 0.05em, uppercase): small field labels that sit directly above a value ("FOB price", fact labels on the stock page). Footer column headings use the same treatment in gold at 0.18em tracking on navy.
- **Price** (800, tabular): 1.125rem to 1.35rem on cards in navy; 1.875rem in white inside the navy price panel.

### Named Rules
**The One Face Rule.** Manrope everywhere on the public site; hierarchy comes from weight and size, never from a second display face.

**The Ledger Numerals Rule.** Prices, counts, step numbers and stock IDs use tabular figures (any element whose class mentions `price` gets them automatically).

## Layout

Content sits in a centred 80rem (`max-w-7xl`) column with 16px gutters on phones and 24px from `lg` (1024px). The one structural breakpoint is `lg`: below it, the navy menu row, top strip and desktop header are hidden; the phone gets a white sticky top bar, a slide-in menu and a floating frosted bottom tab bar (the page reserves `4.75rem` plus the safe-area inset for it).

Stock grids run 1 column on phones, 2 from sm, 3 from lg and 4 from xl, with a 16px gap. Phones show at most four cars per home section, with a full-width "View all N cars" link. Category rows (makes, body types, fuel, price bands, offers, reviews, blog) are horizontal swipe rows that snap, bleed to the screen edge, and become grids or wrapped rows on desktop (`hscroll-grid` gives an 8-column grid).

Home sections are separated by 32px to 48px top padding, with no dividers. The stock page uses a two-column grid (1.4fr gallery and details, 1fr summary and quote form). The quote form is sticky on desktop, and a sticky contact bar covers it on phones.

Tap targets are at least 44px. Phone inputs are 16px text and at least 46px tall so iOS does not zoom.

## Elevation & Depth

A hybrid: light surfaces are separated by a 1px hairline plus a soft ambient shadow; navy bands provide the strongest contrast; frosted glass appears only on overlays that float over content (sticky nav, the More menu, the bottom bar, slide captions).

### Shadow Vocabulary
- **Card rest** (`box-shadow: 0 1px 2px rgb(15 23 42 / 0.04), 0 8px 24px -12px rgb(15 23 42 / 0.14)`): every white card, panel and chip.
- **Card lift** (`box-shadow: 0 2px 4px rgb(15 23 42 / 0.05), 0 14px 32px -12px rgb(15 23 42 / 0.22)`): hover on linked cards, with a 2px rise and a stronger hairline.
- **Floating panel** (`box-shadow: 0 10px 40px rgb(15 23 42 / 0.16)`): menus and sheets, with an 18px backdrop blur.
- **On navy** (`box-shadow: 0 6px 20px rgb(0 0 0 / 0.22), inset 0 1px 0 rgb(255 255 255 / 0.1)`): translucent cards inside dark areas.
- **Bottom bar** (`box-shadow: 0 8px 32px rgb(15 23 42 / 0.18), inset 0 1px 0 rgb(255 255 255 / 0.8)`): the frosted phone tab bar.

### Named Rules
**The Hairline-and-Haze Rule.** Every light surface is white, has a 1px hairline at 10% ink, and carries the soft card-rest shadow. Depth increases only on hover or when a panel floats.

**The Clear-Glass Fallback Rule.** Frosted surfaces fall back to solid white (or solid navy on dark) when backdrop-filter is unsupported or reduced transparency is requested. All motion stops under reduced motion.

## Shapes

Softly rounded throughout, with radius growing with the size of the object: 8px for badges and stock-ID tags on photos, 12px for buttons, inputs and icon buttons, 16px for cards and the search panel, 24px for the large stock-page panels, the hero slider and the closing CTA band, and full pills for filter chips, step discs and the bottom-bar active marker. Photos sit in 4:3 frames (16:9 for blog covers) and are clipped by their card. Borders are always hairlines; the only heavier strokes are the 2px gold ring on journey step discs and the gold rules.

## Components

### Buttons
Confident, solid, with no outlines or gradients.
- **Shape:** gently rounded (12px).
- **Primary:** navy fill, white bold 14px text, 44px or more tall ("Details", "Inquiry", "Search", "Create account").
- **Gold:** gold fill with navy extrabold text, 48px tall. Reserved for the single lead action of a navy area: the hero search ("Search N cars"), "Get C&F price" on the price panel, and "Request a vehicle" on the CTA band.
- **Hover / Focus:** navy goes to navy-hi; gold goes to gold-hover. Focus is a 2px steel outline offset by 2px (gold on navy).
- **WhatsApp:** green fill with jet text; inside cards it is a 44px square icon button on a 15% green tint with a 40% green ring.
- **Quiet:** white card surface with a hairline (`glass-lite`), for "Sign in" and "View all".

### Chips
- **Style:** white pill with hairline and card-rest shadow, 44px tall, semibold 14px, optional 16px steel icon and a muted live count.
- **State:** link chips only (fuel, transmission, price bands); they lift on hover.

### Cards / Containers
- **Corner Style:** 16px (cards), 24px (stock-page panels).
- **Background:** white on the cool page; translucent white (7% to 12%) inside navy areas.
- **Shadow Strategy:** card rest, card lift on hover (see Elevation & Depth).
- **Border:** 1px hairline at 10% ink.
- **Internal Padding:** 10px to 14px on car cards, 16px to 20px on panels.

### Inputs / Fields
- **Style:** white fill, 1px stroke at 16% ink, 12px radius, faint shadow; 48px tall in the hero search panel.
- **Focus:** steel border plus a 3px steel ring at 22% alpha; no outline.
- **On navy:** 10% white fill with a 14% white hairline and no shadow.

### Navigation
- **Desktop:** a navy-deep utility strip (world clock, FX rate, live car count, contact), a white logo row holding the search field (steel focus ring, navy Search button) and the WhatsApp and Inquiry buttons, then a sticky navy menu bar with bold 13px to 14px white links, a hover tint of 10% white, a "More" dropdown, and a 2px hairline gradient beneath.
- **Phones:** a white sticky top bar (logo, search, account, favourites, menu), a slide-in menu, and a floating frosted bottom tab bar whose active item sits in a navy pill.
- **Footer:** navy to navy-deep gradient, four columns on desktop with gold uppercase column headings; on phones, a slim company and contact block with a WhatsApp button.

### Car Card (signature)
The stock unit of the marketplace. On phones it is a row (a 40% wide inset 4:3 photo on the left, details on the right); from sm it is a tall card. The photo carries the stock ID tag (55% black, blurred) top-left, a photo count, and at most one status badge bottom-left. Below: the title (800), grade and ships-from line, a 2 by 2 fact grid (year, mileage, engine, fuel) with steel icons, then a hairline and the "FOB price" label over the navy tabular price, with favourite, WhatsApp and navy "Details" buttons.

### Status Badge
- **Sold:** slate-200 fill with slate-800 text. **Reserved:** amber-100 with amber-900. **New arrival:** gold with navy text, only when the car was listed within 7 days. **Parts car:** navy with white. **Available** (stock page only): emerald-100 with emerald-800.

### Price Panel
A navy block (16px radius) inside the stock-page summary: a 40px by 2px gold bar, the "FOB price" label, the 1.875rem white tabular price, the gold "Get C&F price" button, and a line stating that shipping is quoted by the team.

### Section Mark
Section headings start with a short vertical rule (4px by 20px to 24px, fully rounded) in a navy-to-gold gradient, or solid gold on stock pages, followed by a "View all" steel link on the right.

### Journey
"How to buy" is one route: numbered 40px navy discs with a 2px gold ring, joined by a 2px gold line that fades to 25%, running down the left on phones and across the top on desktop.

## Do's and Don'ts

### Do:
- **Do** use navy for primary buttons and dark bands, and give every new dark area `.on-dark` so the Flip Rule handles its text.
- **Do** keep gold for rules, hairlines, icons on navy and the one gold lead button per navy area (navy text on gold).
- **Do** set prices in navy, weight 800, tabular figures on white; white on the navy price panel.
- **Do** derive every badge from real status: Sold, Reserved, or New arrival when listed 7 days ago or less.
- **Do** label shipping (C&F / CIF) as quoted or estimated, never as a fixed price; FOB is the only confirmed price.
- **Do** show counts and ratings from live data only (one live car count everywhere).
- **Do** keep tap targets at 44px or more and phone inputs at 16px text.

### Don't:
- **Don't** set gold text on white or light grey surfaces.
- **Don't** use logo red or cerulean on the public site; they belong to the ERP and invoices.
- **Don't** use flat black for dark bars; dark areas are navy (#10243a) or navy-deep.
- **Don't** add a second display typeface.
- **Don't** invent trust claims (years in business, export volumes, licence numbers, testimonials) or decorative badges.
- **Don't** extend the `brand-*` remap layer for new work; use the CSS variables.
