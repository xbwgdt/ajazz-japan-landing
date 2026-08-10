import { APIError, type CollectionBeforeChangeHook } from "payload";

type SourceVariant = {
  id?: string | null;
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
  sourceSnapshot?: unknown;
  sourceUpdatedAt?: string | null;
  variants?: SourceVariant[] | null;
};

const productStatusTransitionMarker = Symbol("productStatusTransition");
const productDraftSaveMarker = Symbol("productDraftSave");
const productRmsSourceIngestionMarker = Symbol("productRmsSourceIngestion");

// Task 5 will use this server-only context for publication and unpublication writes.
export const productPublicationContext = Object.freeze({ [productStatusTransitionMarker]: true });
export const productDraftSaveContext = Object.freeze({ [productDraftSaveMarker]: true });
export const productRmsSourceIngestionContext = Object.freeze({ [productRmsSourceIngestionMarker]: true });

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

function normalizedIdentity(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
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

function isTrustedRmsSourceIngestionContext(context: unknown): boolean {
  return Boolean(
    context
    && typeof context === "object"
    && (context as Record<PropertyKey, unknown>)[productRmsSourceIngestionMarker] === true,
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
    const operationalVariantId = normalizedIdentity(incoming.operationalVariantId);
    const rmsSkuNumber = normalizedIdentity(incoming.rmsSkuNumber);
    const original = operationalVariantId
      ? originalVariants.find((variant) => normalizedIdentity(variant.operationalVariantId) === operationalVariantId)
      : rmsSkuNumber
        ? originalVariants.find((variant) => normalizedIdentity(variant.rmsSkuNumber) === rmsSkuNumber)
        : originalVariants[index];
    if (!original) return true;
    return (incoming.operationalVariantId !== undefined
        && normalizedIdentity(incoming.operationalVariantId) !== normalizedIdentity(original.operationalVariantId))
      || (incoming.rmsSkuNumber !== undefined
        && normalizedIdentity(incoming.rmsSkuNumber) !== normalizedIdentity(original.rmsSkuNumber))
      || (incoming.sku !== undefined
        && normalizedIdentity(incoming.sku) !== normalizedIdentity(original.sku));
  });
}

function restoredVariantsWithCurrentIdentity(
  restored: SourceVariant[],
  current: SourceVariant[],
  rmsProduct: boolean,
): SourceVariant[] {
  const restoredFor = (variant: SourceVariant) => restored.find((candidate) => (
    (candidate.id && candidate.id === variant.id)
    || (candidate.operationalVariantId && candidate.operationalVariantId === variant.operationalVariantId)
    || (candidate.rmsSkuNumber && candidate.rmsSkuNumber === variant.rmsSkuNumber)
    || candidate.sku === variant.sku
  ));
  const preserve = (editorial: SourceVariant, identity: SourceVariant): SourceVariant => ({
    ...editorial,
    id: identity.id,
    operationalVariantId: identity.operationalVariantId,
    rmsSkuNumber: identity.rmsSkuNumber,
    sku: identity.sku,
    inventoryMode: identity.inventoryMode,
  });

  if (rmsProduct) {
    return current.map((identity) => preserve(restoredFor(identity) ?? identity, identity));
  }
  return restored.map((variant) => {
    const identity = current.find((candidate) => restoredFor(candidate) === variant);
    if (identity) return preserve(variant, identity);
    return {
      ...variant,
      operationalVariantId: undefined,
      rmsSkuNumber: undefined,
      inventoryMode: "manual",
    };
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
  const restoringVersion = req?.context?.isRestoringVersion === true;
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
  const trustedRmsSourceIngestion = isTrustedRmsSourceIngestionContext(context);
  const originalIsRms = originalDoc?.sourceType === "rms";
  const incomingSourceType = data.sourceType ?? originalDoc?.sourceType;

  if (restoringVersion && operation === "update" && originalDoc) {
    const restoredVariants = Array.isArray(data.variants) ? data.variants : [];
    const variants = restoredVariantsWithCurrentIdentity(
      restoredVariants,
      originalDoc.variants ?? [],
      originalDoc.sourceType === "rms",
    );
    return {
      ...data,
      _status: "draft",
      editorialRevision: currentRevision + 1,
      operationalProductId: originalDoc.operationalProductId,
      rmsManageNumber: originalDoc.rmsManageNumber,
      sourceType: originalDoc.sourceType,
      variants,
    };
  }

  if (
    operation === "create"
    && !trustedRmsSourceIngestion
    && (data.sourceSnapshot !== undefined || data.sourceUpdatedAt !== undefined)
  ) {
    throw sourceIdentityError();
  }

  if (
    operation === "create"
    && !allowSourceConversion
    && !trustedPublication
    && !trustedRmsSourceIngestion
    && data.operationalProductId != null
  ) {
    throw operationalProductLinkageError();
  }

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
    if (!trustedRmsSourceIngestion && (
      changed(data.sourceSnapshot, originalDoc.sourceSnapshot)
      || changed(data.sourceUpdatedAt, originalDoc.sourceUpdatedAt)
    )) {
      throw sourceIdentityError();
    }
    if (
      !trustedPublication
      && !trustedRmsSourceIngestion
      && changed(data.operationalProductId, originalDoc.operationalProductId)
    ) {
      throw operationalProductLinkageError();
    }
    if (!trustedRmsSourceIngestion && changed(data.sourceType, originalDoc.sourceType)) throw sourceIdentityError();
    if (!trustedRmsSourceIngestion && originalIsRms && (
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
