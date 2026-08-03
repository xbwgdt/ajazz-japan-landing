# AJAZZ JAPAN Official Store Design

## Goal

Rebuild `ajazz-japan-landing.vercel.app` as the official Japanese AJAZZ website and direct-to-consumer store at `ajazz.jp`. The store will sell the current Rakuten catalog in Japan, use Stripe for payments, and remain independent of any one fulfillment provider.

## Confirmed Business Rules

- Seller: アジャズジャパン株式会社
- Address: 〒340-0043 埼玉県草加市草加2-13-21-7
- Public telephone: 070-9319-5121
- Representative director: 謝天
- Support email: xiet@a-jazz.com
- Payment: Stripe Japan account for アジャズジャパン株式会社, settling to the GMOあおぞらネット銀行 account.
- Shipping: free nationwide in Japan, including remote areas, with dispatch targeted within three business days.
- Returns and exchanges: within seven days of delivery, with customer-paid shipping for discretionary returns or exchanges. AJAZZ bears shipping cost for verified initial defects.
- First release inventory source: Rakuten RMS InventoryAPI. RSL BOSS integration is explicitly out of scope because the paid RSL external API will not be activated and fulfillment may move to another warehouse.
- First release fulfillment: operations staff manually dispatch orders and enter the tracking number in the admin console.

## Experience and Brand Direction

Use the approved `AJAZZ Performance Edit` direction:

- White and warm-neutral surfaces, AJAZZ Red accents, generous whitespace, and geometric line motifs derived from the AJAZZ JAPAN logo.
- Use product imagery and measured performance data as the visual proof for rapid trigger, 8K polling, and precision features.
- Do not use a generic neon-esports aesthetic. High-performance products must feel technical and competitive without excluding lifestyle keyboards, mice, and stream controllers.
- Homepage hero prioritizes rapid-trigger keyboards. Category entry points: Rapid Trigger, Mechanical, Stream Deck, and Gaming Mice.

## Storefront Scope

Pages:

- Homepage
- Product category listings
- Product details with image gallery, variant selection, price, availability, technical specifications, shipping information, returns policy, and related products
- Brand Story and technology editorial pages
- Driver downloads
- Cart and Stripe checkout
- Order lookup
- Member registration, sign-in, account management, order history, saved addresses, and point history
- Legal pages: 特定商取引法に基づく表記, privacy policy, terms, shipping, returns, and warranty

Customer flow:

1. Select product variant and add to cart.
2. Enter a Japanese delivery address.
3. Pay through Stripe.
4. Receive confirmation email.
5. Operations staff fulfills order manually.
6. Staff enters tracking number and customer receives shipment email.

Logged-in members earn one point for each JPY 100 of eligible product spend. One point is worth JPY 1 and can be redeemed from one point. Points remain pending until 14 days after shipment, expire 12 months after the member's latest point accrual or redemption, and are reversed or restored consistently when an order is refunded or cancelled. Guest checkout remains available but does not earn points.

Product variants must link each RMS SKU to its own color name, color thumbnail, gallery images, price, comparison price, and inventory. Product cards show up to four color thumbnails plus an overflow count; product pages use image thumbnails rather than abstract color dots and expose the selected color in the URL.

The product-detail information hierarchy may draw from the AJAZZ Rakuten store, but the official site must reorganize the content into a concise gallery and purchase panel followed by selling points, specifications, downloads, shipping, returns, and related products.

OEM and wholesale do not receive dedicated pages or detailed public option lists. The company page presents these capabilities as evidence of AJAZZ's product-development and supply strength and directs interested businesses to `xiet@a-jazz.com`.

Driver downloads provide software, firmware, and manuals by compatible product model. They are a public support resource and do not include a customer-service ticket workflow.

## Architecture

- Keep the existing Next.js application and deploy it to Vercel under `ajazz.jp`.
- Stripe handles payment collection. The application never stores payment card data.
- PostgreSQL stores normalized catalog data, variants, inventory snapshots, orders, line items, refunds, fulfillment events, and operational audit events.
- Import the Rakuten RMS export as the initial product catalog. Product images must be normalized as `https://image.rakuten.co.jp/ajazz/cabinet` plus the exported `商品画像パス` value.
- Inventory synchronization reads RMS InventoryAPI using product management number plus SKU management number. It updates website availability and keeps a timestamped sync log.
- Create a fulfillment-provider boundary. First release has a manual provider; a future warehouse connector can submit fulfillment instructions and consume shipment events without changing checkout or product pages.

## Admin and Operational Rules

- Admin supports catalog visibility, order review, status changes, refund initiation, tracking number entry, inventory-sync history, and CSV export.
- Order states: `paid`, `awaiting_fulfillment`, `shipped`, `cancelled`, `refund_pending`, and `refunded`.
- Before payment, validate the latest locally synchronized availability. On successful payment, reserve local stock immediately to reduce overselling risk.
- If RMS sync fails, retain the most recent successful availability, show an admin alert, and never convert failed records to zero stock.
- Out-of-stock variants cannot be checked out.
- Refunds are initiated only by staff in the admin console and reconciled against Stripe webhook status.
- Member and point balances use an append-only point ledger. A cached balance may be stored for display, but the ledger is the source of truth.
- Point redemption and order payment must be committed atomically so the same points cannot be spent twice.
- Refunds cancel pending earned points, deduct confirmed earned points, and restore redeemed points in proportion to the refunded amount.

## Acceptance Criteria

- RMS catalog import correctly maps parent products, variants, prices, stock values, and all product images.
- RMS inventory synchronization updates availability and logs failures without destroying the last known good stock state.
- Stripe test payments, refunds, webhooks, duplicate-payment prevention, and failed-payment flows work.
- Checkout blocks unavailable variants and works on Japanese mobile devices.
- Order confirmation, shipping, and refund emails are sent in Japanese.
- Staff can enter a tracking number and send a shipment notification.
- Required legal and customer-service information matches the confirmed seller, shipping, and returns rules.
- Key storefront views are visually tested at desktop and mobile breakpoints.
- Members can register, sign in, reset access, review orders, manage saved addresses, and inspect point balance and history.
- Point earning, 14-day pending status, redemption, 12-month rolling expiry, cancellation, and refund adjustments are covered by automated tests.
- Every selectable color renders the correct image, SKU, price, comparison price, and live RMS availability on product cards and product pages.
- The company page contains the approved OEM and wholesale capability message and a working email action to `xiet@a-jazz.com`; no standalone OEM or wholesale route is published.

## Out of Scope for First Release

- RSL BOSS external API integration and RSL automated fulfillment.
- Subscriptions, pre-order lotteries, tiered membership, point campaigns or multipliers, point transfer, and complex marketing automation.
- Non-Japanese storefront localization.
