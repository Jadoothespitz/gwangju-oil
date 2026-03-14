#!/usr/bin/env python3
"""
find_stations.py
----------------
온누리 가맹점 데이터(광주)에서 주유소 후보를 추출하고
오피넷 API로 교차검증하여 점수 매긴 결과를 JSON으로 출력.

사용법:
  # Step 2까지만 (후보 추출):
  python find_stations.py --step 2

  # Step 3까지 전체 실행:
  OPINET_KEY=xxx KAKAO_KEY=xxx python find_stations.py
  python find_stations.py --opinet-key xxx --kakao-key xxx

  # 최종 확정 파일 생성 (threshold 조정 후):
  python find_stations.py --finalize --threshold 0.5
"""

import os
import json
import math
import sys
import argparse

import pandas as pd
import requests
from pyproj import Transformer
from rapidfuzz import fuzz
from tqdm import tqdm

# ── 파일 경로 ──────────────────────────────────────────────────────────────────
INPUT_CSV         = "data/onnuri_20250731.csv"
OUTPUT_CANDIDATES = "data/output_candidates.json"
OUTPUT_SCORED     = "data/output_scored.json"
OUTPUT_FINAL      = "data/output_final.json"
GEOCACHE_FILE     = "data/market_geocache.json"
MANUAL_OVERRIDES  = "data/manual_overrides.json"

# ── 키워드 사전 ────────────────────────────────────────────────────────────────
GAS_KEYWORDS = [
    '주유소', '주유', '휘발유', '경유', '석유', '오일',
    '연료', '기름', 'oil', 'gas',
]
BRAND_KEYWORDS = [
    'gs', '칼텍스', 'sk', '에쓰오일', 's-oil', 's오일',
    '현대오일', '오일뱅크', '알뜰주유',
]
LPG_KEYWORDS = ['lpg', '가스충전', 'cng', '수소충전']

# ── 오피넷 설정 ────────────────────────────────────────────────────────────────
OPINET_API_URL = "https://www.opinet.co.kr/api/aroundAll.do"
PRODCD_LIST    = ["B027", "D047"]   # 휘발유, 경유 (B034=고급휘발유이므로 제외)
OPINET_RADIUS  = 5000               # 최대 반경 5000m

# 광주 전체 커버를 위한 격자점 (WGS84) — 약 6km 간격, 4×5 grid
# 광주 범위: 35.07~35.27N, 126.73~126.99E
GWANGJU_GRID = [
    (lat, lon)
    for lat in [35.08, 35.14, 35.20, 35.26]
    for lon in [126.74, 126.81, 126.87, 126.93, 126.99]
]

# ── KATEC 좌표 변환 (오피넷 API는 KATEC 좌표 사용) ────────────────────────────
# KATEC: TM, Bessel 1841, 원점 38N/128E, 가산수치 400000/600000
_KATEC_PROJ4 = (
    "+proj=tmerc +ellps=bessel +lat_0=38 +lon_0=128 +k=0.9999 "
    "+x_0=400000 +y_0=600000 "
    "+towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43 "
    "+units=m +no_defs"
)
_tf_to_katec   = Transformer.from_crs("EPSG:4326", _KATEC_PROJ4, always_xy=True)
_tf_from_katec = Transformer.from_crs(_KATEC_PROJ4, "EPSG:4326", always_xy=True)

def _wgs84_to_katec(lat: float, lon: float) -> tuple[float, float]:
    x, y = _tf_to_katec.transform(lon, lat)
    return x, y

def _katec_to_wgs84(x: float, y: float) -> tuple[float, float]:
    lon, lat = _tf_from_katec.transform(x, y)
    return lat, lon

# ── 카카오 지오코딩 ────────────────────────────────────────────────────────────
KAKAO_URL = "https://dapi.kakao.com/v2/local/search/keyword.json"

