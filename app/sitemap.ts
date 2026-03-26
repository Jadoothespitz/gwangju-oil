import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://gwangju-oil.vercel.app";
  return [
    { url: `${base}/`,    changeFrequency: "daily", priority: 1.0 },
    { url: `${base}/home`, changeFrequency: "daily", priority: 0.9 },
  ];
}
