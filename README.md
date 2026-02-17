# 광주 주유소 가격비교 ⛽

광주광역시 상생카드 가맹 주유소의 실시간 유가를 비교하는 웹 서비스입니다.

> **[gwangju-oil.vercel.app](https://gwangju-oil.vercel.app)**

## 왜 만들었나요?

광주상생카드 참 좋은데... 명절에는 할인도 팍팍 해주고 좋은데... 상생카드 쓸 수 있는 주유소 목록은 광주광역시 홈페이지에 나와 있는 읽기 힘든 엑셀자료뿐... 매번 검색해서 일일히 유가 비교하기에는 지갑 얇은 내연기관차량 오너로서는 넘나 힘든 일이어라ㅠㅠ (심지어 어디는 상호 바꾸고 심지어 폐업한곳도 있었음;;!!)
그런데 엥 요즘 바이브코딩이 대세군요?! 냅다 클코 깔고 만들어달라 했답니다 (토큰 살살 녹은건 비밀😇) 조금 일이 커진거같지만 아무튼 봐줄만한 정도는 된 것 같아 깃헙에 내놓았답니다
지금은 프로토타입이라 개선해야 할 사항이 넘나 많지만 이걸 두들겨보고 들춰보고 찔러보고 여러모로 써 주시고 의견이나 가르침 주신다면 감사하겟습니당 사실 저는 R 깔짝 쓰다가 바이브코딩 접하고 냉큼 해본거라 많이 알지는 못하지만 질문 주신다면 제가 아는 범위 내에서... 열심히 답드리겟습니다 오늘도 좋은하루~~~

## 주요 기능

- **주유소 탐색** — 광주 5개 구별 · 지역별 필터링, 휘발유/경유 전환, 가격순/거리순 정렬
- **내 주변 주유소** — GPS 기반 반경 검색 (1~10km), 거리순 자동 정렬
- **즐겨찾기** — 자주 가는 주유소 저장 (브라우저 로컬 저장)
- **실시간 유가** — 오피넷 API 연동, 주기적 가격 갱신
- **카카오 지도** — 주유소 위치 마커 표시, 상단 고정 + 리스트 스크롤 레이아웃
- **모바일 최적화** — 반응형 디자인, PWA 지원

## 기술 스택

| 분류 | 기술 |
|------|------|
| **프레임워크** | Next.js 16 (App Router, Turbopack) |
| **언어** | TypeScript 5.9 |
| **스타일링** | Tailwind CSS 4 |
| **데이터 페칭** | SWR |
| **데이터베이스** | MongoDB Atlas (2dsphere 지리공간 인덱스) |
| **지도** | Kakao Maps SDK |
| **배포** | Vercel |

## 데이터 소스

| 소스 | 용도 |
|------|------|
| [오피넷 API](https://www.opinet.co.kr) | 실시간 주유소 유가 정보 |
| [카카오 개발자](https://developers.kakao.com) | 지도 표시 및 주소 → 좌표 변환 |
| [공공데이터포털](https://www.data.go.kr) | 상생카드 가맹점 목록 |

## 시작하기

### 사전 준비

- Node.js 18+
- MongoDB Atlas 클러스터
- API 키: 오피넷, 카카오 개발자, (선택) 공공데이터포털

### 환경변수 설정

`.env.example`을 `.env.local`로 복사한 후 값을 채워 넣으세요.

```bash
cp .env.example .env.local
```

```env
OPINET_API_KEY=...           # 오피넷 API 키
NEXT_PUBLIC_KAKAO_MAP_KEY=...# 카카오 JavaScript 키
KAKAO_REST_API_KEY=...       # 카카오 REST API 키
MONGODB_URI=...              # MongoDB 연결 문자열
CRON_SECRET=...              # 가격 갱신 엔드포인트 보안 키
```

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 데이터 초기화 (상생카드 데이터 다운로드 → 지오코딩 → DB 시딩)
npm run seed

# 오피넷 가격 연동
npm run opinet:link

# 개발 서버 시작
npm run dev
```

`http://localhost:3000`에서 확인할 수 있습니다.

### 데이터 파이프라인

```
상생카드 가맹점 다운로드 → 카카오 지오코딩 → MongoDB 시딩 → 오피넷 매칭 → 가격 갱신
```

| 명령어 | 설명 |
|--------|------|
| `npm run seed` | 전체 파이프라인 (다운로드 → 지오코딩 → DB 저장) |
| `npm run seed:download` | 상생카드 데이터 다운로드만 |
| `npm run seed:geocode` | 주소 → 좌표 변환만 |
| `npm run opinet:link` | 오피넷 주유소 매칭 + 초기 가격 수집 |
| `npm run prices:refresh` | 가격 갱신 (주기적 실행용) |

## 프로젝트 구조

```
app/
├── browse/          # 주유소 탐색 페이지
├── nearby/          # 내 주변 주유소
├── favorites/       # 즐겨찾기
├── station/         # 주유소 상세
└── api/
    ├── stations/    # 주유소 목록 · 상세 · 근처 검색
    ├── prices/      # 가격 갱신
    └── kakao-sdk/   # 카카오 SDK 프록시

lib/
├── db/              # MongoDB 연결 · 모델 · 쿼리
├── opinet/          # 오피넷 API 클라이언트
├── matching/        # 상생카드 ↔ 오피넷 매칭 알고리즘
├── geo/             # 좌표 변환 (WGS84 ↔ KATEC), 거리 계산
├── gwangju/         # 광주 구·지역 데이터
└── hooks/           # React 커스텀 훅

scripts/             # 데이터 파이프라인 스크립트
components/          # UI 컴포넌트 (지도, 카드, 필터 등)
```

## 배포

Vercel에 배포되어 있습니다. GitHub 푸시 시 자동 배포됩니다.

Vercel 대시보드에서 위의 환경변수를 모두 설정해야 합니다. MongoDB Atlas의 Network Access에서 `0.0.0.0/0`을 허용해야 Vercel 서버리스 함수에서 접근 가능합니다.

## 라이선스

MIT
