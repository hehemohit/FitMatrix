/**
 * env.ts — Centralized Environment Configuration
 * Standalone APK connects to cloud production backend (Render) globally
 * without requiring ADB reverse or local USB tethering.
 */

export const IS_PRODUCTION = true;

export const PROD_API_URL = 'https://fitmatrix-backend-edf2.onrender.com';
export const LAN_API_URL = 'http://10.77.145.175:8000';
export const LOCAL_API_URL = 'http://localhost:8000';

export const API_BASE_URL: string = IS_PRODUCTION ? PROD_API_URL : LAN_API_URL;

