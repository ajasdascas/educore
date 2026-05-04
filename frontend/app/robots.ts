import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/super-admin/",
        "/school-admin/",
        "/teacher/",
        "/parent/",
        "/student/",
        "/educore/super-admin/",
        "/educore/school-admin/",
        "/educore/teacher/",
        "/educore/parent/",
        "/educore/student/",
      ],
    },
    sitemap: "https://onlineu.mx/educore/sitemap.xml",
  };
}
