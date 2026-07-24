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
- Support center
- Cart and Stripe checkout
- Order lookup
- Legal pages: 特定商取引法に基づく表記, privacy policy, terms, shipping, returns, and warranty

Customer flow:

1. Select product variant and add to cart.
2. Enter a Japanese delivery address.
3. Pay through Stripe.
4. Receive confirmation email.
5. Operations staff fulfills order manually.
6. Staff enters tracking number and customer receives shipment email.

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

## Acceptance Criteria

- RMS catalog import correctly maps parent products, variants, prices, stock values, and all product images.
- RMS inventory synchronization updates availability and logs failures without destroying the last known good stock state.
- Stripe test payments, refunds, webhooks, duplicate-payment prevention, and failed-payment flows work.
- Checkout blocks unavailable variants and works on Japanese mobile devices.
- Order confirmation, shipping, and refund emails are sent in Japanese.
- Staff can enter a tracking number and send a shipment notification.
- Required legal and customer-service information matches the confirmed seller, shipping, and returns rules.
- Key storefront views are visually tested at desktop and mobile breakpoints.

## Out of Scope for First Release

- RSL BOSS external API integration and RSL automated fulfillment.
- Membership, points, subscriptions, pre-order lotteries, and complex marketing automation.
- Non-Japanese storefront localization.
