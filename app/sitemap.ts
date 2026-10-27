import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/rested", "/p/example", "/open-source", "/privacy"].map((path) => ({
    url: `${site.url}${path}`,
  }));
}
