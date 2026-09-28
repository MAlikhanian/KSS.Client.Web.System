/**
 * KSS Common Service (KSS.Service.Common)
 *
 * Server-side only functions for common lookup data (Language, Country, Region, City).
 * Base URL from COMMON_API_BASE_URL env (set in .env / ConfigMap / k8s).
 * All endpoints require JWT Bearer token from Auth service.
 */

function getBaseUrl(): string {
  const baseUrl = process.env.COMMON_API_BASE_URL;
  if (!baseUrl) {
    console.error(
      '[Common API] COMMON_API_BASE_URL is not set in environment variables',
    );
    throw new Error(
      'COMMON_API_BASE_URL environment variable is required but not set.',
    );
  }
  return baseUrl;
}

// ============================================
// Language
// ============================================

export interface LanguageDto {
  id: number;
  code: string;
  name: string;
  nativeName: string | null;
  isActive: boolean;
}

/** GET /Api/Language/ToListAll — returns all languages */
export async function getLanguages(token: string): Promise<LanguageDto[]> {
  const url = `${getBaseUrl()}/Api/Language/ToListAll`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    console.error('[Common API] getLanguages failed:', { status: response.status, errorText });
    throw new Error(`Failed to fetch languages: ${response.status}`);
  }
  return response.json();
}

// ============================================
// DTOs
// ============================================

export interface CountryDto {
  id: number;
  code: string;
  code3: string;
  nativeName: string | null;
  callingCode: number | null;
  postalCodeLength: number;
}

export interface CountryTranslationDto {
  countryId: number;
  languageId: number;
  name: string;
}

export interface RegionDto {
  id: number;
  countryId: number;
  code: string;
}

export interface RegionTranslationDto {
  regionId: number;
  languageId: number;
  name: string;
}

export interface CityDto {
  id: number;
  countryId: number;
  regionId: number | null;
  code: string | null;
}

export interface CityTranslationDto {
  cityId: number;
  languageId: number;
  name: string;
}

// ============================================
// Country endpoints
// ============================================

/** GET /Api/Country/ToListAll — returns all countries */
export async function getCountries(token: string): Promise<CountryDto[]> {
  const url = `${getBaseUrl()}/Api/Country/ToListAll`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    console.error('[Common API] getCountries failed:', { status: response.status, errorText });
    throw new Error(`Failed to fetch countries: ${response.status}`);
  }
  return response.json();
}

/** GET /Api/CountryTranslation/ToListAll — returns all country translations */
export async function getCountryTranslations(
  token: string,
  filter?: Partial<CountryTranslationDto>,
): Promise<CountryTranslationDto[]> {
  const url = `${getBaseUrl()}/Api/CountryTranslation/ToListAll`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    console.error('[Common API] getCountryTranslations failed:', { status: response.status, errorText });
    throw new Error(`Failed to fetch country translations: ${response.status}`);
  }
  return response.json();
}

// ============================================
// Region endpoints
// ============================================

/** GET /Api/Region/ToListAll — returns all regions */
export async function getRegions(token: string): Promise<RegionDto[]> {
  const url = `${getBaseUrl()}/Api/Region/ToListAll`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    console.error('[Common API] getRegions failed:', { status: response.status, errorText });
    throw new Error(`Failed to fetch regions: ${response.status}`);
  }
  return response.json();
}

/** GET /Api/Region/ToListAll — get all regions then filter by countryId */
export async function getRegionsByCountry(
  token: string,
  countryId: number,
): Promise<RegionDto[]> {
  const url = `${getBaseUrl()}/Api/Region/ToListAll`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    console.error('[Common API] getRegionsByCountry failed:', { status: response.status, errorText });
    throw new Error(`Failed to fetch regions by country: ${response.status}`);
  }
  const allRegions: RegionDto[] = await response.json();
  return allRegions.filter((r) => r.countryId === countryId);
}

/** GET /Api/RegionTranslation/ToListAll — returns all region translations */
export async function getRegionTranslations(
  token: string,
  filter?: Partial<RegionTranslationDto>,
): Promise<RegionTranslationDto[]> {
  const url = `${getBaseUrl()}/Api/RegionTranslation/ToListAll`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    console.error('[Common API] getRegionTranslations failed:', { status: response.status, errorText });
    throw new Error(`Failed to fetch region translations: ${response.status}`);
  }
  return response.json();
}

// ============================================
// City endpoints
// ============================================

/** GET /Api/City/ToListAll — returns all cities */
export async function getCities(token: string): Promise<CityDto[]> {
  const url = `${getBaseUrl()}/Api/City/ToListAll`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    console.error('[Common API] getCities failed:', { status: response.status, errorText });
    throw new Error(`Failed to fetch cities: ${response.status}`);
  }
  return response.json();
}

