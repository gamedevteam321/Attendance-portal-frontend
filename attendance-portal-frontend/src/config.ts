/**
 * Frappe site base URL (no trailing slash).
 * - Local dev: defaults to http://localhost:8000
 * - Production: set VITE_SITE_URL when building (e.g. https://admin.orgatek.net)
 */
export const SITE_URL = (import.meta.env.VITE_SITE_URL || 'http://localhost:8000').replace(/\/$/, '')