# ── 점수 설정 ──────────────────────────────────────────────────────────────────
FUZZY_THRESHOLD = 70    # Step 2 후보 선정용 partial_ratio 임계값
DIST_RADIUS_KM  = 2.0   # 거리 점수 정규화 기준 (2km 이내 만점)
TOP_N_MATCHES   = 3     # 후보별 상위 N개 오피넷 매칭 저장


# ══════════════════════════════════════════════════════════════════════════════
# Step 1: 데이터 로드
# ══════════════════════════════════════════════════════════════════════════════

def load_data() -> pd.DataFrame:
    df = pd.read_csv(INPUT_CSV, encoding='utf-8-sig')
    # R/Python export 시 컬럼명에 생긴 점(.) 제거
    df.columns = [c.replace('.', ' ').strip() for c in df.columns]
    # 불필요한 인덱스 컬럼 제거
    df = df.loc[:, ~df.columns.str.match(r'^Unnamed')]
    print(f"[Step 1] {INPUT_CSV} 로드 완료: {len(df):,}행")
    # 광주광역시 필터 (소재지 컬럼)
    if '소재지' in df.columns:
        before = len(df)
        df = df[df['소재지'] == '광주'].reset_index(drop=True)
        print(f"[Step 1] 소재지=광주 필터 후: {len(df):,}행 (전체 {before:,}행 중)")
    return df


# ══════════════════════════════════════════════════════════════════════════════
# Step 2: 주유소 후보 추출
# ══════════════════════════════════════════════════════════════════════════════

def _is_gas_candidate(name: str, items: str) -> tuple[bool, bool]:
    """(is_candidate, lpg_flag) 반환."""
    name_l  = (name  or '').lower()
    items_l = (items or '').lower()

    # LPG 여부 (플래그용, 여기서 제외하지는 않음)
    lpg_flag = any(k in name_l + items_l for k in LPG_KEYWORDS)

    # 취급품목에서 주유소 키워드 매칭
    for kw in GAS_KEYWORDS:
        if fuzz.partial_ratio(kw, items_l) >= FUZZY_THRESHOLD:
            return True, lpg_flag

    # 가맹점명에서 주유소/브랜드 키워드 매칭
    for kw in GAS_KEYWORDS + BRAND_KEYWORDS:
        if fuzz.partial_ratio(kw, name_l) >= FUZZY_THRESHOLD:
            return True, lpg_flag

    return False, lpg_flag


def extract_candidates(df: pd.DataFrame) -> list[dict]:
    # 시장명 컬럼 이름 탐색 (CSV 컬럼명이 조금씩 다를 수 있음)
    market_col = next(
        (c for c in df.columns if '시장명' in c or '상점가' in c),
        None
    )
    if market_col is None:
        raise ValueError("소속 시장명 컬럼을 찾을 수 없습니다. 컬럼 목록: " + str(list(df.columns)))

    candidates = []
    for _, row in tqdm(df.iterrows(), total=len(df), desc="[Step 2] 후보 스캔"):
        name   = str(row.get('가맹점명',  '') or '')
        items  = str(row.get('취급품목',  '') or '')
        market = str(row.get(market_col, '') or '')

        is_cand, lpg_flag = _is_gas_candidate(name, items)
        if is_cand:
            candidates.append({
                '가맹점명': name,
                '소속시장명': market,
                '취급품목': items,
                'lpg_flag': lpg_flag,
            })

    print(f"[Step 2] 후보 {len(candidates)}건 추출")
    return candidates


# ══════════════════════════════════════════════════════════════════════════════
# Step 3-A: 오피넷 주유소 목록
# ══════════════════════════════════════════════════════════════════════════════

