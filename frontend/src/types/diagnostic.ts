/**
 * Contrat de données partagé Phase 2 → Phase 3
 *
 * Ce fichier définit les types qui transitent entre l'analyse (Phase 2)
 * et la proposition de solutions (Phase 3).
 */

// ─── Dimensions cliniques détectées dans le texte ──────────────────────────

export type ClinicalDimension =
  | "burnout"           // stress + fatigue + irritabilité chronique
  | "anxiety"           // peur envahissante, rumination, panique
  | "depression_masked" // perte de sens, dévalorisation, anhédonie
  | "dysregulation";    // perte de contrôle, auto-agression, explosion

// ─── Profil clinique synthétique ───────────────────────────────────────────

export type ClinicalProfile =
  | "wellbeing"         // état normatif, humeur positive
  | "adjustment"        // réaction adaptative légère (tristesse, stress ponctuel)
  | "burnout"           // surcharge chronique — orientation repos + médecin
  | "anxiety"           // activation anxieuse — orientation psychologue / TCC
  | "depression"        // humeur dépressive — orientation médecin + soutien
  | "crisis";           // détresse sévère / idéation — orientation urgence 3114

// ─── Résultat complet de l'analyse (sortie Phase 2, entrée Phase 3) ────────

export interface DiagnosticProfile {
  // Données brutes du flow
  emotionId: string;
  mode: "kids" | "adult";
  userText: string;

  // Score déclaratif — self-report (3 micro-questions PHQ-inspirées)
  // null si l'utilisateur a passé l'étape ou si émotion positive
  selfScore: number | null;          // score normalisé [0–1]
  selfReportAnswers: number[] | null; // réponses brutes [0–3, 0–3, 0–3]

  // Scores ML
  mlScore: number | null;        // score brut distilbert [0–1]
  finalScore: number | null;     // score fusionné (self-report + ML + émotion + masking)

  // Niveau de détresse (3 niveaux)
  distressLevel: "light" | "elevated" | "critical";

  // Dimensions cliniques détectées dans le texte
  clinicalDimensions: ClinicalDimension[];

  // Profil clinique synthétique (dérivé des dimensions + émotion + score)
  clinicalProfile: ClinicalProfile;
}

// ─── Axes du modèle circomplexe (usage futur — multi-sélection Phase 3) ───

export interface EmotionAxes {
  valence: number;       // -1 (très négatif) → +1 (très positif)
  arousal: number;       // -1 (faible activation) → +1 (forte activation)
  anxiety: number;       // 0 (absent) → 1 (intense)
  regulation: number;    // 0 (dysrégulé) → 1 (stable)
  selfEsteem: number;    // 0 (bas) → 1 (haut)
}

// Vecteurs cliniques des 8 émotions de l'app (Palier 2 — multi-sélection)
export const EMOTION_AXES: Record<string, EmotionAxes> = {
  joy:       { valence: +1.0, arousal: +0.7, anxiety: 0.0, regulation: 0.9, selfEsteem: 0.8 },
  sadness:   { valence: -0.8, arousal: -0.5, anxiety: 0.3, regulation: 0.6, selfEsteem: 0.3 },
  anger:     { valence: -0.6, arousal: +0.8, anxiety: 0.4, regulation: 0.2, selfEsteem: 0.4 },
  fear:      { valence: -0.7, arousal: +0.6, anxiety: 0.9, regulation: 0.4, selfEsteem: 0.3 },
  stress:    { valence: -0.5, arousal: +0.7, anxiety: 0.7, regulation: 0.4, selfEsteem: 0.5 },
  calm:      { valence: +0.6, arousal: -0.3, anxiety: 0.0, regulation: 1.0, selfEsteem: 0.7 },
  tiredness: { valence: -0.4, arousal: -0.8, anxiety: 0.2, regulation: 0.5, selfEsteem: 0.4 },
  pride:     { valence: +0.8, arousal: +0.3, anxiety: 0.0, regulation: 0.8, selfEsteem: 1.0 },
};
