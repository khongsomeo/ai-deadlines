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
    const apiUrl = window.APP_CONFIG?.API_URL || import.meta.env.VITE_API_URL;
    
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
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
