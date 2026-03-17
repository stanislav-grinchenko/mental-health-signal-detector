/**
 * scoringEngine — Fonctions pures d'analyse clinique
 *
 * Extraites de SupportResponse pour permettre les tests unitaires.
 * Aucune dépendance React — 100% testable sans environnement DOM.
 */

import type { ClinicalDimension, ClinicalProfile, DiagnosticProfile } from "../types/diagnostic";

export type DistressLevel = "light" | "elevated" | "critical";

// ─── Filet de sécurité absolu ────────────────────────────────────────────────
export const CRITICAL_KEYWORDS = [
  "suicide", "suicider", "me tuer", "mourir", "plus envie de vivre",
  "disparaître", "en finir", "me supprimer", "j'ai envie de mourir",
  "pensées suicidaires", "je veux mourir",
  // Scripts UX cliniques — mots-clés additionnels
  "je n'en peux plus", "je veux disparaître", "je ne veux plus être là",
  "personne ne m'aime", "personne ne peut m'aider",
  "je ne veux plus vivre", "j'en ai marre de tout", "tout seul au monde",
];

// ─── Seuils de triage clinique ───────────────────────────────────────────────
// CRITICAL ≥ 0.65 → détresse probable (95e percentile clinique)
// ELEVATED ≥ 0.35 → signal à surveiller (50e percentile clinique)
export const SCORE_CRITICAL = 0.65;
export const SCORE_ELEVATED = 0.35;

// ─── Planchers cliniques recalibrés ─────────────────────────────────────────
export const EMOTION_FLOOR: Record<string, number> = {
  sadness: 0.35, fear: 0.35,
  anger: 0.30, stress: 0.25, tiredness: 0.30,
  joy: 0.0, calm: 0.0, pride: 0.0,
};

// ─── Détection de dimensions cliniques dans le texte ────────────────────────
export const DIMENSION_KEYWORDS: Record<ClinicalDimension, string[]> = {
  burnout: [
    "j'en peux plus", "je n'arrive plus", "à bout", "plus la force",
    "complètement vide", "épuisé depuis", "plus d'énergie", "je tiens plus",
    "i can't go on", "burned out", "exhausted for weeks",
  ],
  anxiety: [
    "je ne contrôle plus", "tout le temps peur", "ça ne s'arrête pas",
    "j'angoisse", "attaque de panique", "je panique", "peur de tout",
    "anxiété", "rumination", "can't stop worrying", "panic attack",
  ],
  depression_masked: [
    "à quoi ça sert", "plus de plaisir", "je suis nul", "rien ne va",
    "plus rien ne m'intéresse", "je me sens vide", "sans espoir",
    "worthless", "hopeless", "nothing matters", "no point",
  ],
  dysregulation: [
    "j'explose", "je casse tout", "je me suis blessé", "je perds le contrôle",
    "je me fais du mal", "self-harm", "je me coupe", "envie de frapper",
  ],
};

// ─── Sanitisation du score ML ────────────────────────────────────────────────
export function sanitizeMlScore(raw: unknown): number | null {
  if (typeof raw !== "number" || !isFinite(raw)) return null;
  return Math.min(1, Math.max(0, raw));
}

// ─── Détection de dimensions cliniques ──────────────────────────────────────
export function detectClinicalDimensions(text: string): ClinicalDimension[] {
  const lower = text.toLowerCase();
  return (Object.keys(DIMENSION_KEYWORDS) as ClinicalDimension[]).filter(
    (dim) => DIMENSION_KEYWORDS[dim].some((kw) => lower.includes(kw))
  );
}

// ─── Score final fusionné ────────────────────────────────────────────────────
// Formule : Score = (selfScore × 0.45) + (mlAdjusted × 0.55), clamped by floor
export function computeFinalScore(
  mlScore: number,
  emotionId: string,
  selfScore: number | null
): number {
  const floor = EMOTION_FLOOR[emotionId] ?? 0.0;
  const isMasking = floor < 0.2 && mlScore > 0.50;
  const mlAdjusted = Math.min(1.0, mlScore + (isMasking ? 0.15 : 0));

  const blended = selfScore !== null
    ? selfScore * 0.45 + mlAdjusted * 0.55
    : mlAdjusted;

  return Math.min(1.0, Math.max(blended, floor));
}

// ─── Niveau de détresse ──────────────────────────────────────────────────────
export function getDistressLevel(
  mlScore: number | null,
  userText: string,
  emotionId: string,
  dimensions: ClinicalDimension[],
  selfScore: number | null
): DistressLevel {
  // 1. Sécurité absolue : keywords critiques
  const lowerText = userText.toLowerCase();
  if (CRITICAL_KEYWORDS.some((kw) => lowerText.includes(kw))) return "critical";

  // 2. Dysrégulation → toujours au moins elevated
  if (dimensions.includes("dysregulation")) return "elevated";

  // 3. Fusion ML + self-report + émotion
  if (mlScore !== null) {
    const finalScore = computeFinalScore(mlScore, emotionId, selfScore);
    if (finalScore >= SCORE_CRITICAL) return "critical";
    if (finalScore >= SCORE_ELEVATED) return "elevated";
    if (dimensions.length > 0) return "elevated";
    return "light";
  }

  // 4. Fallback si API indisponible : émotion seule
  const floor = EMOTION_FLOOR[emotionId] ?? 0.0;
  if (floor >= 0.35) return "elevated";
  return "light";
}

// ─── Profil clinique synthétique ────────────────────────────────────────────
export function deriveClinicalProfile(
  distressLevel: DistressLevel,
  emotionId: string,
  dimensions: ClinicalDimension[]
): ClinicalProfile {
  if (distressLevel === "critical") return "crisis";
  if (dimensions.includes("dysregulation")) return "crisis";
  if (
    dimensions.includes("burnout") ||
    (emotionId === "tiredness" && dimensions.includes("depression_masked"))
  ) return "burnout";
  if (dimensions.includes("anxiety") || emotionId === "fear") return "anxiety";
  if (dimensions.includes("depression_masked") || emotionId === "sadness") return "depression";
  if (distressLevel === "elevated") return "adjustment";
  return "wellbeing";
}

// ─── Pipeline complet ────────────────────────────────────────────────────────
export function buildDiagnosticProfile(params: {
  emotionId: string;
  mode: "kids" | "adult";
  userText: string;
  mlScore: number | null;
  selfScore: number | null;
  selfReportAnswers: number[] | null;
}): DiagnosticProfile {
  const { emotionId, mode, userText, mlScore, selfScore, selfReportAnswers } = params;
  const clinicalDimensions = detectClinicalDimensions(userText);
  const distressLevel = getDistressLevel(mlScore, userText, emotionId, clinicalDimensions, selfScore);
  const finalScore = mlScore !== null ? computeFinalScore(mlScore, emotionId, selfScore) : null;
  const clinicalProfile = deriveClinicalProfile(distressLevel, emotionId, clinicalDimensions);

  return {
    emotionId,
    mode,
    userText,
    selfScore,
    selfReportAnswers,
    mlScore,
    finalScore,
    distressLevel,
    clinicalDimensions,
    clinicalProfile,
  };
}
