/**
 * env.ts — Centralized Environment Configuration
 * Switch between cloud production (Render) and local development.
 */

export const IS_PRODUCTION = true;

export const PROD_API_URL = 'https://fitmatrix-backend-edf2.onrender.com';
export const LOCAL_API_URL = 'http://localhost:8000';

export const API_BASE_URL: string = IS_PRODUCTION ? PROD_API_URL : LOCAL_API_URL;
