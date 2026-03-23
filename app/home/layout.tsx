import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: {
    canonical: "https://gwangju-oil.vercel.app/home",
  },
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
