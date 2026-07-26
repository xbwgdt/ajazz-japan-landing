import type { MetadataRoute } from "next";

const baseUrl = "https://ajazz.jp";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/drivers`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/legal`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.4 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.4 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.4 },
  ];
}
