/**
 * Base URL de l'API backend.
 * - Dev : "" (Vite proxy vers localhost:8000)
 * - Prod Vercel : VITE_API_URL=https://mon-app.onrender.com
 */
export const API_BASE = import.meta.env.VITE_API_URL ?? "";