def fetch_opinet_stations(opinet_key: str) -> list[dict]:
    """광주 격자점 × 유종(B027/D047) 조회 후 UNI_ID 기준 중복 제거.
    반경 최대 5000m이므로 격자(4×5=20점) × 2유종 = 최대 40회 API 호출."""
    all_stations: dict[str, dict] = {}
    total = len(GWANGJU_GRID) * len(PRODCD_LIST)
    call_n = 0

    for lat, lon in GWANGJU_GRID:
        kx, ky = _wgs84_to_katec(lat, lon)
        for prodcd in PRODCD_LIST:
            call_n += 1
            params = {
                'code':   opinet_key,
                'x':      f'{kx:.2f}',
                'y':      f'{ky:.2f}',
                'radius': OPINET_RADIUS,
                'prodcd': prodcd,
                'sort':   2,        # 거리순
                'out':    'json',
            }
            try:
                resp = requests.get(OPINET_API_URL, params=params, timeout=30)
                resp.raise_for_status()
                data = resp.json()
            except Exception as e:
                print(f"  [API 오류] 격자({lat:.2f},{lon:.2f}) prodcd={prodcd}: {e}")
                continue

            oil_list = data.get('RESULT', {}).get('OIL', [])
            new = 0
            for s in oil_list:
                sid = s.get('UNI_ID', '')
                if not sid or sid in all_stations:
                    continue
                try:
                    kx_s = float(s.get('GIS_X_COOR') or 0)
                    ky_s = float(s.get('GIS_Y_COOR') or 0)
                except (TypeError, ValueError):
                    kx_s, ky_s = 0.0, 0.0
                s_lat, s_lon = _katec_to_wgs84(kx_s, ky_s) if kx_s else (0.0, 0.0)
                all_stations[sid] = {
                    'station_id': sid,
                    '상호':        s.get('OS_NM', ''),
                    'katec_x':    kx_s,
                    'katec_y':    ky_s,
                    'lat':        s_lat,
                    'lon':        s_lon,
                }
                new += 1
            print(f"  [{call_n:2d}/{total}] ({lat:.2f},{lon:.2f}) {prodcd}: {len(oil_list)}건 (신규 {new}건)")

    stations = list(all_stations.values())
    print(f"[Step 3-A] 완료 — 총 {len(stations)}개 주유소 (광주 전역)")
    return stations


# ══════════════════════════════════════════════════════════════════════════════
# Step 3-B: 소속 시장명 → 좌표 (지오코딩)
# ══════════════════════════════════════════════════════════════════════════════

def _load_geocache() -> dict:
    if os.path.exists(GEOCACHE_FILE):
        with open(GEOCACHE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}


def _save_geocache(cache: dict) -> None:
    with open(GEOCACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)


import re as _re

# 제거할 접미사 목록 (앞에서부터 순서대로 매칭)
_STRIP_SUFFIXES = [
    '골목형상점가', '전통시장', '상권활성화구역',
    '상인회', '번영회', '상점가', '상가', '시장',
    '역세권', '가구의거리', '의거리', '먹자골목', '먹자',
]

# 광주 위경도 범위 (경계 밖 결과 거부용)
_GWANGJU_LAT = (34.9, 35.35)
_GWANGJU_LON = (126.65, 127.05)

def _in_gwangju(lat: float, lon: float) -> bool:
    return (_GWANGJU_LAT[0] <= lat <= _GWANGJU_LAT[1] and
            _GWANGJU_LON[0] <= lon <= _GWANGJU_LON[1])

# 도로명/동명/역명 추출 패턴
_LOC_PATTERNS = [
    _re.compile(r'[가-힣]+대로'),
    _re.compile(r'[가-힣]+로(?=[\d가\s]|$)'),   # 충장로45가 → 충장로
    _re.compile(r'[가-힣]+로(?![가-힣])'),        # 월산로, 하남대로 끝 등
    _re.compile(r'[가-힣]+길(?![가-힣])'),        # 큰샘길, 테라스길 등
    _re.compile(r'[가-힣]+역(?![가-힣])'),        # 송정역 등
    _re.compile(r'[가-힣]+동'),                   # 동천동, 중흥동 — 뒤에 뭐가 오든 추출
]


def _simplify_iterative(name: str) -> str:
    """접미사를 더 이상 줄어들지 않을 때까지 반복 제거."""
    result = name.strip()
    changed = True
    while changed:
        changed = False
        for sfx in _STRIP_SUFFIXES:
            if result.endswith(sfx):
                result = result[:-len(sfx)].strip()
                changed = True
                break  # 하나 제거 후 처음부터 재시도
    # 충장로45가, 동천동먹자골목1번가 등 끝에 붙은 숫자+번가/가 제거
    result = _re.sub(r'\d+번가$', '', result).strip()
    result = _re.sub(r'\d+가$', '', result).strip()
    return result


