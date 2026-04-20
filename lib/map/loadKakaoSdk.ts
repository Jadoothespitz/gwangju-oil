let sdkLoadPromise: Promise<void> | null = null;

function tryLoadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => {
      const kakao = (window as any).kakao;
      if (kakao?.maps?.load) {
        kakao.maps.load(() => resolve());
      } else {
        reject(new Error("Kakao SDK loaded but kakao.maps not found"));
      }
    };
    script.onerror = () => reject(new Error(`Failed to load: ${src}`));
    document.head.appendChild(script);
  });
}

export function loadKakaoSdk(): Promise<void> {
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = (async () => {
    if ((window as any).kakao?.maps?.LatLng) return;

    const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
    const directUrl = appKey
      ? `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=services`
      : null;

    if (directUrl) {
      try {
        await tryLoadScript(directUrl);
        return;
      } catch {
        // fallback to proxy
      }
    }

    try {
      await tryLoadScript("/api/kakao-sdk");
      return;
    } catch {
      // both failed
    }

    sdkLoadPromise = null;
    throw new Error("카카오 지도 SDK를 로드할 수 없습니다");
  })();

  sdkLoadPromise.catch(() => {
    sdkLoadPromise = null;
  });
  return sdkLoadPromise;
}
