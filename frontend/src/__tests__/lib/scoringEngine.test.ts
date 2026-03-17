import { describe, it, expect } from "vitest";
import {
  sanitizeMlScore,
  computeFinalScore,
  getDistressLevel,
  detectClinicalDimensions,
  deriveClinicalProfile,
  buildDiagnosticProfile,
  SCORE_CRITICAL,
  SCORE_ELEVATED,
  EMOTION_FLOOR,
  CRITICAL_KEYWORDS,
} from "../../lib/scoringEngine";

// ─── sanitizeMlScore ─────────────────────────────────────────────────────────

describe("sanitizeMlScore", () => {
  it("retourne null pour une valeur non numérique", () => {
    expect(sanitizeMlScore("0.5")).toBeNull();
    expect(sanitizeMlScore(null)).toBeNull();
    expect(sanitizeMlScore(undefined)).toBeNull();
    expect(sanitizeMlScore({})).toBeNull();
  });

  it("retourne null pour NaN et Infinity", () => {
    expect(sanitizeMlScore(NaN)).toBeNull();
    expect(sanitizeMlScore(Infinity)).toBeNull();
    expect(sanitizeMlScore(-Infinity)).toBeNull();
  });

  it("clamp entre 0 et 1", () => {
    expect(sanitizeMlScore(1.5)).toBe(1);
    expect(sanitizeMlScore(-0.2)).toBe(0);
    expect(sanitizeMlScore(0)).toBe(0);
    expect(sanitizeMlScore(1)).toBe(1);
  });

  it("conserve une valeur valide dans [0, 1]", () => {
    expect(sanitizeMlScore(0.72)).toBe(0.72);
    expect(sanitizeMlScore(0.35)).toBe(0.35);
  });
});

// ─── computeFinalScore ───────────────────────────────────────────────────────

describe("computeFinalScore", () => {
  it("retourne le score ML sans self-report", () => {
    const score = computeFinalScore(0.5, "stress", null);
    expect(score).toBeGreaterThanOrEqual(0.25); // plancher stress
    expect(score).toBeLessThanOrEqual(1.0);
  });

  it("applique le plancher émotionnel sadness (0.35)", () => {
    const score = computeFinalScore(0.1, "sadness", null);
    expect(score).toBe(EMOTION_FLOOR.sadness);
  });

  it("applique le plancher émotionnel fear (0.35)", () => {
    const score = computeFinalScore(0.05, "fear", null);
    expect(score).toBe(EMOTION_FLOOR.fear);
  });

  it("aucun plancher pour joy/calm/pride", () => {
    expect(computeFinalScore(0.05, "joy", null)).toBe(0.05);
    expect(computeFinalScore(0.0, "calm", null)).toBe(0.0);
    expect(computeFinalScore(0.1, "pride", null)).toBe(0.1);
  });

  it("blend pondéré avec self-report", () => {
    const ml = 0.6;
    const self = 0.8;
    const expected = self * 0.45 + ml * 0.55; // 0.36 + 0.33 = 0.69
    expect(computeFinalScore(ml, "stress", self)).toBeCloseTo(expected, 5);
  });

  it("masking detection : joy avec ML > 0.50 ajoute +0.15", () => {
    // joy a floor=0.0 < 0.2, mlScore=0.6 > 0.50 → isMasking = true
    const score = computeFinalScore(0.6, "joy", null);
    expect(score).toBeCloseTo(0.75, 5); // 0.6 + 0.15
  });

  it("pas de masking pour sadness (floor=0.35, ≥ 0.2)", () => {
    const scoreWithoutMasking = computeFinalScore(0.6, "sadness", null);
    const scoreWithMasking = computeFinalScore(0.6, "joy", null);
    // sadness ne doit pas bénéficier du bonus de masking
    expect(scoreWithoutMasking).not.toBeCloseTo(scoreWithMasking, 5);
    expect(scoreWithoutMasking).toBe(0.6); // pas de bonus, plancher < mlScore donc pas de clamp par le bas
  });

  it("ne dépasse jamais 1.0", () => {
    expect(computeFinalScore(1.0, "joy", 1.0)).toBe(1.0);
    expect(computeFinalScore(0.95, "joy", null)).toBe(1.0); // 0.95 + 0.15 masking
  });
});

// ─── detectClinicalDimensions ────────────────────────────────────────────────

