import configPromise from "@payload-config";
import {
  REST_DELETE,
  REST_GET,
  REST_OPTIONS,
  REST_PATCH,
  REST_POST,
  REST_PUT,
} from "@payloadcms/next/routes";

export const GET = REST_GET(configPromise);
export const DELETE = REST_DELETE(configPromise);
export const PATCH = REST_PATCH(configPromise);
export const PUT = REST_PUT(configPromise);
export const OPTIONS = REST_OPTIONS(configPromise);

type RestRouteArgs = {
  params: Promise<{ slug?: string[] }>;
};

const payloadPost = REST_POST(configPromise);

export async function POST(request: Request, args: RestRouteArgs) {
  const { slug = [] } = await args.params;
  if (slug.length === 2 && slug[0] === "admins" && slug[1] === "first-register") {
    return Response.json({ error: "Not Found" }, { status: 404 });
  }
  return payloadPost(request, args);
}
