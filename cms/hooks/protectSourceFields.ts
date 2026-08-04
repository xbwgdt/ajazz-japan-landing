import { APIError, type CollectionBeforeChangeHook } from "payload";

type SourceVariant = {
  operationalVariantId?: string | null;
  sku?: string | null;
  rmsSkuNumber?: string | null;
  inventoryMode?: string | null;
};

type SourceProduct = {
  id: number | string;
  editorialRevision?: number | null;
  operationalProductId?: string | null;
  rmsManageNumber?: string | null;
  sourceType?: string | null;
  variants?: SourceVariant[] | null;
};

function sourceIdentityError(): APIError {
  return new APIError(
    "RMS source identities cannot be changed without explicit source conversion.",
    400,
    { code: "rms_source_identity_immutable" },
  );
}

function staleRevisionError(currentRevision: number): APIError {
  return new APIError(
    "The product was updated by another editor.",
    409,
    { code: "stale_editorial_revision", currentRevision },
  );
}

function changed(incoming: unknown, original: unknown): boolean {
  return incoming !== undefined && incoming !== original;
}

function variantIdentityChanged(
  incomingVariants: SourceVariant[] | null | undefined,
  originalVariants: SourceVariant[] | null | undefined,
): boolean {
  if (!incomingVariants || !originalVariants) return false;
  if (incomingVariants.length !== originalVariants.length) return true;

  return incomingVariants.some((incoming, index) => {
    const original = incoming.operationalVariantId
      ? originalVariants.find((variant) => variant.operationalVariantId === incoming.operationalVariantId)
      : incoming.rmsSkuNumber
        ? originalVariants.find((variant) => variant.rmsSkuNumber === incoming.rmsSkuNumber)
        : originalVariants[index];
    if (!original) return true;
    return changed(incoming.operationalVariantId, original.operationalVariantId)
      || changed(incoming.rmsSkuNumber, original.rmsSkuNumber)
      || changed(incoming.sku, original.sku);
  });
}

export const protectSourceFields: CollectionBeforeChangeHook<SourceProduct> = async ({
  context,
  data,
  operation,
  originalDoc,
}) => {
  const currentRevision = Number(originalDoc?.editorialRevision ?? 0);
  const expectedRevision = context.expectedRevision;

  if (
    operation === "update"
    && expectedRevision !== undefined
    && Number(expectedRevision) !== currentRevision
  ) {
    throw staleRevisionError(currentRevision);
  }

  const allowSourceConversion = context.allowSourceConversion === true;
  const originalIsRms = originalDoc?.sourceType === "rms";
  const incomingSourceType = data.sourceType ?? originalDoc?.sourceType;

  if (originalDoc && !allowSourceConversion) {
    if (changed(data.sourceType, originalDoc.sourceType)) throw sourceIdentityError();
    if (originalIsRms && (
      changed(data.rmsManageNumber, originalDoc.rmsManageNumber)
      || changed(data.operationalProductId, originalDoc.operationalProductId)
      || variantIdentityChanged(data.variants, originalDoc.variants)
    )) {
      throw sourceIdentityError();
    }
  }

  const nextData: Partial<SourceProduct> = {
    ...data,
    editorialRevision: operation === "create" ? 1 : currentRevision + 1,
  };

  if (incomingSourceType === "rms" && Array.isArray(data.variants)) {
    nextData.variants = data.variants.map((variant) => ({
      ...variant,
      inventoryMode: "rms",
    }));
  }

  return nextData;
};
