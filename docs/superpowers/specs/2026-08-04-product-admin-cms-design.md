# AJAZZ JAPAN Product Administration CMS Design

## Objective

Add a production-grade product and page administration system to the existing
AJAZZ JAPAN storefront. The system must let AJAZZ staff create, edit, preview,
publish, unpublish, archive, and restore products without weakening the current
checkout, order, or RMS inventory boundaries.

The first administrator is `xiet@a-jazz.com`. No password, bootstrap token, or
service credential may be committed to the repository.

## Scope

This phase includes:

- Payload CMS integrated into the existing Next.js application.
- PostgreSQL-backed administrator accounts, sessions, access control, drafts,
  previews, versions, and audit records.
- Cloudflare R2 storage for product images and site media.
- Product management for RMS-linked and website-only products.
- Structured variants, colors, prices, specifications, publication states, and
  SEO fields.
- Constrained homepage, company-profile, contact, footer, and social-link
  editing.
- A transactional publication service that updates the operational storefront
  data consumed by checkout.
- Migration of the existing catalog into CMS-managed editorial records without
  disrupting the currently published storefront.

This phase excludes:

- Customer membership and points accounts.
- Arbitrary page builders, drag-and-drop positioning, custom fonts, custom CSS,
  or unrestricted HTML.
- Driver, firmware, and manual file management. Driver links open the external
  AJAZZ page at `https://www.a-jazz.com/en/h-col-160.html` in a new tab, and the
  existing `/drivers` route redirects there for compatibility.
- Replacement of RMS as the inventory authority for RMS-linked products.

## Architecture

Payload CMS runs in the existing Next.js application and uses the existing
Railway PostgreSQL service through Payload's PostgreSQL adapter. Payload owns
administrator identities, editorial product records, media metadata, drafts,
versions, and site-content settings.

The existing commerce tables remain the operational source for storefront
reads, server-side prices, reservations, inventory, checkout, and orders. A
publication service validates a CMS draft and atomically compiles its approved
content into those commerce tables. Public pages never read an unapproved draft.

This boundary prevents an incomplete CMS edit from altering live checkout data
and keeps payment and inventory code independent from the editorial system.

Cloudflare R2 stores product and site media. PostgreSQL stores references,
metadata, ownership, and usage relationships; it does not store binary files.
Railway's local filesystem is not used for persistent uploads.

## Administrator Experience

`/admin` is the unified administration surface. Payload authentication replaces
the shared static administrator password after migration. The order-management
view is protected by the same Payload session and remains available from the
admin navigation.

The dashboard shows:

- total, draft, published, out-of-stock, and archived product counts;
- RMS synchronization failures and the latest successful synchronization time;
- recently edited and pending-publication products; and
- recent publication, price, archive, and manual-inventory audit events.

The product list supports keyword search and filtering by category, source,
publication state, and stock state. Product editing uses fixed sections for
basic information, media and colors, price and inventory, specifications, SEO,
and version history.

## Product Model

Every editorial product has:

- `sourceType`: `rms` or `manual`;
- immutable RMS management identity for RMS-linked products;
- name, slug, short selling statement, and structured rich description;
- one of the seven canonical storefront categories;
- hero/primary image, ordered gallery, and optional desk-setup scene images;
- featured status and merchandising order;
- structured variants;
- structured product specifications;
- SEO title, description, and sharing image;
- `draft`, `published`, `unpublished`, or `archived` state; and
- creation, update, publication, and actor metadata.

The canonical categories remain:

1. Rapid Trigger keyboard
2. Mechanical keyboard
3. Membrane keyboard
4. Mouse
5. Stream controller
6. Headset
7. Other

Japanese display labels continue to use the labels already defined by the
storefront catalog taxonomy.

## Variants, Colors, and Prices

Each variant contains a stable operational SKU, color name, color swatch,
thumbnail, variant image, sale price, publication state, and inventory mode.
Color previews use image thumbnails on listing and product-detail pages.

RMS-linked SKUs and inventory values are read-only in the CMS. Website-only
variants use manual inventory and every adjustment records the administrator,
old value, new value, reason, and timestamp.

Crossed-out comparison prices are disabled by default. A comparison price can
only be published when evidence type, evidence value or reference, approval
state, approving administrator, and approval time are present. Removing approval
immediately suppresses the comparison price on the next publication.

## Structured Specifications

The CMS stores typed specification values rather than unstructured display text
alone. Supported fields include, where applicable:

- keyboard layout, size, switch type, connection modes, polling rate, Rapid
  Trigger support, actuation range, keycap material, and supported operating
  systems;
- mouse sensor, maximum DPI, polling rate, weight, connection modes, button
  count, and supported operating systems;
- headset connection, driver size, microphone type, weight, and supported
  operating systems; and
- stream-controller key/display count, connection, supported applications, and
  supported operating systems.

These fields prepare the data model for a later specification-filtering phase;
building the public specification-filter interface is not part of this phase.

## RMS and Manual Product Rules

An RMS catalog import may create a new CMS draft and establish stable RMS
product/SKU links. Later imports and inventory synchronization may update source
identifiers, source snapshots, and inventory, but must not overwrite manually
edited descriptions, images, categories, merchandising settings, or SEO.

