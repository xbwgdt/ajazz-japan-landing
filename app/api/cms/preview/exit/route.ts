import { draftMode } from "next/headers";

export async function GET(request: Request): Promise<Response> {
  const draft = await draftMode();
  draft.disable();
  return new Response(null, { status: 307, headers: { Location: "/" } });
}
