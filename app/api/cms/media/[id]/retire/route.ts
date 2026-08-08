import configPromise from "@payload-config";
import { NextResponse } from "next/server";
import { APIError, getPayload } from "payload";
import { MediaReferencedError, retireMedia } from "../../../../../../cms/hooks/protectMediaReferences";
import { requireAuthenticatedAdmin } from "../../../../../../lib/cms/auth";
import { isSameOrigin } from "../../../../../../lib/http-security";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = await getPayload({ config: configPromise });
  let admin;
  try {
    admin = await requireAuthenticatedAdmin(request.headers, payload);
  } catch (error) {
    if (error instanceof APIError && error.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }

  try {
    const { id } = await params;
    const media = await retireMedia({ actorId: admin.id, mediaId: id, payload });
    return NextResponse.json({ media });
  } catch (error) {
    if (error instanceof MediaReferencedError) {
      return NextResponse.json(
        { code: "media_referenced", references: error.references },
        { status: 409 },
      );
    }
    throw error;
  }
}
