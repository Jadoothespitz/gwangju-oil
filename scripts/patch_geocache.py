"""
남은 null 항목에 대해 수동 좌표를 패치합니다.
좌표는 근사값이므로 카카오맵에서 확인 후 수정하세요.
"""
import json

MANUAL = {
    # 광주 광산구 송정동 — 광주송정역 기준
    "광주송정역세권 상권활성화구역":        [35.1364, 126.7918],
    # 광주 서구 운천동 — 운천로 일대
    "운천테라스길상인회 골목형상점가":       [35.1477, 126.8659],
    # 광주 북구 중흥동 — 중흥로 일대
    "중흥동 큰샘길 골목형상점가":           [35.1751, 126.9045],
    # 광주 광산구 — 육군 31사단 인근
    "31사단 골목형상점가":                  [35.1908, 126.8370],
    # 광주 서구 치평동 — 광주상공회의소 인근
    "상공회의소누리상인회 골목형상점가":     [35.1530, 126.8525],
    # 광주 광산구 우산동
    "우산골  골목형상점가":                 [35.1772, 126.9287],
    # 광주 북구 운암동 — 운암대자골 마을
    "운암대자골 골목형상점가":              [35.1942, 126.8505],
}

with open("data/market_geocache.json", encoding="utf-8") as f:
    cache = json.load(f)

patched = 0
for name, coords in MANUAL.items():
    if name not in cache or cache[name][0] is None:
        cache[name] = coords
        print(f"  패치: {name} → {coords}")
        patched += 1
    else:
        print(f"  건너뜀 (이미 있음): {name}")

with open("data/market_geocache.json", "w", encoding="utf-8") as f:
    json.dump(cache, f, ensure_ascii=False, indent=2)

print(f"\n완료: {patched}건 패치됨")
print("※ 좌표는 근사값입니다. 카카오맵에서 위치 확인 후 JSON 직접 수정 가능합니다.")
