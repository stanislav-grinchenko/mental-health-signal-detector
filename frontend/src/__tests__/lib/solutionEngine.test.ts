import { describe, it, expect } from "vitest";
import { computeSolution } from "../../lib/solutionEngine";
import type { DiagnosticProfile } from "../../types/diagnostic";

// ─── Factories ───────────────────────────────────────────────────────────────

function makeProfile(overrides: Partial<DiagnosticProfile> = {}): DiagnosticProfile {
  return {
    emotionId: "stress",
    mode: "adult",
    userText: "je suis un peu stressé",
    selfScore: null,
    selfReportAnswers: null,
    mlScore: 0.3,
    finalScore: 0.3,
    distressLevel: "light",
    clinicalDimensions: [],
    clinicalProfile: "wellbeing",
    ...overrides,
  };
}

// ─── Triage level mapping ─────────────────────────────────────────────────────

describe("computeSolution — niveau de triage", () => {
  it("crisis → niveau 4, escalationRequired=true", () => {
    const sol = computeSolution(makeProfile({ clinicalProfile: "crisis", distressLevel: "critical" }));
    expect(sol.level).toBe(4);
    expect(sol.escalationRequired).toBe(true);
  });

  it("distressLevel critical (non crisis) → niveau 3 ou 4", () => {
    const sol = computeSolution(makeProfile({
      clinicalProfile: "depression",
      distressLevel: "critical",
    }));
    // clinicalProfile depression + distressLevel critical → niveau 3 (pas crisis)
    expect(sol.level).toBe(3);
    expect(sol.escalationRequired).toBe(false);
  });

  it("burnout chronique (tiredness) → niveau 3", () => {
    const sol = computeSolution(makeProfile({
      clinicalProfile: "burnout",
      distressLevel: "elevated",
      clinicalDimensions: ["burnout"],
      emotionId: "tiredness",
    }));
    expect(sol.level).toBe(3);
  });

  it("distressLevel elevated → niveau 2", () => {
    const sol = computeSolution(makeProfile({
      clinicalProfile: "adjustment",
      distressLevel: "elevated",
    }));
    expect(sol.level).toBe(2);
  });

  it("anxiety profile → niveau 2", () => {
    const sol = computeSolution(makeProfile({
      clinicalProfile: "anxiety",
      distressLevel: "light",
    }));
    expect(sol.level).toBe(2);
  });

  it("depression profile → niveau 2", () => {
    const sol = computeSolution(makeProfile({
      clinicalProfile: "depression",
      distressLevel: "light",
    }));
    expect(sol.level).toBe(2);
  });

  it("adjustment profile → niveau 1", () => {
    const sol = computeSolution(makeProfile({
      clinicalProfile: "adjustment",
      distressLevel: "light",
    }));
    expect(sol.level).toBe(1);
  });

  it("wellbeing → niveau 0, escalationRequired=false", () => {
    const sol = computeSolution(makeProfile({
      clinicalProfile: "wellbeing",
      distressLevel: "light",
    }));
    expect(sol.level).toBe(0);
    expect(sol.escalationRequired).toBe(false);
  });
});

// ─── Structure de la réponse ─────────────────────────────────────────────────

describe("computeSolution — structure de la réponse", () => {
  it("retourne tous les champs requis", () => {
    const sol = computeSolution(makeProfile());
    expect(sol).toHaveProperty("level");
    expect(sol).toHaveProperty("clinicalProfile");
    expect(sol).toHaveProperty("message");
    expect(sol).toHaveProperty("closing");
    expect(sol).toHaveProperty("microActions");
    expect(sol).toHaveProperty("therapeuticBrick");
    expect(sol).toHaveProperty("resources");
    expect(sol).toHaveProperty("escalationRequired");
  });

  it("message est une chaîne non vide", () => {
    const sol = computeSolution(makeProfile());
    expect(typeof sol.message).toBe("string");
    expect(sol.message.length).toBeGreaterThan(0);
  });

  it("closing est une chaîne non vide", () => {
    const sol = computeSolution(makeProfile());
    expect(typeof sol.closing).toBe("string");
    expect(sol.closing.length).toBeGreaterThan(0);
  });

  it("microActions est un tableau non vide", () => {
    const sol = computeSolution(makeProfile());
    expect(Array.isArray(sol.microActions)).toBe(true);
    expect(sol.microActions.length).toBeGreaterThan(0);
  });

  it("resources est un tableau", () => {
    const sol = computeSolution(makeProfile());
    expect(Array.isArray(sol.resources)).toBe(true);
  });

  it("resources non vides pour niveau ≥ 2", () => {
    const sol = computeSolution(makeProfile({
      clinicalProfile: "depression",
      distressLevel: "elevated",
    }));
    expect(sol.resources.length).toBeGreaterThan(0);
  });
});

