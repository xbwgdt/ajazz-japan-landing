import { pathToFileURL } from "node:url";
import configPromise from "@payload-config";
import { getPayload, type Payload } from "payload";

const FIRST_ADMIN_EMAIL = "xiet@a-jazz.com";

type BootstrapAdminInput = {
  email: string;
  password: string;
};

type BootstrapEnvironment = Record<string, string | undefined>;

type BootstrapLogger = {
  error: (message: string) => void;
  log: (message: string) => void;
};

function validateBootstrapInput(input: BootstrapAdminInput): BootstrapAdminInput {
  const email = input.email.trim().toLowerCase();
  if (email !== FIRST_ADMIN_EMAIL) {
    throw new Error(`BOOTSTRAP_ADMIN_EMAIL must be ${FIRST_ADMIN_EMAIL}`);
  }
  if (input.password.length < 16) {
    throw new Error("BOOTSTRAP_ADMIN_PASSWORD must contain at least 16 characters");
  }
  return { email, password: input.password };
}

export function readBootstrapAdminCredentials(
  environment: BootstrapEnvironment = process.env,
): BootstrapAdminInput {
  return validateBootstrapInput({
    email: environment.BOOTSTRAP_ADMIN_EMAIL ?? "",
    password: environment.BOOTSTRAP_ADMIN_PASSWORD ?? "",
  });
}

export async function bootstrapAdmin(
  payload: Payload,
  input: BootstrapAdminInput,
): Promise<"created" | "exists"> {
  const credentials = validateBootstrapInput(input);
  const existing = await payload.find({
    collection: "admins",
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { email: { equals: credentials.email } },
  });
  if (existing.docs.length > 0) return "exists";

  await payload.create({
    collection: "admins",
    data: {
      email: credentials.email,
      password: credentials.password,
      role: "administrator",
    },
    overrideAccess: true,
  });
  return "created";
}

export async function runBootstrapAdmin(
  environment: BootstrapEnvironment = process.env,
  initializePayload: () => Promise<Payload> = () => getPayload({ config: configPromise }),
) {
  const credentials = readBootstrapAdminCredentials(environment);
  const payload = await initializePayload();
  return bootstrapAdmin(payload, credentials);
}

export async function runBootstrapAdminCli(
  environment: BootstrapEnvironment = process.env,
  initializePayload: () => Promise<Payload> = () => getPayload({ config: configPromise }),
  logger: BootstrapLogger = console,
): Promise<number> {
  try {
    const result = await runBootstrapAdmin(environment, initializePayload);
    logger.log(result === "created"
      ? "Administrator account created."
      : "Administrator account already exists.");
    return 0;
  } catch {
    logger.error("Administrator bootstrap failed (ADMIN_BOOTSTRAP_FAILED).");
    return 1;
  }
}

const executedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === executedPath) {
  void runBootstrapAdminCli().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
