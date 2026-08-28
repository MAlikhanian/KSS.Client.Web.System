/**
 * KSS Portfolio Service (KSS.Service.Portfolio)
 *
 * Server-side only functions for Portfolio service operations.
 * Base URL from PORTFOLIO_API_BASE_URL env only (set in .env / ConfigMap / k8s).
 */

function getBaseUrl(): string {
  const baseUrl = process.env.PORTFOLIO_API_BASE_URL;
  if (!baseUrl) {
    console.error('[Portfolio API] PORTFOLIO_API_BASE_URL is not set in environment variables');
    throw new Error(
      'PORTFOLIO_API_BASE_URL environment variable is required but not set.',
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

// ─── Generic Sub-Entity CRUD ───

async function listSubEntity(token: string, entityName: string) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/Api/${entityName}/ToListAll`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(token),
    cache: 'no-store',
  });

  if (!response.ok) {
    await throwApiError(response, `Failed to list ${entityName}.`);
  }

  return response.json();
}

async function removeSubEntity(token: string, entityName: string, data: Record<string, unknown>) {
  const baseUrl = getBaseUrl();

  // If only id is provided, fetch the full entity first via FindAsync
  let entityData = data;
  if (data.id && Object.keys(data).length <= 2) {
    const findUrl = `${baseUrl}/Api/${entityName}/Find`;
    const findResponse = await fetch(findUrl, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ value: data.id, dataType: 9 }),
    });
    if (findResponse.ok) {
      entityData = await findResponse.json();
    }
  }

  const url = `${baseUrl}/Api/${entityName}/Remove`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: getHeaders(token),
    body: JSON.stringify(entityData),
  });

  if (!response.ok) {
    await throwApiError(response, `Failed to remove ${entityName}.`);
  }
}

// ─── PersonAsset ───

export async function listPersonAssets(token: string) {
  return listSubEntity(token, 'PersonAsset');
}

export async function addPersonAsset(token: string, data: Record<string, unknown>) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/Api/PersonAsset/AddDto`;

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    await throwApiError(response, 'Failed to add PersonAsset.');
  }

  return response.json();
}

export async function updatePersonAsset(token: string, data: Record<string, unknown>) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/Api/PersonAsset/UpdateDto`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: getHeaders(token),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    await throwApiError(response, 'Failed to update PersonAsset.');
  }

  return response.json().catch(() => ({ success: true }));
}

export async function removePersonAsset(token: string, data: Record<string, unknown>) {
  return removeSubEntity(token, 'PersonAsset', data);
}

/**
 * Filter PersonAsset records client-side by personId.
 * BaseController doesn't support custom queries, so we list all and filter.
 */
export async function listPersonAssetsByPerson(token: string, personId: string) {
  const all = await listPersonAssets(token);
  if (Array.isArray(all)) {
    return all.filter(
      (p: { personId: string }) =>
        p.personId?.toLowerCase() === personId.toLowerCase(),
    );
  }
  return [];
}