/** GET /Api/City/ToListAll — get all cities then filter by regionId */
export async function getCitiesByRegion(
  token: string,
  regionId: number,
): Promise<CityDto[]> {
  const url = `${getBaseUrl()}/Api/City/ToListAll`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    console.error('[Common API] getCitiesByRegion failed:', { status: response.status, errorText });
    throw new Error(`Failed to fetch cities by region: ${response.status}`);
  }
  const allCities: CityDto[] = await response.json();
  return allCities.filter((c) => c.regionId === regionId);
}

/** GET /Api/CityTranslation/ToListAll — returns all city translations */
export async function getCityTranslations(
  token: string,
  filter?: Partial<CityTranslationDto>,
): Promise<CityTranslationDto[]> {
  const url = `${getBaseUrl()}/Api/CityTranslation/ToListAll`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    console.error('[Common API] getCityTranslations failed:', { status: response.status, errorText });
    throw new Error(`Failed to fetch city translations: ${response.status}`);
  }
  return response.json();
}

// ============================================
// Address / Phone labels (shared lookups)
// ============================================

export interface AddressLabelDto {
  id: number;
  code: string;
}

export interface AddressLabelTranslationDto {
  addressLabelId: number;
  languageId: number;
  name: string;
}

export interface PhoneLabelDto {
  id: number;
  code: string;
}

export interface PhoneLabelTranslationDto {
  phoneLabelId: number;
  languageId: number;
  name: string;
}

/** GET /Api/AddressLabel/ToListAll */
export async function getAddressLabels(token: string): Promise<AddressLabelDto[]> {
  const url = `${getBaseUrl()}/Api/AddressLabel/ToListAll`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    console.error('[Common API] getAddressLabels failed:', { status: response.status, errorText });
    throw new Error(`Failed to fetch address labels: ${response.status}`);
  }
  return response.json();
}

/** GET /Api/AddressLabelTranslation/ToListAll */
export async function getAddressLabelTranslations(token: string): Promise<AddressLabelTranslationDto[]> {
  const url = `${getBaseUrl()}/Api/AddressLabelTranslation/ToListAll`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    console.error('[Common API] getAddressLabelTranslations failed:', { status: response.status, errorText });
    throw new Error(`Failed to fetch address label translations: ${response.status}`);
  }
  return response.json();
}

/** GET /Api/PhoneLabel/ToListAll */
export async function getPhoneLabels(token: string): Promise<PhoneLabelDto[]> {
  const url = `${getBaseUrl()}/Api/PhoneLabel/ToListAll`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    console.error('[Common API] getPhoneLabels failed:', { status: response.status, errorText });
    throw new Error(`Failed to fetch phone labels: ${response.status}`);
  }
  return response.json();
}

/** GET /Api/PhoneLabelTranslation/ToListAll */
export async function getPhoneLabelTranslations(token: string): Promise<PhoneLabelTranslationDto[]> {
  const url = `${getBaseUrl()}/Api/PhoneLabelTranslation/ToListAll`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    console.error('[Common API] getPhoneLabelTranslations failed:', { status: response.status, errorText });
    throw new Error(`Failed to fetch phone label translations: ${response.status}`);
  }
  return response.json();
}

// ============================================
// Joined location data for LocationSelect
// ============================================

/** Language IDs used for translation lookups */
const PERSIAN_LANGUAGE_ID = 12;
const ENGLISH_LANGUAGE_ID = 10;

export interface CountrySelectItem {
  id: string;
  name: string;
  nameEn: string;
  code: string;
}

export interface RegionSelectItem {
  id: string;
  name: string;
  nameEn: string;
  countryId: string;
}

export interface CitySelectItem {
  id: string;
  name: string;
  nameEn: string;
  provinceId: string;
}

/**
 * Get all countries joined with Persian (fa) and English (en) translations.
 * Returns data shaped for the LocationSelect component (string IDs).
 */
export async function getCountriesForSelect(
  token: string,
): Promise<CountrySelectItem[]> {
  const [countries, allTranslations] = await Promise.all([
    getCountries(token),
    getCountryTranslations(token),
  ]);

  const persianMap = new Map<number, string>();
  const englishMap = new Map<number, string>();
  for (const t of allTranslations) {
    if (t.languageId === PERSIAN_LANGUAGE_ID) {
      persianMap.set(t.countryId, t.name);
    } else if (t.languageId === ENGLISH_LANGUAGE_ID) {
      englishMap.set(t.countryId, t.name);
    }
  }

  return countries.map((c) => ({
    id: String(c.id),
    name: persianMap.get(c.id) || c.nativeName || c.code,
    nameEn: englishMap.get(c.id) || c.code,
    code: c.code,
  }));
}