def _extract_location_token(name: str) -> str | None:
    """도로명/동명/역명 패턴을 추출해 반환."""
    for pat in _LOC_PATTERNS:
        m = pat.search(name)
        if m:
            return m.group(0)
    return None


def _kakao_search(query: str, kakao_key: str) -> tuple[float | None, float | None]:
    resp = requests.get(
        KAKAO_URL,
        headers={'Authorization': f'KakaoAK {kakao_key}'},
        params={'query': query, 'size': 5},
        timeout=10,
    )
    resp.raise_for_status()
    docs = resp.json().get('documents', [])
    for doc in docs:
        lat, lon = float(doc['y']), float(doc['x'])
        if _in_gwangju(lat, lon):
            return lat, lon
    return None, None


def _geocode_market(market: str, kakao_key: str, cache: dict) -> tuple[float | None, float | None]:
    if market in cache:
        v = cache[market]
        return (v[0], v[1]) if v and v[0] is not None else (None, None)

    simplified = _simplify_iterative(market)
    location   = _extract_location_token(simplified)

    # 쿼리 우선순위: 원본 → 접미사 제거 → 도로/동명 추출
    candidates = [market, simplified, location]
    seen: set[str] = set()
    queries: list[str] = []
    for base in candidates:
        if base and base.strip() not in ('', '광주'):
            q = base.strip() + ' 광주'
            if q not in seen:
                seen.add(q)
                queries.append(q)

    for q in queries:
        try:
            lat, lon = _kakao_search(q, kakao_key)
            if lat is not None:
                cache[market] = [lat, lon]
                return lat, lon
        except Exception as e:
            print(f"  [geocode] '{q}' 실패: {e}")

    cache[market] = [None, None]
    return None, None


# ══════════════════════════════════════════════════════════════════════════════
# Step 3-C: 후보 × 오피넷 매칭 점수
# ══════════════════════════════════════════════════════════════════════════════

def _score_one(
    candidate: dict,
    stations: list[dict],
    market_kx: float | None,   # 시장 KATEC X (미리 변환된 값)
    market_ky: float | None,   # 시장 KATEC Y
) -> list[dict]:
    name_l     = candidate['가맹점명'].lower()
    items_l    = candidate['취급품목'].lower()
    has_coords = market_kx is not None and market_ky is not None

    scored = []
    for s in stations:
        s_name = (s['상호'] or '').lower()

        # 이름 유사도 (0~1)
        name_sim = fuzz.token_set_ratio(name_l, s_name) / 100.0

        # 거리 점수 (0~1) — KATEC 유클리드 거리 (미터 단위)
        if has_coords and s['katec_x'] and s['katec_y']:
            dist_m     = math.sqrt((market_kx - s['katec_x'])**2 + (market_ky - s['katec_y'])**2)
            dist_km    = dist_m / 1000.0
            dist_score = max(0.0, 1.0 - dist_km / DIST_RADIUS_KM)
        else:
            dist_km    = None
            dist_score = 0.0

        # 취급품목 키워드 매칭 (0~1)
        kw_score = max(
            (fuzz.partial_ratio(kw, items_l) / 100.0 for kw in GAS_KEYWORDS),
            default=0.0,
        )

        # 합산 (좌표 없으면 거리 가중치를 이름 유사도로 흡수)
        if not has_coords:
            total = name_sim * 0.9 + kw_score * 0.1
        else:
            total = name_sim * 0.7 + dist_score * 0.2 + kw_score * 0.1

        scored.append({
            'station_id':  s['station_id'],
            '상호':         s['상호'],
            'distance_km': round(dist_km, 3) if dist_km is not None else None,
            'name_sim':    round(name_sim * 100, 1),
            'total_score': round(total, 4),
        })

    scored.sort(key=lambda x: x['total_score'], reverse=True)
    return scored[:TOP_N_MATCHES]


