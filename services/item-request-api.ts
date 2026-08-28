/**
 * KSS Import Service — ItemRequest (KSS.Service.Import)
 *
 * Server-side only functions for the ItemRequest feature.
 * Base URL from IMPORT_API_BASE_URL env only (set in .env / ConfigMap / k8s) —
 * the ItemRequest endpoints live in the SAME backend service as Import uploads.
 */

function getBaseUrl(): string {
  const baseUrl = process.env.IMPORT_API_BASE_URL;
  if (!baseUrl) {
    console.error('[ItemRequest API] IMPORT_API_BASE_URL is not set in environment variables');
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

// ─── Item Request Types ───

export interface ItemRequestView {
  id: string;
  description: string;
  statusId: number;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt?: string | null;
  isActive: boolean;
}

export interface ItemRequestInsert {
  description: string;
}

export interface ItemRequestReview {
  id: string;
  statusId: number;
  reviewNote?: string | null;
}

// ─── Item Request CRUD ───

/**
 * POST /Api/ItemRequest/Add — body binds to the ItemRequest entity (send
 * `{ description }`). The route is "Add", NOT "AddAsync" — ASP.NET strips the
 * Async suffix from action route names. BaseController.AddAsync saves (stamping
 * the v7 Id + audit) and returns the created entity with its generated id.
 */
export async function addItemRequest(
  token: string,
  data: ItemRequestInsert,
): Promise<ItemRequestView> {
  const url = `${getBaseUrl()}/Api/ItemRequest/Add`;
  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(data),
  });
  if (!response.ok) await throwApiError(response, 'Failed to create item request.');
  return response.json();
}

/**
 * GET /Api/ItemRequest/MyRequests — the caller's own requests.
 */
export async function listMyItemRequests(token: string): Promise<ItemRequestView[]> {
  const url = `${getBaseUrl()}/Api/ItemRequest/MyRequests`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(token),
    cache: 'no-store',
  });
  if (!response.ok) await throwApiError(response, 'Failed to list item requests.');
  return response.json();
}

/**
 * GET /Api/ItemRequest/AllRequests — ALL requests (SuperAdmin only; backend-enforced).
 */
export async function listAllItemRequests(token: string): Promise<ItemRequestView[]> {
  const url = `${getBaseUrl()}/Api/ItemRequest/AllRequests`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(token),
    cache: 'no-store',
  });
  if (!response.ok) await throwApiError(response, 'Failed to list all item requests.');
  return response.json();
}

/**
 * PUT /Api/ItemRequest/Review — body ItemRequestReviewDto (SuperAdmin only).
 */
export async function reviewItemRequest(
  token: string,
  data: ItemRequestReview,
): Promise<void> {
  const url = `${getBaseUrl()}/Api/ItemRequest/Review`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: getHeaders(token),
    body: JSON.stringify(data),
  });
  if (!response.ok) await throwApiError(response, 'Failed to review item request.');
}
