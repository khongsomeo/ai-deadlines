/**
 * Get the API base URL based on the environment
 * Works in both development and production with domains
 */
export function getApiBaseUrl(): string {
  // In browser environment, use current origin
  if (typeof window !== 'undefined') {
    // Check if we have an explicit API URL from environment
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl) {
      return apiUrl;
    }

    // In production, assume API is on same domain but port 3001
    // E.g., if frontend is on https://example.com, API is on https://example.com:3001
    const origin = window.location.origin;
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;

    // If running on standard port (80/443), add explicit port for API
    if (
      window.location.port === '' ||
      window.location.port === '80' ||
      window.location.port === '443'
    ) {
      // Standard ports - assume API is on port 3001
      return `${protocol}//${hostname}:3001`;
    }

    // If running on a non-standard port (like dev/Docker), form URL from current location
    if (window.location.port === '8080') {
      // Development or Docker: API on 3001, Frontend on 8080
      return `${protocol}//${hostname}:3001`;
    }

    // Default to current origin (works if API is proxied through same port)
    return origin;
  }

  // Server-side: use environment variable or default
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
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