def score_candidates(
    candidates: list[dict],
    stations: list[dict],
    kakao_key: str,
) -> list[dict]:
    geocache = _load_geocache()

    # 고유 시장명 일괄 지오코딩 (캐시 활용)
    unique_markets = list({c['소속시장명'] for c in candidates})
    print(f"[Step 3-B] 고유 시장명 {len(unique_markets)}건 지오코딩 중...")
    for mkt in tqdm(unique_markets, desc="  Geocoding"):
        _geocode_market(mkt, kakao_key, geocache)
    _save_geocache(geocache)

    geocode_ok   = sum(1 for v in geocache.values() if v and v[0] is not None)
    geocode_fail = len(geocache) - geocode_ok
    print(f"  → 성공 {geocode_ok}건 / 실패 {geocode_fail}건 (실패 시 이름 유사도만 사용)")

    # 시장명별 KATEC 좌표 미리 계산 (inner loop 반복 방지)
    market_katec: dict[str, tuple[float | None, float | None]] = {}
    for mkt, v in geocache.items():
        if v and v[0] is not None:
            market_katec[mkt] = _wgs84_to_katec(v[0], v[1])
        else:
            market_katec[mkt] = (None, None)

    # 후보 × 오피넷 점수 계산
    print(f"[Step 3-C] {len(candidates)}건 × {len(stations)}개 주유소 점수 계산 중...")
    results = []
    for cand in tqdm(candidates, desc="  Scoring"):
        wgs = geocache.get(cand['소속시장명'], [None, None])
        lat, lon   = (wgs[0], wgs[1]) if wgs and wgs[0] is not None else (None, None)
        kx,  ky    = market_katec.get(cand['소속시장명'], (None, None))
        matches    = _score_one(cand, stations, kx, ky)
        best_score = matches[0]['total_score'] if matches else 0.0

        results.append({
            **cand,
            'market_lat':     lat,
            'market_lon':     lon,
            'opinet_matches': matches,
            'best_score':     best_score,
        })

    results.sort(key=lambda x: x['best_score'], reverse=True)
    return results


# ══════════════════════════════════════════════════════════════════════════════
# Step 4: 최종 확정 파일 생성
# ══════════════════════════════════════════════════════════════════════════════

def finalize(threshold: float) -> None:
    if not os.path.exists(OUTPUT_SCORED):
        print(f"ERROR: {OUTPUT_SCORED} 없음. 먼저 Step 3를 실행하세요.", file=sys.stderr)
        sys.exit(1)

    with open(OUTPUT_SCORED, 'r', encoding='utf-8') as f:
        scored = json.load(f)

    final = []
    for item in scored:
        if item['best_score'] < threshold:
            continue
        if item.get('lpg_flag') and not item['opinet_matches']:
            continue  # LPG 전용 의심되고 오피넷 매칭도 없으면 제외

        best = item['opinet_matches'][0] if item['opinet_matches'] else {}
        final.append({
            '가맹점명':            item['가맹점명'],
            '소속시장명':           item['소속시장명'],
            'opinet_station_id':  best.get('station_id', ''),
            'opinet_상호':         best.get('상호', ''),
            # 주소는 aroundAll.do 응답에 없음 — 필요 시 ⑩ 주유소상세정보 API로 별도 조회
            'opinet_주소':         '',
            'market_위도':         item.get('market_lat'),
            'market_경도':         item.get('market_lon'),
            'match_score':        item['best_score'],
        })

    # ── 수동 오버라이드 적용 ─────────────────────────────────────────────────────
    if os.path.exists(MANUAL_OVERRIDES):
        with open(MANUAL_OVERRIDES, 'r', encoding='utf-8') as f:
            overrides = json.load(f)

        scored_by_name = {item['가맹점명'].strip(): item for item in scored}
        final_by_name  = {item['가맹점명'].strip(): i for i, item in enumerate(final)}

        applied = 0
        for ov in overrides:
            name = ov['가맹점명'].strip()
            if name in final_by_name:
                # 이미 threshold를 통과한 항목 → opinet_id/상호만 교체
                i = final_by_name[name]
                final[i]['opinet_station_id'] = ov['opinet_station_id']
                final[i]['opinet_상호']        = ov['opinet_상호']
                final[i]['opinet_주소']        = ov.get('opinet_주소', '')
                final[i]['match_score']        = 1.0
            else:
                # threshold 미달 항목 → scored에서 시장 좌표 가져와 추가
                src = scored_by_name.get(name, {})
                final.append({
                    '가맹점명':           ov['가맹점명'],
                    '소속시장명':          ov.get('소속시장명', src.get('소속시장명', '')),
                    'opinet_station_id': ov['opinet_station_id'],
                    'opinet_상호':        ov['opinet_상호'],
                    'opinet_주소':        ov.get('opinet_주소', ''),
                    'market_위도':        src.get('market_lat'),
                    'market_경도':        src.get('market_lon'),
                    'match_score':       1.0,
                })
            applied += 1

        print(f"[Step 4] 수동 오버라이드 {applied}건 적용")

    with open(OUTPUT_FINAL, 'w', encoding='utf-8') as f:
        json.dump(final, f, ensure_ascii=False, indent=2)

    print(f"[Step 4] threshold={threshold} 기준 {len(final)}건 → {OUTPUT_FINAL}")


