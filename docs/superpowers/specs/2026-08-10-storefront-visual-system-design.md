# AJAZZ JAPAN Storefront Visual System Design

## Goal

Unify the complete public AJAZZ JAPAN storefront under the approved premium
dark gaming direction. The redesign must carry the visual language of the
full-bleed gaming desk hero through product discovery, product purchase,
company information, order confirmation, and legal content without changing
the Payload administration interface or weakening commerce behavior.

## Scope

The redesign covers these public routes and their shared components:

- `/`
- `/products/[slug]`
- `/cart`
- `/order/success`
- `/about`
- `/legal`
- `/privacy`
- `/terms`
- the external driver destination reached from storefront links

The Payload administration interface under `/admin` is out of scope. Its
operation-focused appearance remains unchanged.

## Design Direction

The storefront is a black gaming flagship store rather than a generic
cyberpunk interface. The approved gaming desk image establishes the visual
tone: premium hardware, controlled blue and magenta light in photography,
precise black surfaces, and AJAZZ red as the only UI action color.

The interface must not use purple gradients, glowing decorative blocks,
continuous glitch effects, floating marketing cards, or ornamental HUD
graphics. Product photography provides the atmosphere. The UI provides clear
hierarchy, buying confidence, and Japanese ecommerce usability.

## Visual Tokens

### Color

- `--store-bg: #07080c` for the page canvas.
- `--store-surface: #111318` for product wells and grouped content.
- `--store-surface-raised: #181b21` for interactive raised states.
- `--store-line: #2b2f37` for borders and separators.
- `--store-text: #f7f7f8` for primary text.
- `--store-text-muted: #a7abb3` for descriptions and secondary metadata.
- `--store-accent: #e93b43` for primary commands, selected states, section
  markers, and critical emphasis.
- `--store-success: #65c987` for available inventory only.
- `--store-danger: #ff626b` for errors, destructive actions, and unavailable
  inventory.

Blue, cyan, and magenta remain photographic colors and are not used as broad
interface fills or decorative gradients.

### Typography

- English display headings use Barlow Condensed at heavy weights.
- Japanese text and all controls use Noto Sans JP.
- Price, stock, point, and specification numerals use tabular figures.
- Body copy uses a minimum 16px size on mobile and a readable line height.
- Letter spacing remains zero for headings, body copy, and controls. Small
  uppercase section labels may use restrained positive tracking only where the
  existing approved identity requires it.

Fonts are bundled through the Next.js font system so the live storefront does
not depend on a runtime request to an external font stylesheet.

### Shape And Spacing

- Cards and panels use square corners or a maximum 4px radius.
- Layout follows an 8px spacing scale.
- Shared content widths and responsive gutters are defined once in the
  storefront shell.
- Borders, spacing, and typography establish hierarchy; decorative shadows are
  not used as substitutes for structure.

## Brand Assets

The existing AJAZZ artwork remains authoritative. The redesign does not
redraw, regenerate, or reinterpret the logo.

A dark-surface asset is derived from the supplied source by making the white
background transparent, retaining the red symbol, and converting the grey
`AJAZZ JAPAN` lettering to white. The geometry and spacing are preserved
exactly. The existing light-surface logo remains available for light product
imagery or documents.

The transparent dark-surface logo is used in the shared navigation and footer.
Responsive sizing changes the rendered dimensions only; it never crops the
symbol or lettering.

## Shared Storefront Shell

All public routes use one shared header and footer instead of duplicating
route-specific markup.

### Header

- Dark translucent surface with a fine bottom border.
- Transparent red-and-white AJAZZ JAPAN logo.
- Desktop navigation: products, categories, company information, drivers,
  search, account, and cart.
- Mobile navigation: logo, search, account, cart, and a menu button that exposes
  all remaining links.
- Familiar icons use the existing icon library or Lucide icons and include
  accessible names.
- Header height is stable and every control meets a 44px mobile target.

Account links may remain visibly unavailable until membership authentication
is implemented, but the shell must reserve the intended location without
creating a false working flow.

### Footer

- Dark surface separated from content by a fine border.
- Transparent AJAZZ JAPAN logo, company name, address, and contact destination.
- Groups for shopping guidance, legal links, company information, drivers, and
  configured social destinations.
- No nested cards and no decorative image behind legal or contact content.

## Homepage

The approved full-bleed gaming desk hero remains the homepage lead. Its image,
left-side contrast gradient, title, copy, and two commands are retained as the
visual anchor.

All following sections move from the old cream system to the new dark system:

- Performance metrics use a precise horizontal data band.
- Product discovery uses dark product wells and a compact search/filter bar.
- Service commitments use structured full-width bands rather than a solid red
  marketing block.
