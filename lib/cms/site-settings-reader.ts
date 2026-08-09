import { getPayload } from "payload";
import {
  DEFAULT_SITE_SETTINGS,
  normalizeSiteSettings,
  type SiteSettingsViewModel,
} from "./site-settings";

interface SiteSettingsPayloadReader {
  findGlobal(args: {
    depth: number;
    draft: boolean;
    overrideAccess: boolean;
    slug: "site-settings";
  }): Promise<unknown>;
}

interface SiteSettingsReaderDependencies {
  loadPayload?: () => Promise<SiteSettingsPayloadReader>;
}

async function loadConfiguredPayload(): Promise<SiteSettingsPayloadReader> {
  const { default: config } = await import("../../payload.config");
  return getPayload({ config }) as unknown as SiteSettingsPayloadReader;
}

export async function getPublishedSiteSettings(
  dependencies: SiteSettingsReaderDependencies = {},
): Promise<SiteSettingsViewModel> {
  try {
    const payload = await (dependencies.loadPayload ?? loadConfiguredPayload)();
    const settings = await payload.findGlobal({
      depth: 1,
      draft: false,
      overrideAccess: true,
      slug: "site-settings",
    });
    return normalizeSiteSettings(settings);
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
}
