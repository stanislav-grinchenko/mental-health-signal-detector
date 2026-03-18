/**
 * Base URL de l'API backend.
 * - Dev : "" (Vite proxy vers localhost:8000)
 * - Prod Vercel : VITE_API_URL=https://mon-app.onrender.com
 */
export const API_BASE = import.meta.env.VITE_API_URL ?? "";

/**
 * Modèle NLP pour /predict.
 * - "baseline" → TF-IDF + LR (Render slim, défaut prod)
 * - "distilbert" → DistilBERT fine-tuned (local avec modèle)
 */
export const MODEL_TYPE = (import.meta.env.VITE_MODEL_TYPE as string) ?? "baseline";