# ══════════════════════════════════════════════════════════════════════════════
# main
# ══════════════════════════════════════════════════════════════════════════════

def main() -> None:
    parser = argparse.ArgumentParser(description="온누리 주유소 추출 스크립트")
    parser.add_argument('--opinet-key', default=os.environ.get('OPINET_KEY'),
                        help='오피넷 API Key (또는 환경변수 OPINET_KEY)')
    parser.add_argument('--kakao-key',  default=os.environ.get('KAKAO_KEY'),
                        help='카카오 REST API Key (또는 환경변수 KAKAO_KEY)')
    parser.add_argument('--step', type=int, default=3, choices=[2, 3],
                        help='2=후보 추출만, 3=전체 실행 (기본값 3)')
    parser.add_argument('--finalize', action='store_true',
                        help='output_scored.json → output_final.json 변환')
    parser.add_argument('--threshold', type=float, default=0.5,
                        help='--finalize 시 사용할 점수 임계값 (기본 0.5)')
    args = parser.parse_args()

    # ── Step 4 단독 실행 ─────────────────────────────────────────────────────
    if args.finalize:
        finalize(args.threshold)
        return

    # ── Step 1 + 2 ───────────────────────────────────────────────────────────
    df         = load_data()
    candidates = extract_candidates(df)

    with open(OUTPUT_CANDIDATES, 'w', encoding='utf-8') as f:
        json.dump(candidates, f, ensure_ascii=False, indent=2)
    print(f"[Step 2] 저장 → {OUTPUT_CANDIDATES}\n")

    if args.step < 3:
        return

    # ── Step 3 ───────────────────────────────────────────────────────────────
    if not args.opinet_key:
        print("ERROR: --opinet-key 또는 OPINET_KEY 환경변수 필요", file=sys.stderr)
        sys.exit(1)
    if not args.kakao_key:
        print("ERROR: --kakao-key 또는 KAKAO_KEY 환경변수 필요", file=sys.stderr)
        sys.exit(1)

    stations = fetch_opinet_stations(args.opinet_key)
    scored   = score_candidates(candidates, stations, args.kakao_key)

    with open(OUTPUT_SCORED, 'w', encoding='utf-8') as f:
        json.dump(scored, f, ensure_ascii=False, indent=2)
    print(f"\n[Step 3] 저장 → {OUTPUT_SCORED}")
    print(f"\n완료! {OUTPUT_SCORED} 에서 best_score 분포 확인 후 threshold 결정 →")
    print(f"  python find_stations.py --finalize --threshold 0.5")


if __name__ == '__main__':
    main()
