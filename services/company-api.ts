/**
 * KSS Company Service (KSS.Service.Company)
 *
 * Server-side only functions for company data.
 * Base URL from COMPANY_API_BASE_URL env (set in .env / ConfigMap / k8s).
 * All endpoints require JWT Bearer token from Auth service.
 */

function getBaseUrl(): string {
  const baseUrl = process.env.COMPANY_API_BASE_URL;
  if (!baseUrl) {
    console.error(
      '[Company API] COMPANY_API_BASE_URL is not set in environment variables',
    );
    throw new Error(
      'COMPANY_API_BASE_URL environment variable is required but not set.',
    );
  }
  return baseUrl;
}

function getHeaders(token: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Read the backend response body and throw it as an Error.
 * The middleware returns JSON like {"statusCode":400,"message":"Clean message","details":null}
 * apiErrorResponse() in lib/api-error.ts parses this JSON and extracts the clean message.
 */
async function throwApiError(response: Response, fallback: string): Promise<never> {
  const text = await response.text();
  // Backend errors come back as JSON: { message: "ERROR_CODE" } (or a sentence).
  // Extract the message field so error.message is the clean code/text — not the
  // raw JSON envelope. Falls back to raw text for non-JSON responses.
  let message = text;
  if (text) {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object' && 'message' in parsed && parsed.message != null) {
        message = String(parsed.message);
      }
    } catch {
      // Not JSON — keep raw text as-is.
    }
  }
  throw new Error(message || `${fallback}: ${response.status}`);
}

/** CompanySelectDto from Company service */
export interface CompanyNameHistoryDto {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface CompanySelectDto {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  nationalId: string | null;
  nameHistory: CompanyNameHistoryDto[];
}

/**
 * Get company select list
 * GET /Api/CompanySelect/List?languageId=12&query=...
 *
 * Returns companies joined with their translated name in a single query.
 */
/**
 * GET /Api/Company/Count — returns the scalar total. Backend keeps the
 * count in its own service; the dashboard only sees the number, not rows.
 */
export async function getCompanyCount(token: string): Promise<number> {
  const url = `${getBaseUrl()}/Api/Company/Count`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(token),
    cache: 'no-store',
  });
  if (!response.ok) await throwApiError(response, 'Failed to fetch company count');
  const dto: { count: number } = await response.json();
  return dto.count;
}

/** Wire shape returned by GET /Api/Access/ListAllGrants. */
export interface AccessGrantPair {
  companyId: string;
  grantedToPersonId: string;
}

/**
 * GET /Api/Access/ListAllGrants — flat list of (CompanyId, GrantedToPersonId)
 * pairs across the tenant. The dashboard frontend joins this with Auth's
 * person→user map and Person's CreatedBy list to compute the highlights tile.
 */
export async function listAccessGrantPairs(token: string): Promise<AccessGrantPair[]> {
  const url = `${getBaseUrl()}/Api/Access/ListAllGrants`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(token),
    cache: 'no-store',
  });
  if (!response.ok) await throwApiError(response, 'Failed to fetch access grant pairs');
  return response.json();
}

export async function getCompanySelectList(
  token: string,
  languageId: number = 12,
  query?: string,
): Promise<CompanySelectDto[]> {
  const params = new URLSearchParams();
  params.set('languageId', languageId.toString());
  if (query) {
    params.set('query', query);
  }

  const url = `${getBaseUrl()}/Api/CompanySelect/List?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) await throwApiError(response, 'Failed to fetch company list');

  return response.json();
}

/** CompanyDetailDto from Company service */
export interface CompanyDetailDto {
  id: string;
  companyPersianName: string;
  companyLatinName: string | null;
  formerNames: string | null;
  registrationDate: string;
  registrationNo: string;
  nationalId: string;
  economicCode: string;
  registrationCountryId: number;
  registrationRegionId: number;
  registrationCityId: number;
  foundedDate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  nameHistory: CompanyNameHistoryDto[];
}

/**
 * Get company detail by ID
 * GET /Api/CompanyDetail/{id}?languageId=12
 */
export async function getCompanyDetail(
  token: string,
  id: string,
  languageId: number = 12,
): Promise<CompanyDetailDto> {
  const url = `${getBaseUrl()}/Api/CompanyDetail/${id}?languageId=${languageId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) await throwApiError(response, 'Failed to fetch company detail');

  return response.json();
}

/**
 * Update company detail
 * PUT /Api/CompanyDetail/{id}
 */
