import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: {
    canonical: "https://gwangju-oil.vercel.app/browse",
  },
};

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
