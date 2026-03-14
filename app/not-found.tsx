import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-5xl">⛽</div>
      <h1 className="text-xl font-bold text-gray-800">페이지를 찾을 수 없어요</h1>
      <p className="text-sm text-gray-500">
        주소가 잘못됐거나 삭제된 페이지예요.
      </p>
      <Link
        href="/home"
        className="mt-2 px-5 py-2.5 bg-blue-700 text-white text-sm font-medium rounded-lg"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
