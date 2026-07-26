import { dispatchCronTask, tasksForCron, type CronEnvironment } from "./dispatch";

interface ScheduledController {
  cron: string;
}

export default {
  async scheduled(controller: ScheduledController, environment: CronEnvironment): Promise<void> {
    await Promise.all(tasksForCron(controller.cron).map((task) => dispatchCronTask(task, environment)));
  },
};
