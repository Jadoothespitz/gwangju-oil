import type { Document, Filter } from "mongodb";
import { getStationsCollection } from "../models/Station";
import type { District, FuelType, SortBy, StationWithDistance } from "@/types";
import { AREAS } from "@/lib/gwangju/areas";

interface FindStationsOptions {
  district?: District;
  area?: string;
  dong?: string;
  fuelType: FuelType;
  sortBy: SortBy;
  sangsaengOnly?: boolean;
  lat?: number;
  lng?: number;
  page: number;
  limit: number;
}

export async function findStations(
  options: FindStationsOptions
): Promise<{ stations: StationWithDistance[]; total: number }> {
  const collection = await getStationsCollection();

  const matchFilter: Filter<Document> = { isActive: true };

  if (options.sangsaengOnly !== false) {
    matchFilter["sangsaeng.matched"] = true;
  }
  if (options.district) {
    matchFilter.district = options.district;
  }
  if (options.area) {
    const areaInfo = AREAS[options.area];
    if (areaInfo) {
      matchFilter.dong = { $in: areaInfo.dongs };
    }
  }
  if (options.dong) {
    matchFilter.dong = options.dong;
  }

  const priceField =
    options.fuelType === "diesel" ? "prices.diesel" : "prices.gasoline";
  const skip = (options.page - 1) * options.limit;

  // 거리순 정렬 + 좌표 있음 → $geoNear 사용
  if (options.sortBy === "distance" && options.lat != null && options.lng != null) {
    const pipeline: Document[] = [
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [options.lng, options.lat],
          },
          distanceField: "distance",
          spherical: true,
          query: matchFilter,
        },
      },
      // distance는 $geoNear가 이미 거리순 정렬
      {
        $facet: {
          stations: [{ $skip: skip }, { $limit: options.limit }],
          total: [{ $count: "count" }],
        },
      },
    ];

    const [result] = await collection.aggregate(pipeline).toArray();
    const stations = (result?.stations ?? []) as unknown as StationWithDistance[];
    const total = result?.total?.[0]?.count ?? 0;

    return { stations, total };
  }

  // 가격순 정렬 (기본)
  // lat/lng가 있으면 거리도 계산해서 반환
  if (options.lat != null && options.lng != null) {
    const pipeline: Document[] = [
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [options.lng, options.lat],
          },
          distanceField: "distance",
          spherical: true,
          query: matchFilter,
        },
      },
      { $sort: { [priceField]: 1, name: 1 } },
      {
        $facet: {
          stations: [{ $skip: skip }, { $limit: options.limit }],
          total: [{ $count: "count" }],
        },
      },
    ];

    const [result] = await collection.aggregate(pipeline).toArray();
    const stations = (result?.stations ?? []) as unknown as StationWithDistance[];
    const total = result?.total?.[0]?.count ?? 0;

    return { stations, total };
  }

  // 좌표 없음: 단순 find
  const sort: Document = { [priceField]: 1, name: 1 };

  const [stations, total] = await Promise.all([
    collection
      .find(matchFilter)
      .sort(sort)
      .skip(skip)
      .limit(options.limit)
      .toArray(),
    collection.countDocuments(matchFilter),
  ]);

  return {
    stations: stations as unknown as StationWithDistance[],
    total,
  };
}

export async function findNearbyStations(options: {
  lat: number;
  lng: number;
  radius: number;
  fuelType: FuelType;
  sortBy: SortBy;
  sangsaengOnly?: boolean;
  limit: number;
}): Promise<StationWithDistance[]> {
  const collection = await getStationsCollection();
  const priceField =
    options.fuelType === "diesel" ? "prices.diesel" : "prices.gasoline";

  const matchStage: Document = {
    isActive: true,
  };

  if (options.sangsaengOnly !== false) {
    matchStage["sangsaeng.matched"] = true;
  }

  const pipeline: Document[] = [
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [options.lng, options.lat],
        },
        distanceField: "distance",
        maxDistance: options.radius,
        spherical: true,
        query: matchStage,
      },
    },
  ];

  if (options.sortBy === "price") {
    pipeline.push({ $sort: { [priceField]: 1 } });
  }
  // distance는 $geoNear가 이미 거리순으로 정렬

  pipeline.push({ $limit: options.limit });

  const stations = await collection.aggregate(pipeline).toArray();
  return stations as unknown as StationWithDistance[];
}

export async function findStationById(
  id: string
): Promise<StationWithDistance | null> {
  const collection = await getStationsCollection();
  const station = await collection.findOne({ uni_id: id });
  return station as unknown as StationWithDistance | null;
}

export async function findStationsByIds(
  ids: string[]
): Promise<StationWithDistance[]> {
  const collection = await getStationsCollection();
  const stations = await collection
    .find({ uni_id: { $in: ids } })
    .toArray();
  return stations as unknown as StationWithDistance[];
}
