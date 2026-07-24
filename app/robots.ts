import type { MetadataRoute } from "next";

const baseUrl = "https://ajazz.jp";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/survey/admin", "/admin"] },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