describe("detectClinicalDimensions", () => {
  it("retourne tableau vide pour texte neutre", () => {
    expect(detectClinicalDimensions("Je me sens bien aujourd'hui")).toEqual([]);
  });

  it("détecte burnout", () => {
    expect(detectClinicalDimensions("je n'arrive plus, je suis à bout")).toContain("burnout");
  });

  it("détecte anxiety", () => {
    expect(detectClinicalDimensions("j'angoisse tout le temps et je panique")).toContain("anxiety");
  });

  it("détecte depression_masked", () => {
    expect(detectClinicalDimensions("à quoi ça sert, je me sens vide")).toContain("depression_masked");
  });

  it("détecte dysregulation", () => {
    expect(detectClinicalDimensions("j'explose et je perds le contrôle")).toContain("dysregulation");
  });

  it("détecte plusieurs dimensions simultanément", () => {
    const dims = detectClinicalDimensions("j'angoisse et à quoi ça sert de continuer");
    expect(dims).toContain("anxiety");
    expect(dims).toContain("depression_masked");
  });

  it("détection insensible à la casse", () => {
    expect(detectClinicalDimensions("BURNOUT : plus la force")).toContain("burnout");
  });

  it("détecte mots-clés anglais (burnout)", () => {
    expect(detectClinicalDimensions("I'm burned out and exhausted for weeks")).toContain("burnout");
  });
});

// ─── getDistressLevel ────────────────────────────────────────────────────────

describe("getDistressLevel", () => {
  it("retourne critical sur keyword critique — indépendamment du score", () => {
    expect(getDistressLevel(0.1, "je veux mourir", "joy", [], null)).toBe("critical");
    expect(getDistressLevel(null, "pensées suicidaires", "calm", [], null)).toBe("critical");
    expect(getDistressLevel(0.0, "je n'en peux plus", "stress", [], null)).toBe("critical");
  });

  it("retourne elevated sur dysregulation quelle que soit l'intensité", () => {
    expect(getDistressLevel(0.1, "texte normal", "joy", ["dysregulation"], null)).toBe("elevated");
  });

  it("retourne critical quand score final ≥ SCORE_CRITICAL", () => {
    // Score très élevé → critical
    expect(getDistressLevel(0.9, "texte normal", "stress", [], null)).toBe("critical");
  });

  it("retourne elevated quand score final ≥ SCORE_ELEVATED", () => {
    // mlScore=0.4 > floor stress(0.25) → score=0.4 ≥ 0.35
    expect(getDistressLevel(0.4, "texte normal", "stress", [], null)).toBe("elevated");
  });

  it("retourne light pour score bas et pas de dimensions", () => {
    // mlScore=0.1, joy floor=0.0 → score=0.1+0.15=0.25 (masking) < 0.35
    expect(getDistressLevel(0.1, "je suis content", "joy", [], null)).toBe("light");
  });

  it("retourne elevated si dimensions présentes même avec score bas", () => {
    // mlScore=0.2, joy floor=0.0, score=0.2+0.15=0.35=SCORE_ELEVATED
    // Si score est 0.2 sans masking (floor≥0.2) → vérifions anger
    // anger floor=0.30, mlScore=0.1 → score=0.30 (plancher) < 0.35
    // mais dimensions présentes → elevated
    expect(getDistressLevel(0.1, "je n'arrive plus", "anger", ["burnout"], null)).toBe("elevated");
  });

  it("fallback sans ML — sadness → elevated", () => {
    expect(getDistressLevel(null, "je suis triste", "sadness", [], null)).toBe("elevated");
  });

  it("fallback sans ML — joy → light", () => {
    expect(getDistressLevel(null, "je suis content", "joy", [], null)).toBe("light");
  });

  it("self-report élevé augmente le niveau", () => {
    // mlScore=0.3, selfScore=0.9, stress floor=0.25
    // blended = 0.9*0.45 + 0.3*0.55 = 0.405 + 0.165 = 0.57 → elevated (< critical 0.65)
    const level = getDistressLevel(0.3, "stressé", "stress", [], 0.9);
    expect(level).toBe("elevated");
  });

  it("les 18 keywords critiques déclenchent tous critical", () => {
    for (const kw of CRITICAL_KEYWORDS) {
      const level = getDistressLevel(0, `context: ${kw}`, "joy", [], null);
      expect(level).toBe("critical");
    }
  });
});

// ─── deriveClinicalProfile ───────────────────────────────────────────────────