export async function updateCompanyDetail(
  token: string,
  id: string,
  data: Partial<CompanyDetailDto>,
): Promise<CompanyDetailDto> {
  const url = `${getBaseUrl()}/Api/CompanyDetail/${id}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
    cache: 'no-store',
  });

  if (!response.ok) await throwApiError(response, 'Failed to update company');

  return response.json();
}

/** CompanyReadViewDto — consolidated read-only view from KSS.Service.Company */
export interface CompanyReadViewNameHistoryTranslationDto {
  languageId: number;
  name: string;
}

export interface CompanyReadViewNameHistoryDto {
  id: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
  translations: CompanyReadViewNameHistoryTranslationDto[];
}

export interface CompanyReadViewEmailDto {
  id: string;
  labelId: number;
  labelName: string;
  emailAddress: string;
  isPrimary: boolean;
  isVerified: boolean;
}

export interface CompanyReadViewPhoneDto {
  id: string;
  labelId: number;
  labelName: string;
  countryId: number;
  phoneNumber: string;
  isPrimary: boolean;
  isVerified: boolean;
}

export interface CompanyReadViewAddressDto {
  id: string;
  labelId: number;
  labelName: string;
  countryId: number;
  regionId: number;
  cityId: number;
  postalCode: string;
  street1: string;
  street2: string | null;
  isPrimary: boolean;
  isVerified: boolean;
}

export interface CompanyReadViewDto {
  id: string;
  companyPersianName: string;
  companyLatinName: string | null;
  registrationDate: string;
  registrationNo: string;
  nationalId: string;
  economicCode: string;
  registrationCountryId: number;
  registrationRegionId: number;
  registrationCityId: number;
  foundedDate: string | null;
  isActive: boolean;
  nameHistory: CompanyReadViewNameHistoryDto[];
  emails: CompanyReadViewEmailDto[];
  phones: CompanyReadViewPhoneDto[];
  addresses: CompanyReadViewAddressDto[];
}

/**
 * Get the consolidated read-only company view.
 * GET /Api/CompanyReadView/{id}?languageId=12
 */
export async function getCompanyReadView(
  token: string,
  id: string,
  languageId: number = 12,
): Promise<CompanyReadViewDto> {
  const url = `${getBaseUrl()}/Api/CompanyReadView/${id}?languageId=${languageId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) await throwApiError(response, 'Failed to fetch company read-view');

  return response.json();
}

/**
 * CompanyInsertDto — for creating a new company via CompanyOperation/Insert.
 * The backend generates ALL GUIDs (company id + name-history id) as v7; the
 * frontend never sends them. `id`/`companyId`/`nameHistoryId` are kept optional
 * only for legacy callers — the backend ignores them.
 */
export interface CompanyInsertDto {
  id?: string;
  legalFormId: number;
  industryId?: number | null;
  registrationDate: string;
  registrationNo: string;
  nationalId: string;
  economicCode: string;
  registrationCountryId: number;
  registrationRegionId: number;
  registrationCityId: number;
  foundedDate?: string | null;
  isActive: boolean;
  translations: Array<{
    companyId?: string;
    languageId: number;
    name: string;
    shortName?: string | null;
  }>;
  nameHistory?: {
    startDate: string;
    endDate?: string | null;
    translations: Array<{
      nameHistoryId?: string;
      languageId: number;
      name: string;
      shortName?: string | null;
    }>;
  } | null;
}

/**
 * Create a new company
 * POST /Api/CompanyOperation/Insert
 */
export async function createCompany(
  token: string,
  data: CompanyInsertDto,
): Promise<{ id: string }> {
  const url = `${getBaseUrl()}/Api/CompanyOperation/Insert`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
    cache: 'no-store',
  });

  if (!response.ok) await throwApiError(response, 'Failed to create company');

  return response.json();
}

// ============================================
// Company Translation (main company name per language)
// ============================================

export interface CompanyTranslationDto {
  companyId: string;
  languageId: number;
  name: string;
  shortName?: string | null;
  description?: string | null;
}

/** PUT /Api/Translation/UpdateDto — update company translation */
export async function updateCompanyTranslation(
  token: string,
  data: CompanyTranslationDto,
): Promise<void> {
  const url = `${getBaseUrl()}/Api/Translation/UpdateDto`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!response.ok) await throwApiError(response, 'Failed to update company translation');
}

/** GET /Api/Translation/ToListAll — list all company translations, filter client-side */
export async function listCompanyTranslations(
  token: string,
  filter: { companyId: string },
): Promise<CompanyTranslationDto[]> {
  const url = `${getBaseUrl()}/Api/Translation/ToListAll`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
  if (!response.ok) await throwApiError(response, 'Failed to list company translations');
  const all: CompanyTranslationDto[] = await response.json();
  return all.filter((t) => t.companyId === filter.companyId);
}

