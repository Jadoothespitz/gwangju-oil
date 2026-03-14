import Link from "next/link";

export const metadata = {
  title: "개인정보처리방침 — 착한 가격 기름집들",
  robots: { index: false },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/home"
            className="text-gray-400 hover:text-gray-600"
            aria-label="홈으로 돌아가기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">개인정보처리방침</h1>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-5 space-y-5 text-sm text-gray-700 leading-relaxed">
          <p>
            <strong>&ldquo;착한 가격 기름집들&rdquo;</strong>(이하 &ldquo;본 서비스&rdquo;)은 비상업 개인 프로젝트로,
            이용자의 개인정보를 다음과 같이 처리합니다.
          </p>

          <section>
            <h2 className="font-semibold text-gray-900 mb-1">1. 수집하는 정보</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>위치정보</strong> — &ldquo;내 주변&rdquo; 기능 이용 시 브라우저의 위치 권한을
                통해 현재 좌표(위도·경도)를 받아, 가까운 주유소를 검색하는 데 사용합니다.
                위치정보는 <strong>서버에 저장하지 않으며</strong>, 검색 요청 처리 후 즉시 폐기됩니다.
              </li>
              <li>
                <strong>즐겨찾기</strong> — 즐겨찾기한 주유소 ID는 브라우저 로컬 저장소(localStorage)에만
                저장되며, 서버로 전송되지 않습니다.
              </li>
              <li>
                <strong>유종 선호</strong> — 휘발유/경유 선택은 브라우저 로컬 저장소에만 저장됩니다.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-1">2. 수집하지 않는 정보</h2>
            <p>
              본 서비스는 계정, 이름, 이메일, 전화번호 등 개인 식별 정보를 수집하지 않습니다.
              쿠키를 사용하지 않으며, 별도의 분석·추적 도구를 설치하지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-1">3. 위치정보 처리</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>위치 권한은 브라우저의 기본 팝업을 통해 요청되며, 거부 시 광주광역시청 좌표를 기본값으로 사용합니다.</li>
              <li>좌표는 API 요청 파라미터로만 전달되며, 데이터베이스에 기록하지 않습니다.</li>
              <li>위치 권한은 브라우저 설정에서 언제든 해제할 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-1">4. 제3자 서비스</h2>
            <p>본 서비스는 다음 외부 서비스를 이용합니다.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>카카오 지도 SDK</strong> — 지도 표시에 사용.{" "}
                <a href="https://www.kakao.com/policy/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                  카카오 개인정보처리방침
                </a>
              </li>
              <li>
                <strong>오피넷 API</strong> — 유가 정보 제공.{" "}
                <a href="https://www.opinet.co.kr" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                  오피넷 웹사이트
                </a>
              </li>
              <li>
                <strong>공공데이터포털</strong> — 광주상생카드 및 온누리상품권 가맹점 목록.{" "}
                <a href="https://www.data.go.kr" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                  공공데이터포털
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-1">5. 문의</h2>
            <p>
              본 서비스에 대한 의견은{" "}
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSfkrHOkpLBrjh40E_J584whovB9kGM4ySqmUu2R7KM6Y8ODcA/viewform?usp=header"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                의견 보내기 폼
              </a>
              을, 버그/개선 제안은{" "}
              <a
                href="https://github.com/Jadoothespitz/gwangju-oil/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                GitHub Issues
              </a>
              를 이용해 주세요.
            </p>
          </section>
        </div>

        <p className="text-center text-[11px] text-gray-400">
          최종 수정일: 2026-03-14
        </p>
      </div>
    </div>
  );
}
