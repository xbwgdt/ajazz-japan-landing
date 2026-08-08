import { APIError, type CollectionConfig } from "payload";
import {
  createMediaFilename,
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
  if (operation === "update" && req.file) {
    throw new APIError("Media files cannot be replaced after upload.", 400, {
      code: "media_file_replacement_forbidden",
    });
  }
  if (operation !== "create" || !req.file) return args;
  if (!overrideAccess && !req.user) return args;
  const validated = await validateUploadedImage(req.file);
  req.file = {
    ...req.file,
    mimetype: validated.mimeType,
    name: createMediaFilename(validated.extension),
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
    read: () => ({ retiredAt: { exists: false } }),
    update: adminOnly,
  },
  fields: [
    { name: "filename", type: "text", required: true, unique: true, index: true },
    {
      name: "prefix",
      type: "text",
      required: true,
      defaultValue: "products",
      admin: { hidden: true, readOnly: true },
      access: { create: () => false, update: () => false },
    },
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
      name: "deletionStartedAt",
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