/** POST /Api/Translation/Add — add company translation */
export async function addCompanyTranslation(
  token: string,
  data: CompanyTranslationDto,
): Promise<void> {
  const url = `${getBaseUrl()}/Api/Translation/Add`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!response.ok) await throwApiError(response, 'Failed to add company translation');
}

/** DELETE /Api/Translation/Remove — delete company translation */
export async function deleteCompanyTranslation(
  token: string,
  data: CompanyTranslationDto,
): Promise<void> {
  const url = `${getBaseUrl()}/Api/Translation/Remove`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!response.ok) await throwApiError(response, 'Failed to delete company translation');
}

// ============================================
// Company Name History CRUD
// ============================================

export interface CompanyNameHistoryTranslationDto {
  nameHistoryId: string;
  languageId: number;
  name: string;
  shortName?: string | null;
}

/** GET /Api/NameHistory/ToListAll — list all name history entries, filter client-side */
export async function listCompanyNameHistory(
  token: string,
  filter: { companyId: string },
): Promise<{ id: string; companyId: string; startDate: string; endDate: string | null }[]> {
  const url = `${getBaseUrl()}/Api/NameHistory/ToListAll`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
  if (!response.ok) await throwApiError(response, 'Failed to list name history');
  const all = await response.json();
  return all.filter((h: { companyId: string }) => h.companyId === filter.companyId);
}

/** POST /Api/NameHistory/AddDto — create name history entry via DTO */
export async function addCompanyNameHistory(
  token: string,
  data: {
    id: string;
    companyId: string;
    startDate: string;
    endDate: string | null;
    description?: string | null;
  },
): Promise<void> {
  const url = `${getBaseUrl()}/Api/NameHistory/AddDto`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!response.ok) await throwApiError(response, 'Failed to add name history');
}

/** POST /Api/NameHistoryTranslation/AddDto — create translation via DTO */
export async function addCompanyNameHistoryTranslation(
  token: string,
  data: CompanyNameHistoryTranslationDto,
): Promise<void> {
  const url = `${getBaseUrl()}/Api/NameHistoryTranslation/AddDto`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!response.ok) await throwApiError(response, 'Failed to add name history translation');
}

/** PUT /Api/NameHistory/UpdateDto — update name history entry */
export async function updateCompanyNameHistory(
  token: string,
  data: {
    id: string;
    companyId: string;
    startDate: string;
    endDate: string | null;
    description?: string | null;
  },
): Promise<void> {
  const url = `${getBaseUrl()}/Api/NameHistory/UpdateDto`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!response.ok) await throwApiError(response, 'Failed to update name history');
}

/** PUT /Api/NameHistoryTranslation/UpdateDto — update translation */
export async function updateCompanyNameHistoryTranslation(
  token: string,
  data: CompanyNameHistoryTranslationDto,
): Promise<void> {
  const url = `${getBaseUrl()}/Api/NameHistoryTranslation/UpdateDto`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!response.ok) await throwApiError(response, 'Failed to update name history translation');
}

/**
 * GET /Api/NameHistoryTranslation/ToListAll — get all translations, filter client-side.
 * Note: The backend ToList (POST) is not implemented (throws NotImplementedException)
 * and the DTO model validation requires Name, so we use ToListAll + client filter instead.
 */
export async function listCompanyNameHistoryTranslations(
  token: string,
  filter: { nameHistoryId: string },
): Promise<CompanyNameHistoryTranslationDto[]> {
  const url = `${getBaseUrl()}/Api/NameHistoryTranslation/ToListAll`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
  if (!response.ok) await throwApiError(response, 'Failed to list name history translations');
  const all: CompanyNameHistoryTranslationDto[] = await response.json();
  return all.filter((t) => t.nameHistoryId === filter.nameHistoryId);
}

/** DELETE /Api/NameHistoryTranslation/Remove — delete a single translation */
export async function deleteCompanyNameHistoryTranslation(
  token: string,
  data: { nameHistoryId: string; languageId: number; name: string },
): Promise<void> {
  const url = `${getBaseUrl()}/Api/NameHistoryTranslation/Remove`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!response.ok) await throwApiError(response, 'Failed to delete name history translation');
}

/** DELETE /Api/CompanyNameManagement/DeleteNameHistory — delete name history entry */
export async function deleteCompanyNameHistory(
  token: string,
  data: { id: string; companyId: string },
): Promise<void> {
  const url = `${getBaseUrl()}/Api/CompanyNameManagement/DeleteNameHistory`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!response.ok) await throwApiError(response, 'Failed to delete name history');
}