describe("deriveClinicalProfile", () => {
  it("critical → crisis toujours", () => {
    expect(deriveClinicalProfile("critical", "joy", [])).toBe("crisis");
    expect(deriveClinicalProfile("critical", "sadness", ["anxiety"])).toBe("crisis");
  });

  it("dysregulation → crisis même en light", () => {
    expect(deriveClinicalProfile("light", "anger", ["dysregulation"])).toBe("crisis");
  });

  it("burnout dimensions → burnout", () => {
    expect(deriveClinicalProfile("elevated", "stress", ["burnout"])).toBe("burnout");
  });

  it("tiredness + depression_masked → burnout", () => {
    expect(deriveClinicalProfile("elevated", "tiredness", ["depression_masked"])).toBe("burnout");
  });

  it("anxiety dimension ou émotion fear → anxiety", () => {
    expect(deriveClinicalProfile("elevated", "stress", ["anxiety"])).toBe("anxiety");
    expect(deriveClinicalProfile("elevated", "fear", [])).toBe("anxiety");
  });

  it("depression_masked ou émotion sadness → depression", () => {
    expect(deriveClinicalProfile("elevated", "anger", ["depression_masked"])).toBe("depression");
    expect(deriveClinicalProfile("elevated", "sadness", [])).toBe("depression");
  });

  it("elevated sans dimension → adjustment", () => {
    expect(deriveClinicalProfile("elevated", "stress", [])).toBe("adjustment");
  });

  it("light sans dimension → wellbeing", () => {
    expect(deriveClinicalProfile("light", "joy", [])).toBe("wellbeing");
    expect(deriveClinicalProfile("light", "calm", [])).toBe("wellbeing");
  });
});

// ─── buildDiagnosticProfile (pipeline complet) ──────────────────────────────

describe("buildDiagnosticProfile", () => {
  it("construit un profil complet pour une entrée normale", () => {
    const profile = buildDiagnosticProfile({
      emotionId: "sadness",
      mode: "adult",
      userText: "je suis un peu triste sans raison",
      mlScore: 0.4,
      selfScore: 0.5,
      selfReportAnswers: [1, 1, 2],
    });

    expect(profile.emotionId).toBe("sadness");
    expect(profile.mode).toBe("adult");
    expect(profile.distressLevel).toBe("elevated");
    expect(profile.clinicalProfile).toBe("depression");
    expect(profile.finalScore).not.toBeNull();
    expect(profile.selfScore).toBe(0.5);
    expect(profile.selfReportAnswers).toEqual([1, 1, 2]);
  });

  it("détecte la crise sur keyword", () => {
    const profile = buildDiagnosticProfile({
      emotionId: "sadness",
      mode: "kids",
      userText: "je veux mourir tellement je suis triste",
      mlScore: 0.2,
      selfScore: null,
      selfReportAnswers: null,
    });

    expect(profile.distressLevel).toBe("critical");
    expect(profile.clinicalProfile).toBe("crisis");
  });

  it("gère mlScore null (API indisponible)", () => {
    const profile = buildDiagnosticProfile({
      emotionId: "fear",
      mode: "adult",
      userText: "j'ai un peu peur",
      mlScore: null,
      selfScore: null,
      selfReportAnswers: null,
    });

    expect(profile.finalScore).toBeNull();
    expect(profile.distressLevel).toBe("elevated"); // plancher fear=0.35
  });

  it("produit wellbeing pour une émotion positive avec faible score", () => {
    const profile = buildDiagnosticProfile({
      emotionId: "joy",
      mode: "adult",
      userText: "je suis vraiment content aujourd'hui",
      mlScore: 0.05,
      selfScore: null,
      selfReportAnswers: null,
    });

    expect(profile.distressLevel).toBe("light");
    expect(profile.clinicalProfile).toBe("wellbeing");
  });
});

// ─── Constantes exportées ───────────────────────────────────────────────────

describe("constantes", () => {
  it("SCORE_CRITICAL = 0.65", () => expect(SCORE_CRITICAL).toBe(0.65));
  it("SCORE_ELEVATED = 0.35", () => expect(SCORE_ELEVATED).toBe(0.35));
  it("EMOTION_FLOOR sadness = 0.35", () => expect(EMOTION_FLOOR.sadness).toBe(0.35));
  it("CRITICAL_KEYWORDS contient au moins 15 entrées", () => {
    expect(CRITICAL_KEYWORDS.length).toBeGreaterThanOrEqual(15);
  });
});
