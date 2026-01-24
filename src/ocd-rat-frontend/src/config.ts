/**
 * Centralized configuration for the application.
 * 
 * API_BASE_URL is determined by the environment variable VITE_API_URL.
 * If not set (dev mode), it defaults to http://localhost:8000.
 * In production (with Nginx), this should likely be set to "/api" or the full URL.
 */
// If VITE_API_URL is set, use it.
// If NOT set:
//   - If running in development (import.meta.env.DEV), default to localhost:8000
//   - If running in production (built code), default to /api
export const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:8000" : "/api");
