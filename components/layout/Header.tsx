"use client";

const FEEDBACK_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfkrHOkpLBrjh40E_J584whovB9kGM4ySqmUu2R7KM6Y8ODcA/viewform?usp=header";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 bg-blue-700 text-white shadow-md">
      <div className="flex items-center justify-between h-12 px-4 max-w-lg mx-auto">
        <div className="w-8" />
        <h1 className="text-base font-bold tracking-tight">
          광주상생카드 기름집들⛽
        </h1>
        <a
          href={FEEDBACK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-blue-600 transition-colors"
          aria-label="의견 보내기"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
            />
          </svg>
        </a>
      </div>
    </header>
  );
}
