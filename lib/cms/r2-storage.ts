import type { S3StorageOptions } from "@payloadcms/storage-s3";
import { assertR2EnvironmentSafety } from "../deployment/staging-safety";

type R2Environment = Record<string, string | undefined>;

const R2_CONFIGURATION_ERROR = "R2 storage configuration is incomplete";

export function createR2StorageOptions(environment: R2Environment): S3StorageOptions {
  assertR2EnvironmentSafety(environment);

  const bucket = environment.R2_BUCKET;
  const endpoint = environment.R2_ENDPOINT;
  const accessKeyId = environment.R2_ACCESS_KEY_ID;
  const secretAccessKey = environment.R2_SECRET_ACCESS_KEY;
  const values = [bucket, endpoint, accessKeyId, secretAccessKey];
  const supplied = values.filter((value) => Boolean(value)).length;

  if (supplied !== 0 && supplied !== values.length) {
    throw new Error(R2_CONFIGURATION_ERROR);
  }

  const enabled = supplied === values.length;
  return {
    alwaysInsertFields: true,
    bucket: bucket ?? "",
    collections: { media: { prefix: "products" } },
    config: {
      credentials: {
        accessKeyId: accessKeyId ?? "",
        secretAccessKey: secretAccessKey ?? "",
      },
      endpoint,
      forcePathStyle: true,
      region: "auto",
    },
    enabled,
  };
}