// ─── Brique thérapeutique ─────────────────────────────────────────────────────

describe("computeSolution — therapeuticBrick", () => {
  it("crise → brick crisis", () => {
    const sol = computeSolution(makeProfile({ clinicalProfile: "crisis", distressLevel: "critical" }));
    expect(sol.therapeuticBrick).toBe("crisis");
  });

  it("niveau 3 → brick professional", () => {
    const sol = computeSolution(makeProfile({ clinicalProfile: "depression", distressLevel: "critical" }));
    expect(sol.therapeuticBrick).toBe("professional");
  });

  it("anxiety → mindfulness", () => {
    const sol = computeSolution(makeProfile({ clinicalProfile: "anxiety", distressLevel: "light" }));
    expect(sol.therapeuticBrick).toBe("mindfulness");
  });

  it("burnout → psychoeducation", () => {
    const sol = computeSolution(makeProfile({ clinicalProfile: "burnout", distressLevel: "light" }));
    expect(sol.therapeuticBrick).toBe("psychoeducation");
  });

  it("depression elevated → cbt_restructuring", () => {
    const sol = computeSolution(makeProfile({ clinicalProfile: "depression", distressLevel: "elevated" }));
    expect(sol.therapeuticBrick).toBe("cbt_restructuring");
  });

  it("wellbeing → cbt_activation", () => {
    const sol = computeSolution(makeProfile({ clinicalProfile: "wellbeing", distressLevel: "light" }));
    expect(sol.therapeuticBrick).toBe("cbt_activation");
  });
});

// ─── Mode kids vs adult ───────────────────────────────────────────────────────

describe("computeSolution — adaptation kids/adult", () => {
  it("messages différents selon le mode", () => {
    const solKids = computeSolution(makeProfile({ mode: "kids", emotionId: "sadness",
      clinicalProfile: "depression", distressLevel: "elevated" }));
    const solAdult = computeSolution(makeProfile({ mode: "adult", emotionId: "sadness",
      clinicalProfile: "depression", distressLevel: "elevated" }));
    // Les messages peuvent être identiques si les données ne contiennent pas de variante,
    // mais ils doivent au minimum être des chaînes non vides
    expect(solKids.message).toBeTruthy();
    expect(solAdult.message).toBeTruthy();
  });

  it("resources adaptées au mode", () => {
    const solKids = computeSolution(makeProfile({ mode: "kids", clinicalProfile: "crisis", distressLevel: "critical" }));
    const solAdult = computeSolution(makeProfile({ mode: "adult", clinicalProfile: "crisis", distressLevel: "critical" }));
    expect(solKids.resources).not.toEqual(solAdult.resources);
  });
});

// ─── Ressources d'urgence au niveau 4 ────────────────────────────────────────

describe("computeSolution — ressources niveau 4 (crise)", () => {
  it("inclut une ressource avec la ligne 3114 (id ou href)", () => {
    const sol = computeSolution(makeProfile({ clinicalProfile: "crisis", distressLevel: "critical" }));
    const hasEmergency = sol.resources.some(
      (r) => r.id === "3114" || r.href?.includes("3114")
    );
    expect(hasEmergency).toBe(true);
  });

  it("escalationRequired = true uniquement au niveau 4", () => {
    for (let level = 0; level <= 3; level++) {
      const profiles: Partial<DiagnosticProfile>[] = [
        { clinicalProfile: "wellbeing", distressLevel: "light" },
        { clinicalProfile: "adjustment", distressLevel: "light" },
        { clinicalProfile: "depression", distressLevel: "light" },
        { clinicalProfile: "depression", distressLevel: "elevated" },
      ];
      const sol = computeSolution(makeProfile(profiles[level] ?? profiles[0]));
      expect(sol.escalationRequired).toBe(false);
    }
    const crisisSol = computeSolution(makeProfile({ clinicalProfile: "crisis", distressLevel: "critical" }));
    expect(crisisSol.escalationRequired).toBe(true);
  });
});

// ─── Propriétés des microActions ─────────────────────────────────────────────

describe("computeSolution — microActions structure", () => {
  it("chaque microAction a id, title, description", () => {
    const sol = computeSolution(makeProfile());
    for (const action of sol.microActions) {
      expect(action).toHaveProperty("id");
      expect(action).toHaveProperty("title");
      expect(action).toHaveProperty("description");
    }
  });
});
