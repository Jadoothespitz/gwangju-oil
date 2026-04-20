"use client";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E8E3D8]">
      <div className="flex items-center justify-between h-12 px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          {/* 브랜드 로고 드롭 아이콘 */}
          <div className="w-7 h-7 bg-[#2046E5] rounded-lg flex items-center justify-center shrink-0">
            <svg width="14" height="16" viewBox="0 0 14 18" fill="none">
              <path
                d="M7 1C4 5.5 1 8.5 1 12a6 6 0 0012 0C13 8.5 10 5.5 7 1z"
                fill="white"
              />
            </svg>
          </div>
          <h1 className="text-sm font-bold text-[#0E0E12] tracking-tight">
            오매나! 광주 기름 싸다!
          </h1>
        </div>
      </div>
    </header>
  );
}
