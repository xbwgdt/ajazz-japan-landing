import { APIError, type CollectionBeforeChangeHook, type PayloadRequest } from "payload";
import { lockMediaRows } from "../services/mediaConcurrency";

type Relation = { id?: number | string | null } | number | string | null | undefined;
type ProductMediaData = {
  galleryImageIds?: Relation[] | null;
  primaryImageId?: Relation;
  sceneImageIds?: Relation[] | null;
  seoImageId?: Relation;
  variants?: Array<{
    imageId?: Relation;
    thumbnailId?: Relation;
  }> | null;
};

function relationID(value: Relation): number | string | undefined {
  if (typeof value === "number" || typeof value === "string") return value;
  if (value && (typeof value.id === "number" || typeof value.id === "string")) return value.id;
  return undefined;
}

function collectMediaIDs(data: ProductMediaData): Array<number | string> {
  const values: Relation[] = [
    data.primaryImageId,
    ...(data.galleryImageIds ?? []),
    ...(data.sceneImageIds ?? []),
    data.seoImageId,
    ...(data.variants ?? []).flatMap((variant) => [variant.thumbnailId, variant.imageId]),
  ];
  const unique = new Map<string, number | string>();
  for (const value of values) {
    const id = relationID(value);
    if (id !== undefined) unique.set(String(id), id);
  }
  return [...unique.values()].sort((left, right) => Number(left) - Number(right));
}

// Task 9 site-settings hooks should call this service before accepting media relationships.
export async function assertNoRetiredMediaReferences(
  req: PayloadRequest,
  data: ProductMediaData,
): Promise<void> {
  const mediaIDs = collectMediaIDs(data);
  if (mediaIDs.length === 0) return;

  await lockMediaRows(req, mediaIDs);

  const retired = await req.payload.find({
    collection: "media",
    depth: 0,
    overrideAccess: true,
    pagination: false,
    req,
    where: {
      and: [
        { id: { in: mediaIDs } },
        { retiredAt: { exists: true } },
      ],
    },
  });
  if (retired.docs.length === 0) return;

  throw new APIError("Products cannot reference retired media.", 400, {
    code: "retired_media_reference",
    mediaIds: retired.docs.map((media) => media.id),
  });
}

export const rejectRetiredMediaReferences: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  const current = originalDoc as ProductMediaData | undefined;
  const incoming = data as ProductMediaData;
  await assertNoRetiredMediaReferences(req, {
    galleryImageIds: incoming.galleryImageIds !== undefined
      ? incoming.galleryImageIds
      : current?.galleryImageIds,
    primaryImageId: incoming.primaryImageId !== undefined
      ? incoming.primaryImageId
      : current?.primaryImageId,
    sceneImageIds: incoming.sceneImageIds !== undefined
      ? incoming.sceneImageIds
      : current?.sceneImageIds,
    seoImageId: incoming.seoImageId !== undefined ? incoming.seoImageId : current?.seoImageId,
    variants: incoming.variants !== undefined ? incoming.variants : current?.variants,
  });
  return data;
};
