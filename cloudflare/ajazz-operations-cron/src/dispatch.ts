export interface CronEnvironment {
  AJAZZ_ORIGIN: string;
  CRON_SECRET: string;
}

export interface CronTask {
  path: "/api/cron/release-reservations" | "/api/cron/rms-inventory";
}

export function tasksForCron(cron: string): CronTask[] {
  if (cron === "*/10 * * * *") return [{ path: "/api/cron/release-reservations" }];
  if (cron === "*/15 * * * *") return [{ path: "/api/cron/rms-inventory" }];
  return [];
}

export async function dispatchCronTask(
  task: CronTask,
  environment: CronEnvironment,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  const response = await fetcher(new URL(task.path, environment.AJAZZ_ORIGIN), {
    method: "GET",
    headers: { Authorization: `Bearer ${environment.CRON_SECRET}` },
  });
  if (!response.ok) {
    throw new Error(`AJAZZ cron endpoint failed with ${response.status}`);
  }
}
