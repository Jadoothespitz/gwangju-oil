"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/browse", label: "탐색", icon: SearchIcon },
  { href: "/nearby", label: "내 주변", icon: LocationIcon },
  { href: "/favorites", label: "즐겨찾기", icon: HeartIcon },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg transition-colors",
                isActive
                  ? "text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <item.icon active={isActive} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function SearchIcon({ active }: { active: boolean }) {
  return (
    <svg
      className="w-5 h-5"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}

function LocationIcon({ active }: { active: boolean }) {
  return (
    <svg
      className="w-5 h-5"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      {!active && <circle cx="12" cy="9" r="2.5" />}
    </svg>
  );
}

function HeartIcon({ active }: { active: boolean }) {
  return (
    <svg
      className="w-5 h-5"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
