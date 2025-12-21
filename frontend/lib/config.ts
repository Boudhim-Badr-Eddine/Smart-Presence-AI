/**
 * Centralized configuration for API base URLs and other environment settings.
 * This ensures consistency across the app and prevents env var mismatches.
 *
 * Uses NEXT_PUBLIC_API_BASE_URL as the primary env var (recommended for Next.js).
 * Falls back to NEXT_PUBLIC_API_URL for backwards compatibility.
 * Falls back to http://localhost:8000 for local development.
 */

/**
 * Returns the API base URL from environment variables.
 * Primary: NEXT_PUBLIC_API_BASE_URL
 * Fallback: NEXT_PUBLIC_API_URL
 * Default: http://localhost:8000
 */
export function getApiBase(): string {
  const raw =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:8000';

  // Many older configs set NEXT_PUBLIC_API_URL to something like
  // `http://localhost:8000/api`, but the codebase consistently appends `/api/...`.
  // Normalize to a host base (no trailing `/api`) to prevent `/api/api/...`.
  let base = String(raw).trim();
  base = base.replace(/\/+$/, '');
  base = base.replace(/\/api$/, '');
  base = base.replace(/\/+$/, '');
  return base;
}

/**
 * Returns the app name from environment variables.
 */
export function getAppName(): string {
  return process.env.NEXT_PUBLIC_APP_NAME || 'Smart Presence AI';
}

/**
 * Returns the app version from environment variables.
 */
export function getAppVersion(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';
}

/**
 * Checks if the API base URL is properly configured (not empty).
 */
export function isApiConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL);
}
