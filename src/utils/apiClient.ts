/**
 * Get the API base URL based on the environment
 * Works in development, Docker, and production environments
 * 
 * For Docker local development:
 * - Frontend runs on localhost:80 (port 8080 in container)
 * - API exposed on localhost:3001
 * - Browser can call http://localhost:3001
 * 
 * For Docker with service-to-service communication:
 * - Use environment variable VITE_API_URL to override
 */
export function getApiBaseUrl(): string {
  // In browser environment
  if (typeof window !== 'undefined') {
    // Check for explicit API URL (set via environment variable during build)
    const apiUrl = import.meta.env.VITE_API_URL;
    
    if (apiUrl && typeof apiUrl === 'string' && apiUrl.trim()) {
      return apiUrl;
    }

    const protocol = window.location.protocol;
    const hostname = window.location.hostname;

    // Default: assume API is on same hostname but port 3001
    // Works for:
    // - localhost (both frontend and API run locally)
    // - Production domains (if API is configured on same domain:3001)
    return `${protocol}//${hostname}:3001`;
  }

  // Server-side fallback
  return process.env.VITE_API_URL || 'http://localhost:3001';
}

/**
 * Make an API request with proper URL handling
 */
export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorDetails = '';
    const contentType = response.headers.get('Content-Type') || '';
    try {
      if (contentType.includes('application/json')) {
        const errJson = await response.json();
        errorDetails = errJson?.message || errJson?.error || JSON.stringify(errJson);
      } else {
        const text = await response.text();
        errorDetails = text.slice(0, 200); // Safeguard: truncate large HTML/text pages
      }
    } catch {
      // Silently fall back if the body is unreadable or connection drops
    }

    const detailMsg = errorDetails ? ` Details: ${errorDetails}` : '';
    throw new Error(`API Error on ${url}: ${response.status} ${response.statusText}.${detailMsg}`);
  }

  const text = await response.text();
  if (!text) {
    return {} as T; // Graceful fallback for 204 No Content or empty bodies
  }

  try {
    return JSON.parse(text) as T;
  } catch (err) {
    throw new Error(`API Error on ${url}: Failed to parse JSON response. ${err instanceof Error ? err.message : ''}`);
  }
}
