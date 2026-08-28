/**
 * Shared in-memory cache for KSS.Service.Common location lookups.
 *
 * Server-side only. Consumed by:
 *   - app/api/locations/route.ts        — unified LocationSelect endpoint
 *   - app/api/company/[id]/read-view    — resolves IDs to names for the BFF
 *
 * 5-minute TTL is fine for slow-changing reference data (countries, regions, cities).
 */

import {
  getCountriesForSelect,
  getRegionsForSelect,
  getCitiesForSelect,
  type CountrySelectItem,
  type RegionSelectItem,
  type CitySelectItem,
} from '@/services/common-api';

const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

let countriesCache: CacheEntry<CountrySelectItem[]> | null = null;
let regionsCache: CacheEntry<RegionSelectItem[]> | null = null;
let citiesCache: CacheEntry<CitySelectItem[]> | null = null;

function isCacheValid<T>(entry: CacheEntry<T> | null): entry is CacheEntry<T> {
  return entry !== null && Date.now() < entry.expiresAt;
}

export async function getCachedCountries(token: string): Promise<CountrySelectItem[]> {
  if (isCacheValid(countriesCache)) {
    return countriesCache.data;
  }
  const data = await getCountriesForSelect(token);
  countriesCache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
  return data;
}

export async function getCachedRegions(token: string): Promise<RegionSelectItem[]> {
  if (isCacheValid(regionsCache)) {
    return regionsCache.data;
  }
  const data = await getRegionsForSelect(token);
  regionsCache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
  return data;
}

export async function getCachedCities(token: string): Promise<CitySelectItem[]> {
  if (isCacheValid(citiesCache)) {
    return citiesCache.data;
  }
  const data = await getCitiesForSelect(token);
  citiesCache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
  return data;
}
