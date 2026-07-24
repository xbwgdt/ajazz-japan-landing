import type { MetadataRoute } from "next";

const baseUrl = "https://ajazz.jp";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/drivers`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/survey`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
  ];
}
