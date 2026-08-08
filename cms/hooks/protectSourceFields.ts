import { APIError, type CollectionBeforeChangeHook } from "payload";

type SourceVariant = {
  operationalVariantId?: string | null;
  sku?: string | null;
  rmsSkuNumber?: string | null;
  inventoryMode?: string | null;
};

type SourceProduct = {
  id: number | string;
  _status?: string | null;
  editorialRevision?: number | null;
  operationalProductId?: string | null;
  rmsManageNumber?: string | null;
  sourceType?: string | null;
  variants?: SourceVariant[] | null;
};

const productStatusTransitionMarker = Symbol("productStatusTransition");
const productDraftSaveMarker = Symbol("productDraftSave");

// Task 5 will use this server-only context for publication and unpublication writes.
export const productPublicationContext = Object.freeze({ [productStatusTransitionMarker]: true });
export const productDraftSaveContext = Object.freeze({ [productDraftSaveMarker]: true });

function sourceIdentityError(): APIError {
  return new APIError(
    "RMS source identities cannot be changed without explicit source conversion.",
    400,
    { code: "rms_source_identity_immutable" },
  );
}

function operationalProductLinkageError(): APIError {
  return new APIError(
    "Operational product linkage can only be changed by trusted server workflows.",
    400,
    { code: "operational_product_linkage_immutable" },
  );
}

function staleRevisionError(currentRevision: number): APIError {
  return new APIError(
    "The product was updated by another editor.",
    409,
    { code: "stale_editorial_revision", currentRevision },
  );
}

function statusTransitionError(): APIError {
  return new APIError(
    "Product status changes require the publication service.",
    403,
    { code: "product_status_transition_requires_publication_service" },
  );
}

function changed(incoming: unknown, original: unknown): boolean {
  return incoming !== undefined && incoming !== original;
}

function isTrustedProductPublicationContext(context: unknown): boolean {
  return Boolean(
    context
    && typeof context === "object"
    && (context as Record<PropertyKey, unknown>)[productStatusTransitionMarker] === true,
  );
}

function isTrustedDraftSaveContext(context: unknown): boolean {
  return Boolean(
    context
    && typeof context === "object"
    && (context as Record<PropertyKey, unknown>)[productDraftSaveMarker] === true,
  );
}

function requestIsSavingDraft(req: unknown): boolean {
  if (!req || typeof req !== "object") return false;
  const draft = (req as { query?: { draft?: unknown } }).query?.draft;
  return draft === true || draft === "true";
}

function publicationRequested(data: Partial<SourceProduct>): boolean {
  return data._status === "published";
}

function draftSaveOverPublishedRequested(
  data: Partial<SourceProduct>,
  originalDoc: SourceProduct | undefined,
  operation: string,
): boolean {
  return operation === "update" && data._status === "draft" && originalDoc?._status === "published";
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
  req,
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
  const trustedPublication = isTrustedProductPublicationContext(context);
  const originalIsRms = originalDoc?.sourceType === "rms";
  const incomingSourceType = data.sourceType ?? originalDoc?.sourceType;

  if (publicationRequested(data) && !isTrustedProductPublicationContext(context)) {
    throw statusTransitionError();
  }
  if (
    draftSaveOverPublishedRequested(data, originalDoc, operation)
    && !requestIsSavingDraft(req)
    && !isTrustedDraftSaveContext(context)
  ) {
    throw statusTransitionError();
  }

  if (operation === "update" && originalDoc && !allowSourceConversion) {
    if (
      !trustedPublication
      && changed(data.operationalProductId, originalDoc.operationalProductId)
    ) {
      throw operationalProductLinkageError();
    }
    if (changed(data.sourceType, originalDoc.sourceType)) throw sourceIdentityError();
    if (originalIsRms && (
      changed(data.rmsManageNumber, originalDoc.rmsManageNumber)
      || variantIdentityChanged(data.variants, originalDoc.variants)
    )) {
      throw sourceIdentityError();
    }
  }

  const nextData: Partial<SourceProduct> = {
    ...data,
    editorialRevision: operation === "create"
      ? 1
      : trustedPublication
        ? currentRevision
        : currentRevision + 1,
  };

  if (incomingSourceType === "rms" && Array.isArray(data.variants)) {
    nextData.variants = data.variants.map((variant) => ({
      ...variant,
      inventoryMode: "rms",
    }));
  }

  return nextData;
};
