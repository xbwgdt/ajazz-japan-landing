import { hasValidCronAuthorization } from "../commerce/cron";

export function createRmsInventoryCronHandler(dependencies: {
  enabled: boolean;
  secret: string | undefined;
  sync(): Promise<{ updated: number; failed: number }>;
}) {
  return async (request: Request) => {
    if (!hasValidCronAuthorization(request, dependencies.secret)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!dependencies.enabled) {
      return Response.json(
        { error: "RMS inventory sync is disabled" },
        { status: 503 },
      );
    }

    try {
      return Response.json(await dependencies.sync());
    } catch {
      return Response.json({ error: "RMS inventory sync failed" }, { status: 500 });
    }
  };
}
