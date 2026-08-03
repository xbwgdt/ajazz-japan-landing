# AJAZZ JAPAN Catalog Discovery Design

## Goal

Make every published RMS product discoverable through a reliable Japanese category and keyword search on the AJAZZ JAPAN storefront.

## Scope

This phase adds:

- Seven canonical product categories:
  - `rapid-trigger-keyboard`: ラピッドトリガーキーボード
  - `mechanical-keyboard`: メカニカルキーボード
  - `membrane-keyboard`: メンブレンキーボード
  - `mouse`: マウス
  - `stream-controller`: ストリームコントローラー
  - `headset`: ヘッドセット
  - `other`: その他
- A category column on catalog products.
- Deterministic category assignment during RMS workbook import.
- A storefront keyword search and category filter.
- Matching product count, clear-filter action, and an empty-result state.

Structured specification filters, CMS editing, member accounts, and points are separate phases.

## Data Model

`products.category` stores one canonical category key and defaults to `other`. The application owns the category key and Japanese label mapping so database values remain stable if display wording changes.

The RMS importer classifies each parent product from its management number, product name, and description. Classification follows this priority:

1. Rapid-trigger or magnetic-switch keyboard terms.
2. Mouse terms and recognized mouse model prefixes.
3. Stream-controller terms and recognized controller model prefixes.
4. Headset and headphone terms.
5. Membrane-keyboard terms.
6. Keyboard terms and recognized keyboard model prefixes, classified as mechanical when no stronger rule matches.
7. Other.

Every import upsert writes the derived category. Existing installations receive the column through the idempotent schema migration. Products that cannot be classified safely remain in `other`; the importer does not guess from color or price.

## Storefront Data Flow

Database storefront queries return the stored category key. Fallback sample products use the same keys. `toStorefrontCards` preserves the category instead of replacing it with a generic label.

The homepage passes all loaded cards to a client-side catalog browser. Search and category selection are local interactions, so filtering is immediate and does not reload the page. Search is case-insensitive and matches product name, category label, and tagline. Selecting `すべて` removes the category constraint.

## Interface

The discovery controls appear immediately above the product grid:

- A compact search input labeled `製品を検索`.
- A horizontally scrollable category control on narrow screens.
- A result count using Japanese copy.
- A `条件をクリア` action only when a filter is active.
- A clear empty-result message with a reset action.

The existing product cards, color thumbnails, prices, and product links remain unchanged. Controls use the current white, black, and AJAZZ red visual system and remain rectangular rather than pill-shaped.

## Accessibility

- Search uses a visible label.
- Category controls expose pressed state.
- Result count updates in a polite live region.
- Keyboard focus remains visible.
- Mobile controls do not create page-level horizontal overflow.

## Error Handling

- Missing or unknown categories normalize to `other`.
- An empty search value shows all products in the selected category.
- No matching products never removes the controls; users can reset without reloading.
- RMS import failures retain the existing transaction behavior and do not partially overwrite catalog rows.

## Testing

Automated tests cover:

- Classification priority and representative keyboard, mouse, controller, headset, membrane, and unknown products.
- Schema and writer propagation of the category field.
- Storefront card mapping without category loss.
- Search normalization, category filtering, combined filtering, and reset behavior.
- Rendered Japanese labels and accessible control states.

Browser checks cover desktop and mobile layout, text fitting, keyboard focus, filter interaction, result counts, empty state, and horizontal overflow.

## Acceptance Criteria

- All published products have one of the seven canonical category keys.
- Reimporting the RMS workbook updates category assignments idempotently.
- The homepage can filter products by each Japanese category.
- Keyword search and category filtering work together without navigation.
- Result counts and empty states are accurate and readable.
- Existing product-card color selection and product links continue to work.
- Desktop and mobile layouts have no incoherent overlap or page-level horizontal overflow.
