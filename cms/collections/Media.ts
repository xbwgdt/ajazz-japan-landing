import type { CollectionConfig } from "payload";
import {
  createMediaObjectKey,
  validateUploadedImage,
  type ValidatedImage,
} from "../../lib/cms/media-validation";
import { adminOnly } from "../access/admin";

type MediaBeforeOperationHook = NonNullable<
  NonNullable<CollectionConfig["hooks"]>["beforeOperation"]
>[number];
type MediaBeforeValidateHook = NonNullable<
  NonNullable<CollectionConfig["hooks"]>["beforeValidate"]
>[number];

const validateMediaUpload: MediaBeforeOperationHook = async ({
  args,
  operation,
  overrideAccess,
  req,
}) => {
  if ((operation !== "create" && operation !== "update") || !req.file) return args;
  if (!overrideAccess && !req.user) return args;
  const validated = await validateUploadedImage(req.file);
  req.file = {
    ...req.file,
    mimetype: validated.mimeType,
    name: createMediaObjectKey(req.file.name, validated.extension),
    size: validated.size,
  };
  req.context.validatedMedia = validated;
  return args;
};

const applyValidatedMetadata: MediaBeforeValidateHook = ({ data = {}, req }) => {
  const validated = req.context.validatedMedia as ValidatedImage | undefined;
  if (!validated) return data;
  return {
    ...data,
    contentHash: validated.contentHash,
    height: validated.height,
    width: validated.width,
  };
};

export const Media: CollectionConfig = {
  slug: "media",
  admin: { useAsTitle: "filename" },
  access: {
    create: adminOnly,
    delete: () => false,
    read: ({ req }) => req.user ? true : { retiredAt: { exists: false } },
    update: adminOnly,
  },
  fields: [
    { name: "alt", type: "text", required: true },
    {
      name: "purpose",
      type: "select",
      required: true,
      options: [
        { label: "Product", value: "product" },
        { label: "SEO", value: "seo" },
        { label: "Editorial", value: "editorial" },
      ],
    },
    {
      name: "contentHash",
      type: "text",
      required: true,
      index: true,
      admin: { readOnly: true },
      access: { create: () => false, update: () => false },
    },
    {
      name: "retiredAt",
      type: "date",
      index: true,
      admin: { readOnly: true },
      access: { create: () => false, update: () => false },
    },
    {
      name: "deleteAfter",
      type: "date",
      index: true,
      admin: { readOnly: true },
      access: { create: () => false, update: () => false },
    },
    {
      name: "retiredBy",
      type: "relationship",
      relationTo: "admins",
      index: true,
      admin: { readOnly: true },
      access: { create: () => false, update: () => false },
    },
  ],
  hooks: {
    beforeOperation: [validateMediaUpload],
    beforeValidate: [applyValidatedMetadata],
  },
  upload: {
    filesRequiredOnCreate: true,
    hideRemoveFile: true,
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
};
