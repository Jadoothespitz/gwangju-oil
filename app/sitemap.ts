import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://gwangju-oil.vercel.app";
  return [
    { url: `${base}/home`,      changeFrequency: "daily",   priority: 1.0 },
    { url: `${base}/browse`,    changeFrequency: "daily",   priority: 0.9 },
    { url: `${base}/favorites`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/privacy`,   changeFrequency: "yearly",  priority: 0.2 },
  ];
}
