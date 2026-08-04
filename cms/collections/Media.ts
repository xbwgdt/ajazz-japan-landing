import type { CollectionConfig } from "payload";
import { adminOnly } from "../access/admin";

// Task 4 adds upload storage and lifecycle enforcement to this metadata dependency.
export const Media: CollectionConfig = {
  slug: "media",
  admin: { useAsTitle: "filename" },
  access: {
    create: adminOnly,
    delete: adminOnly,
    read: adminOnly,
    update: adminOnly,
  },
  fields: [
    { name: "filename", type: "text", required: true, unique: true, index: true },
    { name: "alt", type: "text", required: true },
  ],
};
