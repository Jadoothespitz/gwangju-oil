import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "실험실 — 경제적 주유소 찾기 | 오매나기름집",
  description: "내 차 연비와 이동 거리를 반영해 진짜 가장 경제적인 주유소를 찾아줍니다.",
};

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