// ============================================
// Company Name Management (orchestration endpoints)
// ============================================

/** POST /Api/CompanyNameManagement/AddNameWithTranslations — add name + translations in one call */
export async function addNameWithTranslations(
  token: string,
  data: {
    id?: string;
    companyId: string;
    startDate: string;
    endDate: string | null;
    description?: string | null;
    translations: { nameHistoryId?: string; languageId: number; name: string; shortName?: string | null }[];
  },
): Promise<void> {
  const url = `${getBaseUrl()}/Api/CompanyNameManagement/AddNameWithTranslations`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!response.ok) await throwApiError(response, 'Failed to add name with translations');
}

/** PUT /Api/CompanyNameManagement/UpsertTranslations — upsert translations for existing name */
export async function upsertNameTranslations(
  token: string,
  data: {
    nameHistoryId: string;
    companyId: string;
    translations: { nameHistoryId?: string; languageId: number; name: string; shortName?: string | null }[];
  },
): Promise<void> {
  const url = `${getBaseUrl()}/Api/CompanyNameManagement/UpsertTranslations`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!response.ok) await throwApiError(response, 'Failed to upsert translations');
}

/** DELETE /Api/CompanyNameManagement/RemoveTranslation — remove a single translation */
export async function removeNameTranslation(
  token: string,
  data: { nameHistoryId: string; languageId: number; name: string },
): Promise<void> {
  const url = `${getBaseUrl()}/Api/CompanyNameManagement/RemoveTranslation`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!response.ok) await throwApiError(response, 'Failed to remove translation');
}

// ============================================
// Company Contact Data (Email, Phone, Address)
// ============================================

export interface CompanyEmailViewDto {
  id: string;
  companyId: string;
  labelId: number;
  labelName: string;
  emailAddress: string;
  isPrimary: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface CompanyPhoneViewDto {
  id: string;
  companyId: string;
  labelId: number;
  labelName: string;
  countryId: number;
  phoneNumber: string;
  isPrimary: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface CompanyAddressViewDto {
  id: string;
  companyId: string;
  labelId: number;
  labelName: string;
  countryId: number;
  regionId: number;
  cityId: number;
  countryName?: string;
  regionName?: string;
  cityName?: string;
  postalCode: string;
  street1: string;
  street2: string | null;
  isPrimary: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface CompanyWebsiteViewDto {
  id: string;
  companyId: string;
  labelId: number;
  labelName: string;
  url: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface CompanyContactDto {
  emails: CompanyEmailViewDto[];
  phones: CompanyPhoneViewDto[];
  addresses: CompanyAddressViewDto[];
  websites: CompanyWebsiteViewDto[];
}

/** GET /Api/CompanyContact/{companyId}?languageId=12 */
export async function getCompanyContact(
  token: string,
  companyId: string,
  languageId: number = 12,
): Promise<CompanyContactDto> {
  const url = `${getBaseUrl()}/Api/CompanyContact/${companyId}?languageId=${languageId}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });
  if (!response.ok) await throwApiError(response, 'Failed to fetch contact data');
  return response.json();
}

/** POST /Api/CompanyContact/{companyId}/Email */
export async function addCompanyEmail(
  token: string,
  companyId: string,
  data: Partial<CompanyEmailViewDto>,
): Promise<CompanyEmailViewDto> {
  const url = `${getBaseUrl()}/Api/CompanyContact/${companyId}/Email`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!response.ok) await throwApiError(response, 'Failed to add email');
  return response.json();
}

/** PUT /Api/CompanyContact/Email/{emailId} */
export async function updateCompanyEmail(
  token: string,
  emailId: string,
  data: Partial<CompanyEmailViewDto>,
): Promise<CompanyEmailViewDto> {
  const url = `${getBaseUrl()}/Api/CompanyContact/Email/${emailId}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!response.ok) await throwApiError(response, 'Failed to update email');
  return response.json();
}

/** DELETE /Api/CompanyContact/Email/{emailId} */
export async function deleteCompanyEmail(token: string, emailId: string): Promise<void> {
  const url = `${getBaseUrl()}/Api/CompanyContact/Email/${emailId}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) await throwApiError(response, 'Failed to delete email');
}

/** POST /Api/CompanyContact/{companyId}/Phone */
export async function addCompanyPhone(
  token: string,
  companyId: string,
  data: Partial<CompanyPhoneViewDto>,
): Promise<CompanyPhoneViewDto> {
  const url = `${getBaseUrl()}/Api/CompanyContact/${companyId}/Phone`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!response.ok) await throwApiError(response, 'Failed to add phone');
  return response.json();
}

/** PUT /Api/CompanyContact/Phone/{phoneId} */
export async function updateCompanyPhone(
  token: string,
  phoneId: string,
  data: Partial<CompanyPhoneViewDto>,
): Promise<CompanyPhoneViewDto> {
  const url = `${getBaseUrl()}/Api/CompanyContact/Phone/${phoneId}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!response.ok) await throwApiError(response, 'Failed to update phone');
  return response.json();
}

/** DELETE /Api/CompanyContact/Phone/{phoneId} */
export async function deleteCompanyPhone(token: string, phoneId: string): Promise<void> {
  const url = `${getBaseUrl()}/Api/CompanyContact/Phone/${phoneId}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) await throwApiError(response, 'Failed to delete phone');
}

/** POST /Api/CompanyContact/{companyId}/Address */
export async function addCompanyAddress(
  token: string,
  companyId: string,
  data: Partial<CompanyAddressViewDto>,
): Promise<CompanyAddressViewDto> {
  const url = `${getBaseUrl()}/Api/CompanyContact/${companyId}/Address`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!response.ok) await throwApiError(response, 'Failed to add address');
  return response.json();
}

/** PUT /Api/CompanyContact/Address/{addressId} */
export async function updateCompanyAddress(
  token: string,
  addressId: string,
  data: Partial<CompanyAddressViewDto>,
): Promise<CompanyAddressViewDto> {
  const url = `${getBaseUrl()}/Api/CompanyContact/Address/${addressId}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!response.ok) await throwApiError(response, 'Failed to update address');
  return response.json();
}

/** DELETE /Api/CompanyContact/Address/{addressId} */
export async function deleteCompanyAddress(token: string, addressId: string): Promise<void> {
  const url = `${getBaseUrl()}/Api/CompanyContact/Address/${addressId}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) await throwApiError(response, 'Failed to delete address');
}

/** POST /Api/CompanyContact/{companyId}/Website */
export async function addCompanyWebsite(
  token: string,
  companyId: string,
  data: Partial<CompanyWebsiteViewDto>,
): Promise<CompanyWebsiteViewDto> {
  const url = `${getBaseUrl()}/Api/CompanyContact/${companyId}/Website`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!response.ok) await throwApiError(response, 'Failed to add website');
  return response.json();
}

/** PUT /Api/CompanyContact/Website/{websiteId} */
export async function updateCompanyWebsite(
  token: string,
  websiteId: string,
  data: Partial<CompanyWebsiteViewDto>,
): Promise<CompanyWebsiteViewDto> {
  const url = `${getBaseUrl()}/Api/CompanyContact/Website/${websiteId}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!response.ok) await throwApiError(response, 'Failed to update website');
  return response.json();
}