- Red is limited to section markers, selected filters, and primary actions.
- A hint of the next section remains visible below the hero on desktop and
  mobile.

## Product Catalogue

- Three columns on wide desktop, two on tablet, and one on mobile.
- Product imagery is fully visible with `object-fit: contain` on graphite
  display surfaces.
- Every product exposes category, name, list price when present, sale price,
  earned points, and stock state.
- Variant image thumbnails appear below the product information. Selecting a
  thumbnail replaces the card image without navigation.
- Hover enlarges only the product image and reveals a clear product-view
  command. Card dimensions remain stable.
- Search, category filtering, result count, filter clearing, empty state, focus
  state, and disabled state share the same dark control language.

## Product Detail

The product detail route uses the shared storefront shell.

- Desktop: large gallery on the left and purchase information on the right.
- Mobile: gallery first, immediately followed by price and purchase controls.
- Product media remains complete and inspectable rather than being aggressively
  cropped.
- Variant choices use product thumbnails, not text-only pills. Variant changes
  update the active image, price, stock, SKU, points, and purchase state.
- Price presentation preserves list price, sale price, tax context, and point
  earning.
- Quantity and add-to-cart controls remain stable and accessible.
- Lower content is divided into features, specifications, drivers, and
  delivery/returns sections using full-width bands or border-separated regions.

## Cart And Order Confirmation

The cart uses a dark order list with product identity, selected variant,
quantity controls, line price, and removal action in one coherent row.

- Desktop checkout summary occupies a stable right column.
- Mobile summary follows the line items without overlapping content.
- Checkout loading, disabled, and error states remain explicit.
- Terms and legal links remain visible before checkout.

The order confirmation page prioritizes order status, reference, amount,
contact destination, and estimated shipment timing. It remains restrained and
does not use celebratory visual effects that compete with transactional data.

## Company Page

The company page uses the same premium dark editorial language as the hero.
Its sequence is:

1. Brand introduction.
2. Support by the Japanese corporation.
3. OEM and wholesale capability.
4. Company information and contact details.

OEM and wholesale remain company credibility content, not a separate route or
detailed service configurator. Interested corporate customers receive one
clear mail contact command.

Large product or desk-setup photography may separate major sections. The page
must not return to cream corporate cards or generic business imagery.

## Legal, Privacy, And Terms Pages

Legal routes use the shared dark shell while prioritizing reading comfort:

- Content width is constrained for long Japanese text.
- Headings are white, body text is light grey, and terms use clear border
  separators.
- Line height and paragraph spacing are increased.
- No decorative imagery, parallax, or entrance animation is applied to legal
  copy.
- Existing legal content and CMS-controlled company data remain unchanged by
  the visual work.

## Motion

- Hero copy receives one restrained entrance sequence.
- Product cards animate image scale and command opacity only.
- Variant image changes use a quick crossfade.
- Company sections may reveal with a small vertical translation and fade.
- Interactive transitions use 180-250ms; larger section reveals use no more
  than 400ms.
- Motion uses transform and opacity only and never blocks interaction.
- `prefers-reduced-motion: reduce` disables nonessential movement.

## CMS Boundaries

Payload continues to control product names, prices, comparison prices, stock,
variants, colors, media, specifications, and descriptions. Site settings
continue to control homepage media and copy, featured products, company copy,
contact details, footer data, and social destinations.

The visual tokens, layout primitives, shared shell, typography, component
structure, and accessibility behavior remain code-controlled. Generic CMS
content cannot replace or bypass the designed storefront templates.

## Responsive And Accessibility Requirements

- Verify at 375px, 768px, 1024px, and 1440px widths.
- No route may produce horizontal page scrolling.
- Text, prices, controls, and thumbnails must not overlap or resize their
  containers unexpectedly.
- Interactive targets are at least 44px on touch layouts.
- Keyboard focus is visible on every interactive control.
- Color is never the only signal for selected, error, success, or disabled
  state.
- Text and controls meet WCAG AA contrast.
- Product images declare stable dimensions or aspect ratios to prevent layout
  shift.

## Verification And Delivery

Implementation is complete only after:

1. Component tests cover the shared shell, logo asset, catalogue states,
   product detail variant behavior, cart states, and CMS fallbacks.
2. The full test suite, production build, type check, and formatting checks
   pass.
3. Browser inspection covers every public route on desktop and mobile.
4. Screenshots confirm the logo, typography, product imagery, pricing,
   controls, legal readability, and lack of overlap or horizontal scrolling.
5. The branch is pushed only to `xbwgdt/ajazz-japan-landing`.
6. Railway staging deploys the exact commit and representative HTTP, asset,
   navigation, and rendering checks pass.
7. Production and `ajazz.jp` remain unchanged until staging receives explicit
   approval.
