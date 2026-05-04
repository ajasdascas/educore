import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://onlineu.mx/educore/",
      lastModified: new Date("2026-05-04"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://onlineu.mx/educore/login/",
      lastModified: new Date("2026-05-04"),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: "https://onlineu.mx/educore/reset-password/",
      lastModified: new Date("2026-05-04"),
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];
}
