import { redirect } from "next/navigation";
import { DRIVER_DESTINATION } from "../../lib/cms/site-settings";

export default function DriversPage() {
  redirect(DRIVER_DESTINATION);
}
