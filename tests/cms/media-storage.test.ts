import { describe, expect, it } from "vitest";
import { createR2StorageOptions } from "../../lib/cms/r2-storage";

const completeR2Environment = {
  R2_ACCESS_KEY_ID: "access-key",
  R2_BUCKET: "private-media",
  R2_ENDPOINT: "https://account.r2.cloudflarestorage.com",
  R2_PUBLIC_URL: "https://must-not-be-used.example",
  R2_SECRET_ACCESS_KEY: "super-secret-value",
};

describe("R2 storage configuration", () => {
  it("keeps the integration disabled while preserving fields when no R2 variables exist", () => {
    const options = createR2StorageOptions({});

    expect(options.enabled).toBe(false);
    expect(options.alwaysInsertFields).toBe(true);
    expect(options.collections.media).toMatchObject({ prefix: "products" });
  });

  it("uses Payload access-controlled static delivery for private objects", () => {
    const options = createR2StorageOptions(completeR2Environment);
    const media = options.collections.media;

    expect(options.enabled).toBe(true);
    expect(options.acl).not.toBe("public-read");
    expect(media).not.toHaveProperty("disablePayloadAccessControl");
    expect(media).not.toHaveProperty("generateFileURL");
    expect(JSON.stringify(options)).not.toContain(completeR2Environment.R2_PUBLIC_URL);
  });

  it("rejects production media resources in staging without exposing credentials", () => {
    const secretAccessKey = "staging-must-not-leak";
    const environment = {
      ...completeR2Environment,
      CMS_DEPLOYMENT_ENV: "staging",
      R2_BUCKET: "ajazz-japan-media",
      R2_SECRET_ACCESS_KEY: secretAccessKey,
    };

    expect(() => createR2StorageOptions(environment)).toThrow("Staging R2");

    try {
      createR2StorageOptions(environment);
    } catch (error) {
      expect(String(error)).not.toContain(secretAccessKey);
      expect(String(error)).not.toContain(environment.R2_BUCKET);
    }
  });

  it("rejects normalized production media URLs with the isolated staging bucket", () => {
    for (const publicUrl of [
      "https://media.ajazz.jp/",
      "https://MEDIA.AJAZZ.JP/path?preview=1",
      "https://media.ajazz.jp.",
    ]) {
      expect(() => createR2StorageOptions({
        ...completeR2Environment,
        CMS_DEPLOYMENT_ENV: "staging",
        R2_BUCKET: "ajazz-japan-media-staging",
        R2_PUBLIC_URL: publicUrl,
      })).toThrow("Staging R2");
    }
  });

  it("rejects partial configuration without exposing supplied values", () => {
    expect(() => createR2StorageOptions({
      R2_BUCKET: "private-media",
      R2_SECRET_ACCESS_KEY: "must-never-appear",
    })).toThrow("R2 storage configuration is incomplete");

    try {
      createR2StorageOptions({
        R2_BUCKET: "private-media",
        R2_SECRET_ACCESS_KEY: "must-never-appear",
      });
    } catch (error) {
      expect(String(error)).not.toContain("must-never-appear");
      expect(String(error)).not.toContain("private-media");
    }
  });
});
