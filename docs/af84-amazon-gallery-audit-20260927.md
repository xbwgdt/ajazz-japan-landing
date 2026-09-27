# AF84 Amazon Color Gallery Audit

## Scope

- Railway staging only; CMS product 7, slug `af84`.
- No publication, price, inventory, SKU, JAN, description, specification or category changes.
- Source mapping: `data/af84-amazon-gallery-sources.json`.
- Four Amazon variant pages and all 36 images visually reviewed.
- Images uploaded through the existing Payload validation and R2 storage pipeline, not permanent Amazon hotlinks.

## Exact Mapping

| Existing SKU | Existing color | Amazon ASIN | Ordered media IDs (first is main) |
| --- | --- | --- | --- |
| 6976412988448 | Green | B0H4LT2P97 | 96,109,110,111,112,113,114,115,116 |
| 6976412985997 | Gray | B0H4LDGK69 | 117,118,119,120,121,122,123,124,125 |
| 6976412988455 | Red / rose-red | B0H4LYK2NS | 126,127,128,129,130,131,132,133,134 |
| 6976412986000 | Black / black-red | B0H2DLRPY4 | 135,136,137,138,139,140,141,142,143 |

Amazon labels rose-red as pink. Visual comparison confirms it is NOT the existing pale pink SKU 6976412985980. Existing color names and SKU identities remain unchanged.

Yellow 6976412985973 and pale pink 6976412985980 have no verified match in this Amazon variation family. Preserve their existing main images; do not borrow another color's gallery.

## Before-State Image References

AF84 editorial revision 6, status draft, lifecycle unpublished, galleryMode shared.

- Product primaryImageId: 91.
- Product galleryImageIds: 92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108.
- Yellow main/thumbnail: 93.
- Pale pink main/thumbnail: 94.
- Gray main/thumbnail: 97.
- Black main/thumbnail: 92.
- Green main/thumbnail: 96.
- Red main/thumbnail: 95.
- All variant galleries empty; ASIN and source URL null.

Old media records and product-level image references are retained. Full before/after catalog snapshots are on the current staging instance in `/tmp/af84-gallery-before.json` and `/tmp/af84-gallery-after.json`; these temporary files do not survive instance replacement. CMS versions retain the earlier editorial state.

## Verification Status

- Staging deployment 653418ce-7141-4e87-a8fd-bcfd03cfe828: SUCCESS.
- Media uploads: 35 new images, green main reused from media 96; 36 images total.
- Draft association save: revision 6 to 7, galleryMode color, still draft/unpublished.
- Full-catalog comparison: all 42 other products identical; AF84 all non-image fields identical. Product-level old images retained.
- All 38 unique variant image URLs passed actual GET download and image content-type checks through the staging site's media route (36 Amazon images plus two preserved originals). HEAD is not supported by this route and was not used as the final criterion.
- Desktop/mobile browser verification: pending administrator login renewal.