/** DELETE /Api/CompanyContact/Website/{websiteId} */
export async function deleteCompanyWebsite(token: string, websiteId: string): Promise<void> {
  const url = `${getBaseUrl()}/Api/CompanyContact/Website/${websiteId}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) await throwApiError(response, 'Failed to delete website');
}

// ============================================
// Company Financial Info (per-year records)
// ============================================

export interface CompanyFinancialInfoDto {
  id: string;
  companyId: string;
  fiscalYear: number;
  registeredCapital: number;
  numberOfShares: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * GET /Api/FinancialInfo/ToListAll — get all financial info, filter client-side by companyId.
 * Note: The backend ToList (POST) throws NotImplementedException,
 * so we use ToListAll + client filter instead.
 */
export async function listCompanyFinancialInfo(
  token: string,
  companyId: string,
): Promise<CompanyFinancialInfoDto[]> {
  const url = `${getBaseUrl()}/Api/FinancialInfo/ToListAll`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
  if (!response.ok) await throwApiError(response, 'Failed to list financial info');
  const all: CompanyFinancialInfoDto[] = await response.json();
  return all.filter((f) => f.companyId === companyId);
}

/** POST /Api/FinancialInfo/AddDto — add financial info record.
 *  No id: the backend stamps a v7 GUID (FinancialInfoInsertDto has no Id). */
export async function addCompanyFinancialInfo(
  token: string,
  data: Omit<CompanyFinancialInfoDto, 'id'>,
): Promise<void> {
  const url = `${getBaseUrl()}/Api/FinancialInfo/AddDto`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!response.ok) await throwApiError(response, 'Failed to add financial info');
}

/** PUT /Api/FinancialInfo/UpdateDto — update financial info record */
export async function updateCompanyFinancialInfo(
  token: string,
  data: CompanyFinancialInfoDto,
): Promise<void> {
  const url = `${getBaseUrl()}/Api/FinancialInfo/UpdateDto`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!response.ok) await throwApiError(response, 'Failed to update financial info');
}

/** DELETE /Api/FinancialInfo/Remove — delete financial info record */
export async function deleteCompanyFinancialInfo(
  token: string,
  data: { id: string; companyId: string; fiscalYear: number; registeredCapital: number; numberOfShares: number },
): Promise<void> {
  const url = `${getBaseUrl()}/Api/FinancialInfo/Remove`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!response.ok) await throwApiError(response, 'Failed to delete financial info');
}

// ─── Company Access (per-person grants on a company) ───
export interface CompanyAccessLevels {
  information: number;
  access: number;
}
export interface CompanyAccessGrantSummary {
  companyId: string;
  grantedToPersonId: string;
  informationLevel: number;
  accessLevel: number;
  createdAt: string;
  updatedAt: string | null;
}
export interface UpsertCompanyAccessGrantBody {
  companyId: string;
  grantedToPersonId: string;
  informationLevel: number;
  accessLevel: number;
}
export async function listCompanyAccessGrantsByCompany(token: string, companyId: string): Promise<CompanyAccessGrantSummary[]> {
  const res = await fetch(`${getBaseUrl()}/Api/Access/ByCompany/${companyId}`, { method: 'GET', headers: getHeaders(token), cache: 'no-store' });
  if (!res.ok) await throwApiError(res, 'Failed to list company access grants.');
  return res.json();
}
export async function getCompanyMyLevels(token: string, companyId: string): Promise<CompanyAccessLevels> {
  const res = await fetch(`${getBaseUrl()}/Api/Access/MyLevels/${companyId}`, { method: 'GET', headers: getHeaders(token), cache: 'no-store' });
  if (!res.ok) await throwApiError(res, 'Failed to fetch company access levels.');
  const v = await res.json();
  return {
    information: typeof v?.information === 'number' ? v.information : 0,
    access: typeof v?.access === 'number' ? v.access : 0,
  };
}
export async function upsertCompanyAccessGrant(token: string, body: UpsertCompanyAccessGrantBody): Promise<void> {
  const res = await fetch(`${getBaseUrl()}/Api/Access/Grant`, { method: 'POST', headers: getHeaders(token), body: JSON.stringify(body) });
  if (!res.ok) await throwApiError(res, 'Failed to grant company access.');
}
export async function revokeCompanyAccessByPair(token: string, companyId: string, grantedToPersonId: string): Promise<void> {
  const res = await fetch(`${getBaseUrl()}/Api/Access/RevokeByPair/${companyId}/${grantedToPersonId}`, { method: 'POST', headers: getHeaders(token) });
  if (!res.ok) await throwApiError(res, 'Failed to revoke company access.');
}

// ─── Company Role Access ───
export interface CompanyRoleAccessGrantSummary {
  companyId: string | null;
  grantedToRoleId: string;
  informationLevel: number;
  accessLevel: number;
  createdAt: string;
  updatedAt: string | null;
}
export interface UpsertCompanyRoleAccessGrantBody {
  companyId: string | null;
  grantedToRoleId: string;
  informationLevel: number;
  accessLevel: number;
}
export async function listCompanyRoleAccessByCompany(token: string, companyId: string): Promise<CompanyRoleAccessGrantSummary[]> {
  const res = await fetch(`${getBaseUrl()}/Api/RoleAccess/ByCompany/${companyId}`, { method: 'GET', headers: getHeaders(token), cache: 'no-store' });
  if (!res.ok) await throwApiError(res, 'Failed to list company role-access grants.');
  return res.json();
}
export async function listAllCompanyRoleAccess(token: string): Promise<CompanyRoleAccessGrantSummary[]> {
  const res = await fetch(`${getBaseUrl()}/Api/RoleAccess/All`, { method: 'GET', headers: getHeaders(token), cache: 'no-store' });
  if (!res.ok) await throwApiError(res, 'Failed to list company role-access grants.');
  return res.json();
}
export async function upsertCompanyRoleAccessGrant(token: string, body: UpsertCompanyRoleAccessGrantBody): Promise<void> {
  const res = await fetch(`${getBaseUrl()}/Api/RoleAccess/Grant`, { method: 'POST', headers: getHeaders(token), body: JSON.stringify(body) });
  if (!res.ok) await throwApiError(res, 'Failed to grant company role-access.');
}
export async function revokeCompanyRoleAccessByPair(token: string, grantedToRoleId: string, companyId: string | null): Promise<void> {
  const params = new URLSearchParams({ grantedToRoleId });
  if (companyId) params.set('companyId', companyId);
  const res = await fetch(`${getBaseUrl()}/Api/RoleAccess/RevokeByPair?${params.toString()}`, { method: 'POST', headers: getHeaders(token) });
  if (!res.ok) await throwApiError(res, 'Failed to revoke company role-access.');
}

// ============================================
// Company Stakeholders (Stakeholder + StakeholderHistory)
// ============================================

export interface CompanyStakeholderHistoryViewDto {
  id: string;
  ownershipPercentage: number;
  shareCount: number;
  boardRepresentativePersonId: string | null;
  /** Resolved board-representative display name (backend-provided). */
  boardRepresentativeName: string | null;
  registrationDate: string;
  effectiveDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface CompanyStakeholderViewDto {
  id: string;
  companyId: string;
  relatedPartyType: number; // 1=Company, 2=Person
  relatedPartyId: string;
  /** Resolved related-party display name (company or person, backend-provided). */
  relatedPartyName: string;
  stakeholderTypeId: number;
  stakeholderTypeName: string;
  current: CompanyStakeholderHistoryViewDto | null;
  history: CompanyStakeholderHistoryViewDto[];
}

export interface CompanyStakeholderUpsertDto {
  relatedPartyType: number;
  relatedPartyId: string;
  stakeholderTypeId: number;
  ownershipPercentage: number;
  shareCount: number;
  boardRepresentativePersonId: string | null;
  registrationDate: string;
  effectiveDate: string;
}

/** GET /Api/CompanyStakeholderManagement/ByCompany/{companyId}?languageId=12 */
export async function getCompanyStakeholders(
  token: string,
  companyId: string,
  languageId: number = 12,
): Promise<CompanyStakeholderViewDto[]> {
  const url = `${getBaseUrl()}/Api/CompanyStakeholderManagement/ByCompany/${companyId}?languageId=${languageId}`;
  const res = await fetch(url, { method: 'GET', headers: getHeaders(token), cache: 'no-store' });
  if (!res.ok) await throwApiError(res, 'Failed to fetch stakeholders');
  return res.json();
}

/** POST /Api/CompanyStakeholderManagement/{companyId} */
export async function addCompanyStakeholder(
  token: string,
  companyId: string,
  data: CompanyStakeholderUpsertDto,
  languageId: number = 12,
): Promise<CompanyStakeholderViewDto> {
  const url = `${getBaseUrl()}/Api/CompanyStakeholderManagement/${companyId}?languageId=${languageId}`;
  const res = await fetch(url, { method: 'POST', headers: getHeaders(token), body: JSON.stringify(data) });
  if (!res.ok) await throwApiError(res, 'Failed to add stakeholder');
  return res.json();
}

/** PUT /Api/CompanyStakeholderManagement/{stakeholderId} */
export async function updateCompanyStakeholder(
  token: string,
  stakeholderId: string,
  data: CompanyStakeholderUpsertDto,
  languageId: number = 12,
): Promise<CompanyStakeholderViewDto> {
  const url = `${getBaseUrl()}/Api/CompanyStakeholderManagement/${stakeholderId}?languageId=${languageId}`;
  const res = await fetch(url, { method: 'PUT', headers: getHeaders(token), body: JSON.stringify(data) });
  if (!res.ok) await throwApiError(res, 'Failed to update stakeholder');
  return res.json();
}

/** DELETE /Api/CompanyStakeholderManagement/{stakeholderId} */
export async function deleteCompanyStakeholder(token: string, stakeholderId: string): Promise<void> {
  const url = `${getBaseUrl()}/Api/CompanyStakeholderManagement/${stakeholderId}`;
  const res = await fetch(url, { method: 'DELETE', headers: getHeaders(token) });
  if (!res.ok) await throwApiError(res, 'Failed to delete stakeholder');
}

// ============================================
// Company Documents (metadata; bytes via FileOrchestrator)
// ============================================

export interface CompanyDocumentDto {
  id: string;
  companyId: string;
  companyDocumentTypeId: number;
  storageInstanceId: number;
  fileName: string;
  fileSize: number;
  contentType: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CompanyDocumentTypeTranslationDto {
  companyDocumentTypeId: number;
  languageId: number;
  name: string;
}

/** GET /Api/CompanyDocument/ByCompany/{companyId} — a company's document metadata (newest first). */
export async function listCompanyDocuments(token: string, companyId: string): Promise<CompanyDocumentDto[]> {
  const res = await fetch(`${getBaseUrl()}/Api/CompanyDocument/ByCompany/${companyId}`, {
    method: 'GET',
    headers: getHeaders(token),
    cache: 'no-store',
  });
  if (!res.ok) await throwApiError(res, 'Failed to list company documents');
  return res.json();
}

/**
 * POST /Api/CompanyDocument/Create — create the metadata row (InsertDto, no nav
 * props / no id) and return it WITH the backend-stamped GUID id. The BFF needs
 * that id to upload the file bytes through the orchestrator.
 */
export async function addCompanyDocument(
  token: string,
  data: {
    companyId: string;
    companyDocumentTypeId: number;
    storageInstanceId: number;
    fileName: string;
    fileSize: number;
    contentType: string;
  },
): Promise<CompanyDocumentDto> {
  const res = await fetch(`${getBaseUrl()}/Api/CompanyDocument/Create`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) await throwApiError(res, 'Failed to add company document');
  return res.json();
}

/** PUT /Api/CompanyDocument/UpdateDto — update editable metadata (type + optional new file name). */
export async function updateCompanyDocument(
  token: string,
  data: { id: string; companyDocumentTypeId: number; fileName: string | null },
): Promise<void> {
  const res = await fetch(`${getBaseUrl()}/Api/CompanyDocument/UpdateDto`, {
    method: 'PUT',
    headers: getHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) await throwApiError(res, 'Failed to update company document');
}

/** DELETE /Api/CompanyDocument/ById/{id} — delete the metadata row by key. */
export async function removeCompanyDocument(token: string, id: string): Promise<void> {
  const res = await fetch(`${getBaseUrl()}/Api/CompanyDocument/ById/${id}`, {
    method: 'DELETE',
    headers: getHeaders(token),
  });
  if (!res.ok) await throwApiError(res, 'Failed to delete company document');
}

/** GET /Api/CompanyDocumentTypeTranslation/ToListAll — fa/en names for the type dropdown. */
export async function listCompanyDocumentTypeTranslations(token: string): Promise<CompanyDocumentTypeTranslationDto[]> {
  const res = await fetch(`${getBaseUrl()}/Api/CompanyDocumentTypeTranslation/ToListAll`, {
    method: 'GET',
    headers: getHeaders(token),
    cache: 'no-store',
  });
  if (!res.ok) await throwApiError(res, 'Failed to list company document types');
  return res.json();
}

// ============================================
// Company Software (Software lookup + CompanySoftware per-category picks)
// ============================================

// ===== Company Software =====
/** One active software product + its provider company (for the cascade dropdowns). */
export interface SoftwareCatalogItemDto {
  id: number;
  name: string;
  companyId: string;
  companyName: string;
}
export interface CompanySoftwareSlotDto {
  softwareCategoryId: number;
  categoryCode: string;
  categoryName: string;
  softwareId: number | null;
  softwareName: string | null;
  providerCompanyId: string | null;
  providerCompanyName: string | null;
}

// NOTE: BaseController route = Api/[controller]/[action], "Async" suffix stripped.
// The software catalog is admin/DB-managed (Software + provider Company) — the UI
// only READS it to drive the provider→software cascade; add/update are
// intentionally not wired to the frontend.
/** GET /Api/CompanySoftware/catalog — active software + provider company, for the cascade dropdowns */
export async function getSoftwareCatalog(token: string, languageId = 12): Promise<SoftwareCatalogItemDto[]> {
  const res = await fetch(`${getBaseUrl()}/Api/CompanySoftware/catalog?languageId=${languageId}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }, cache: 'no-store',
  });
  if (!res.ok) await throwApiError(res, 'Failed to fetch software catalog');
  return res.json();
}

/** GET /Api/CompanySoftware/{companyId} — the 9 category slots */
export async function getCompanySoftware(token: string, companyId: string, languageId = 12): Promise<CompanySoftwareSlotDto[]> {
  const res = await fetch(`${getBaseUrl()}/Api/CompanySoftware/${companyId}?languageId=${languageId}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }, cache: 'no-store',
  });
  if (!res.ok) await throwApiError(res, 'Failed to fetch company software');
  return res.json();
}
export async function upsertCompanySoftware(token: string, companyId: string, data: { softwareCategoryId: number; softwareId: number }): Promise<void> {
  const res = await fetch(`${getBaseUrl()}/Api/CompanySoftware/${companyId}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(data),
  });
  if (!res.ok) await throwApiError(res, 'Failed to save company software');
}
export async function clearCompanySoftware(token: string, companyId: string, softwareCategoryId: number): Promise<void> {
  const res = await fetch(`${getBaseUrl()}/Api/CompanySoftware/${companyId}/${softwareCategoryId}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) await throwApiError(res, 'Failed to clear company software');
}
