import type { CollectionAfterChangeHook } from "payload";

type AuditedProduct = {
  id: number | string;
};

export const writeAuditEvent: CollectionAfterChangeHook<AuditedProduct> = async ({
  data,
  doc,
  operation,
  previousDoc,
  req,
}) => {
  if (!req.user) {
    throw new Error("Authenticated actor required for product audit event.");
  }

  await req.payload.create({
    collection: "audit-events",
    data: {
      action: req.context?.isRestoringVersion === true
        ? "restore"
        : operation === "create" ? "create" : "edit",
      actor: req.user.id,
      subjectType: "product",
      subjectId: String(doc.id),
      details: {
        changedFields: Object.keys(data ?? {}).sort(),
        previousRevision: previousDoc && "editorialRevision" in previousDoc
          ? previousDoc.editorialRevision
          : null,
      },
    },
    overrideAccess: false,
    req,
  });
};
