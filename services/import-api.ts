/**
 * KSS Import Service (KSS.Service.Import)
 *
 * Server-side only functions for Import service operations.
 * Base URL from IMPORT_API_BASE_URL env only (set in .env / ConfigMap / k8s).
 */

function getBaseUrl(): string {
  const baseUrl = process.env.IMPORT_API_BASE_URL;
  if (!baseUrl) {
    console.error('[Import API] IMPORT_API_BASE_URL is not set in environment variables');
    throw new Error(
      'IMPORT_API_BASE_URL environment variable is required but not set.',
    );
  }
  return baseUrl;
}

function getHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function throwApiError(response: Response, defaultMessage: string) {
  const errorText = await response.text().catch(() => response.statusText);
  if (response.status === 401) {
    throw new Error('Authentication token expired. Please log in again.');
  }
  let message = defaultMessage;
  try {
    const errorJson = JSON.parse(errorText);
    message = errorJson.message || message;
  } catch {
    message = errorText || message;
  }
  throw new Error(message);
}

// ─── Import Upload Types ───

export interface ImportUploadView {
  id: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  storageInstanceId: number;
  statusId: number;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt?: string | null;
  isActive: boolean;
}

export interface ImportUploadInsert {
  fileName: string;
  fileSize: number;
  contentType: string;
  storageInstanceId: number;
}

export interface ImportUploadReview {
  id: string;
  statusId: number;
  reviewNote?: string | null;
}

// ─── Import Upload CRUD ───

/**
 * POST /Api/ImportUpload/Add — body binds to the ImportUpload entity.
 * (Route is "Add", not "AddAsync" — ASP.NET strips the Async suffix from action
 * route names.) BaseController.AddAsync saves (stamping the v7 Id + audit) and
 * returns the created entity with its generated id.
 */
export async function addImportUpload(
  token: string,
  data: ImportUploadInsert,
): Promise<ImportUploadView> {
  const url = `${getBaseUrl()}/Api/ImportUpload/Add`;
  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(data),
  });
  if (!response.ok) await throwApiError(response, 'Failed to create import upload.');
  return response.json();
}

/**
 * GET /Api/ImportUpload/MyUploads — the caller's own uploads.
 */
export async function listMyImportUploads(token: string): Promise<ImportUploadView[]> {
  const url = `${getBaseUrl()}/Api/ImportUpload/MyUploads`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(token),
    cache: 'no-store',
  });
  if (!response.ok) await throwApiError(response, 'Failed to list import uploads.');
  return response.json();
}

/**
 * GET /Api/ImportUpload/AllUploads — ALL uploads (SuperAdmin only; backend-enforced).
 */
export async function listAllImportUploads(token: string): Promise<ImportUploadView[]> {
  const url = `${getBaseUrl()}/Api/ImportUpload/AllUploads`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(token),
    cache: 'no-store',
  });
  if (!response.ok) await throwApiError(response, 'Failed to list all import uploads.');
  return response.json();
}

/**
 * POST /Api/ImportUpload/Find — single ViewDto by id.
 * Filter shape mirrors person-api getPersonById: { value, dataType: 9 } (9 = Guid).
 */
export async function getImportUploadById(
  token: string,
  id: string,
): Promise<ImportUploadView> {
  const url = `${getBaseUrl()}/Api/ImportUpload/Find`;
  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ value: id, dataType: 9 }),
    cache: 'no-store',
  });
  if (!response.ok) await throwApiError(response, 'Import upload not found.');
  return response.json();
}

/**
 * PUT /Api/ImportUpload/Review — body ImportUploadReviewDto.
 */
export async function reviewImportUpload(
  token: string,
  data: ImportUploadReview,
): Promise<void> {
  const url = `${getBaseUrl()}/Api/ImportUpload/Review`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: getHeaders(token),
    body: JSON.stringify(data),
  });
  if (!response.ok) await throwApiError(response, 'Failed to review import upload.');
}

/**
 * DELETE /Api/ImportUpload/Remove — rollback helper for the upload orchestration
 * dance. Mirrors person sub-entity Remove (body carries the entity key).
 */
export async function removeImportUpload(
  token: string,
  data: { id: string },
): Promise<void> {
  const url = `${getBaseUrl()}/Api/ImportUpload/Remove`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: getHeaders(token),
    body: JSON.stringify(data),
  });
  if (!response.ok) await throwApiError(response, 'Failed to remove import upload.');
}