RMS inventory synchronization updates only operational inventory and sync logs.
CMS drafts do not delay or replace that synchronization.

A website-only product can be created without RMS identity. It supports manual
SKU and inventory management. Converting a manual product into an RMS-linked
product requires an explicit administrator action and conflict validation; it
never happens automatically from a matching name.

## Draft, Preview, and Publication

All new and edited content is saved as a draft. Preview uses a short-lived,
administrator-authorized preview token and renders the draft through the same
storefront components used by the live site.

Publication validates required product fields, category, primary image, sale
price, active SKU, variant/color data, inventory authority, media references,
slug uniqueness, and comparison-price evidence. It then updates the operational
storefront data and publication audit record in one database transaction.

If validation, media resolution, or database publication fails, the previous
live product remains unchanged. Two administrators editing the same record use
optimistic version checks; a stale editor must review the newer version rather
than silently overwrite it.

Publishing triggers storefront cache invalidation only after the transaction
commits.

## Archiving and Deletion

Published products and any product or SKU referenced by an order cannot be
permanently deleted. They can be unpublished and archived while historical
orders retain immutable item names, prices, quantities, and SKU references.

An unreferenced draft may be permanently deleted after explicit confirmation.
Archived records can be restored as drafts.

Media deletion is blocked while a product, variant, version, or site-content
record references the object.

## Site Content Controls

Site-content editing is structured and constrained to approved design slots:

- homepage hero media, title, supporting copy, commands, and featured products;
- featured categories and their order;
- the three company-profile sections;
- company contact details;
- footer navigation and social links; and
- legal-commerce values that are editable but cannot remove required fields.

The CMS does not expose arbitrary positioning, stylesheets, fonts, or HTML. The
existing approved visual system remains in application code.

## External Driver Destination

All header, footer, and product-detail driver actions open
`https://www.a-jazz.com/en/h-col-160.html` in a new tab with safe external-link
attributes. The `/drivers` route issues a compatibility redirect to the same
destination. Driver files are not uploaded to R2 or modeled in Payload in this
phase.

## Media Security

R2 uploads use server-generated object keys and an allowlist of image MIME
types. The server verifies the actual file signature, enforces size and pixel
limits, strips unsafe names, and does not trust browser-provided MIME values.

Upload permissions require an authenticated administrator. Public delivery uses
a read-only media domain; R2 write credentials remain server-only Railway
variables. Replaced and deleted objects use reference checks and delayed cleanup
so a failed publication cannot remove live media.

## Authentication, Authorization, and Audit

The first administrator account uses `xiet@a-jazz.com` and is created through a
one-time deployment/bootstrap procedure without a repository password. Passwords
are hashed by Payload. Sessions use secure, HTTP-only cookies and production
login throttling.

The initial account has full administrator access. The model supports later
staff accounts and roles without changing product ownership or audit schemas.

Audited actions include login-security events, create, edit, publish, unpublish,
archive, restore, permanent draft deletion, price approval, manual inventory
adjustment, and media deletion.

## Migration

Payload tables are added alongside the current commerce schema. Existing RMS
products are transformed into editorial records and linked to current
operational product and variant identifiers. Migration is idempotent and is
tested against a disposable database.

The storefront continues reading existing published operational data throughout
migration. The publication service is enabled only after catalog counts, SKU
links, prices, image references, and draft/published states pass reconciliation.

The shared-password administration route is removed only after the Payload
administrator can authenticate and access order management. Rollback restores
the previous application release without dropping either CMS or commerce data.

## Error Handling

- Draft validation errors identify the exact field and never alter live data.
- Publication failures roll back operational writes and retain the draft.
- R2 failures retain existing media and expose a retryable admin error.
- RMS omissions retain last-known inventory and remain visible in sync logs.
- Version conflicts require explicit reload or comparison.
- Unauthorized preview, publication, media, and inventory requests fail closed.
- Audit writes are part of the protected operation and cannot be silently
  skipped.

## Testing and Acceptance

Automated coverage includes:

- administrator authentication, access controls, throttling, and session
  protection;
- product and variant validation for both source types;
- RMS field immutability and manual-inventory audit records;
- draft, preview, publish, unpublish, archive, restore, and version conflict
  behavior;
- comparison-price approval requirements;
- R2 upload validation, reference protection, and failure handling;
- atomic publication and rollback;
- migration idempotency and catalog/SKU reconciliation;
- preservation of checkout, order, refund, and RMS synchronization behavior; and
- external driver links and `/drivers` redirect behavior.

Browser verification covers desktop and mobile product lists, editing sections,
color/media management, preview, publication, and resulting public pages.

The phase is accepted when an authenticated administrator can create or edit an
RMS-linked or website-only product, manage colors and permitted inventory,
preview it, publish it atomically, unpublish/archive it, and restore an earlier
version while existing checkout, order administration, and RMS synchronization
continue to pass their full verification suite.

## Deployment Boundary

No production migration or push occurs while previously exposed repository
credentials remain unrotated or present in accessible Git history. Before
production, the owner must rotate affected credentials and approve history
cleanup. R2, Payload, database, and bootstrap secrets are configured only in
Railway or Cloudflare.