/**
 * Get all regions joined with Persian (fa) and English (en) translations.
 * Returns data shaped for the LocationSelect component (string IDs).
 */
export async function getRegionsForSelect(
  token: string,
): Promise<RegionSelectItem[]> {
  const [regions, allTranslations] = await Promise.all([
    getRegions(token),
    getRegionTranslations(token),
  ]);

  const persianMap = new Map<number, string>();
  const englishMap = new Map<number, string>();
  for (const t of allTranslations) {
    if (t.languageId === PERSIAN_LANGUAGE_ID) {
      persianMap.set(t.regionId, t.name);
    } else if (t.languageId === ENGLISH_LANGUAGE_ID) {
      englishMap.set(t.regionId, t.name);
    }
  }

  return regions.map((r) => ({
    id: String(r.id),
    name: persianMap.get(r.id) || r.code,
    nameEn: englishMap.get(r.id) || r.code,
    countryId: String(r.countryId),
  }));
}

/**
 * Get all cities joined with Persian (fa) and English (en) translations.
 * Returns data shaped for the LocationSelect component (string IDs).
 * Note: provinceId maps to regionId in the backend.
 */
export async function getCitiesForSelect(
  token: string,
): Promise<CitySelectItem[]> {
  const [cities, allTranslations] = await Promise.all([
    getCities(token),
    getCityTranslations(token),
  ]);

  const persianMap = new Map<number, string>();
  const englishMap = new Map<number, string>();
  for (const t of allTranslations) {
    if (t.languageId === PERSIAN_LANGUAGE_ID) {
      persianMap.set(t.cityId, t.name);
    } else if (t.languageId === ENGLISH_LANGUAGE_ID) {
      englishMap.set(t.cityId, t.name);
    }
  }

  return cities.map((c) => ({
    id: String(c.id),
    name: persianMap.get(c.id) || c.code || `City ${c.id}`,
    nameEn: englishMap.get(c.id) || c.code || `City ${c.id}`,
    provinceId: c.regionId != null ? String(c.regionId) : '',
  }));
}

// Institution moved to Person service — see person-api.ts

// ============================================
// Module / Resource (authorization metadata)
// ============================================

export interface Module {
  id: string;
  code: string;
  createdBy: string;
  createdAt: string;
  updatedBy?: string | null;
  updatedAt?: string | null;
  deletedBy?: string | null;
  deletedAt?: string | null;
  isActive: boolean;
}

export interface Resource {
  id: string;
  moduleId: string;
  code: string;
  createdBy: string;
  createdAt: string;
  updatedBy?: string | null;
  updatedAt?: string | null;
  deletedBy?: string | null;
  deletedAt?: string | null;
  isActive: boolean;
}

export interface ModuleTranslation {
  moduleId: string;
  languageId: number;
  name: string;
}

export interface ResourceTranslation {
  resourceId: string;
  languageId: number;
  name: string;
}

/** GET /Api/Module/ToListAll — returns all modules */
export async function listModules(token: string): Promise<Module[]> {
  const url = `${getBaseUrl()}/Api/Module/ToListAll`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    console.error('[Common API] listModules failed:', { status: response.status, errorText });
    throw new Error(`Failed to fetch modules: ${response.status}`);
  }
  return response.json();
}

/** GET /Api/ModuleTranslation/ToListAll — returns all module translations */
export async function listModuleTranslations(
  token: string,
): Promise<ModuleTranslation[]> {
  const url = `${getBaseUrl()}/Api/ModuleTranslation/ToListAll`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    console.error('[Common API] listModuleTranslations failed:', { status: response.status, errorText });
    throw new Error(`Failed to fetch module translations: ${response.status}`);
  }
  return response.json();
}

/** GET /Api/Resource/ToListAll — returns all resources */
export async function listResources(token: string): Promise<Resource[]> {
  const url = `${getBaseUrl()}/Api/Resource/ToListAll`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    console.error('[Common API] listResources failed:', { status: response.status, errorText });
    throw new Error(`Failed to fetch resources: ${response.status}`);
  }
  return response.json();
}

/** GET /Api/ResourceTranslation/ToListAll — returns all resource translations */
export async function listResourceTranslations(
  token: string,
): Promise<ResourceTranslation[]> {
  const url = `${getBaseUrl()}/Api/ResourceTranslation/ToListAll`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    console.error('[Common API] listResourceTranslations failed:', { status: response.status, errorText });
    throw new Error(`Failed to fetch resource translations: ${response.status}`);
  }
  return response.json();
}
