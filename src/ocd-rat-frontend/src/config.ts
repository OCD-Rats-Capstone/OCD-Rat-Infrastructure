/**
 * Centralized configuration for the application.
 * 
 * API_BASE_URL is determined by the environment variable VITE_API_URL.
 * If not set (dev mode), it defaults to http://localhost:8000.
 * In production (with Nginx), this should likely be set to "/api" or the full URL.
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
