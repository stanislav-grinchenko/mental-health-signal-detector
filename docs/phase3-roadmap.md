# Phase 3 — Feuille de route : Compagnon émotionnel intelligent & triage clinique digital

**Principe directeur :** ne jamais remplacer l'humain en cas de risque — toujours orienter.

---

## 1. Architecture globale du système

```
┌─────────────────────────────────────────────────────────────┐
│  INPUT                                                      │
│  Émotion sélectionnée + Texte libre                         │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│  PROCESSING (Phase 1 + 2 — déjà implémenté)                 │
│                                                             │
│  DistilBERT → score_distress [0–1]                          │
│  + emotionFloor (plancher clinique par émotion)             │
│  + masking detection (émotion positive / texte alarmant)    │
│  + keyword detection (4 dimensions cliniques)               │
│  → DiagnosticProfile { distressLevel, clinicalProfile, ... }│
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│  PHASE 3 — Solution Engine                                  │
│                                                             │
│  DiagnosticProfile → niveau 0–4                             │
│  → protocole clinique adapté                                │
│  → message empathique (kids / adult)                        │
│  → micro-actions (CBT / ACT / mindfulness)                  │
│  → ressources (proches / psy / urgence)                     │
│  → escalade si niveau ≥ 3                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Modèle de triage en 5 niveaux

| Niveau | État clinique | distressLevel | clinicalProfile | Objectif |
|--------|--------------|---------------|-----------------|----------|
| **0** | Bien-être / ressource | light | wellbeing | Renforcement positif |
| **1** | Inconfort léger adaptatif | light | adjustment | Auto-régulation |
| **2** | Détresse modérée | elevated | burnout / anxiety / depression | Structuration + accompagnement |
| **3** | Alerte clinique | critical | depression / burnout | Orientation aide humaine |
| **4** | Urgence critique | critical | crisis | Protection immédiate |

### Règle de mapping DiagnosticProfile → Niveau

```
clinicalProfile = crisis                           → Niveau 4
distressLevel = critical AND emotionId IN {sadness, fear, tiredness}  → Niveau 3
distressLevel = critical (autres)                  → Niveau 3
clinicalDimensions includes {burnout, depression_masked} → Niveau 2–3
distressLevel = elevated                           → Niveau 2
clinicalProfile = adjustment                       → Niveau 1
clinicalProfile = wellbeing                        → Niveau 0
```

---

## 3. Protocoles par dimension clinique

### 😔 TRISTESSE / DÉPRESSION

| Niveau | Actions | Brique thérapeutique |
|--------|---------|---------------------|
| 0–1 | Journaling guidé, activation comportementale, activité agréable | CBT — Behavioral Activation |
| 2 | Restructuration cognitive ("preuve pour/contre"), suggestion parler à un proche | CBT — Cognitive Restructuring |
| 3 | Encouragement explicite à consulter, annuaire psy / téléconsultation | Orientation professionnelle |
| 4 | 📞 3114, urgences — bouton "appeler maintenant" | Protocole de crise |

### 😡 COLÈRE / FRUSTRATION / DYSRÉGULATION

| Niveau | Actions | Brique thérapeutique |
|--------|---------|---------------------|
| 0–1 | Respiration 4-6, pause comportementale | Régulation émotionnelle |
| 2 | Identification déclencheur, reformulation cognitive | CBT — Restructuration |
| 3 | Retrait situationnel, médiation guidée | ACT — Distanciation |
| 4 | Redirection immédiate vers aide urgente | Protocole de crise |

### 😰 ANXIÉTÉ / STRESS / PEUR

| Niveau | Actions | Brique thérapeutique |
|--------|---------|---------------------|
| 0–1 | Respiration cohérente cardiaque, grounding 5-4-3-2-1 | CBT anxiété |
| 2 | Exposition douce (micro-steps), décomposition du problème | CBT — Exposition progressive |
| 3 | Orientation thérapeute, psychoéducation (TAG, panique) | Orientation + psychoéducation |
| 4 | Guidance immédiate + contact urgence | Protocole de crise |

### 😴 FATIGUE / BURN-OUT

| Niveau | Actions | Brique thérapeutique |
|--------|---------|---------------------|
| 0–1 | Hygiène de sommeil, micro-pauses, respiration | Psychoéducation |
| 2 | Bilan charge mentale, priorisation, délégation | Coaching guidé |
| 3 | Consultation recommandée (médecin traitant) | Stepped-care — orientation |
| 4 | Protocole crise si désespoir associé | Protocole de crise |

### 😊 JOIE / ZEN / FIERTÉ (niveaux 0)

| État | Actions | Note clinique |
|------|---------|---------------|
| Joie | Ancrage positif, partage social | Attention : hyperactivité + impulsivité → screening hypomanie |
| Zen | Gratitude, méditation courte | Consolidation |
| Fierté | Journal des réussites, renforcement | Construire l'estime durable |

---

## 4. Briques thérapeutiques — bibliothèque de micro-actions

### CBT (Thérapie Cognitive Comportementale)
- Activation comportementale (planifier activités agréables)
- Restructuration cognitive (identifier + challenger pensée négative)
- Journaling guidé ("qu'est-ce qui s'est passé ? comment je me suis senti ?")

### ACT (Acceptation & Engagement)
- Défusion cognitive ("j'observe ma pensée, je ne suis pas ma pensée")
- Clarification de valeurs
- Agir malgré l'inconfort

### Pleine conscience / Mindfulness
- Respiration cohérente cardiaque (5s inspiration, 5s expiration)
- Respiration 4-7-8 (anxiété)
- Grounding 5-4-3-2-1 (5 choses vues, 4 entendues, 3 touchées, 2 odeurs, 1 goût)
- Scan corporel (2 minutes)

### Psychoéducation
- Expliquer le cycle stress-fatigue
- Normaliser l'anxiété ("l'anxiété protège, elle peut devenir envahissante")
- Comprendre la dépression masquée

### Soutien social
- Inciter à nommer une personne de confiance
- Script pour "comment en parler à quelqu'un"

---

## 5. Ressources par niveau (France)

| Niveau | Ressource | Détail |
|--------|-----------|--------|
| 2 | Mon Soutien Psy | Séances remboursées avec psychologue |
| 2 | Doctolib | Prise de RDV téléconsultation |
| 3 | Médecin traitant | Consultation + orientation spécialisée |
| 3 | Psycom | Annuaire psy certifié |
| 4 | **3114** | Numéro national prévention suicide — gratuit 24/7 |
| 4 | **15 / 112** | SAMU / Urgences |
| Enfant | Fil Santé Jeunes | 0 800 235 236 — gratuit, anonyme |

---

## 6. Architecture technique Phase 3

### Fichiers à créer

```
frontend/src/
├── types/
│   ├── diagnostic.ts      ✅ (fait — DiagnosticProfile, ClinicalProfile)
│   └── solutions.ts       🔜 (SolutionResponse, MicroAction, Resource)
├── data/
│   └── solutions.ts       🔜 (tout le contenu thérapeutique)
├── lib/
│   └── solutionEngine.ts  🔜 (moteur de recommandation)
└── screens/
    └── Solutions.tsx       🔜 (écran Phase 3)
```

### Nouveau screen dans le flow

```
SupportResponse
  ↓ (bouton "Voir mes pistes")
Solutions          ← NOUVEAU — Phase 3
  ↓
CheckIn
```

### Contrat de données SolutionResponse

```typescript
interface SolutionResponse {
  level: 0 | 1 | 2 | 3 | 4;
  message: string;                    // message empathique personnalisé
  microActions: MicroAction[];        // 2–3 actions concrètes
  therapeuticBrick: TherapeuticBrick; // CBT | ACT | mindfulness | psychoeducation
  resources: Resource[];              // vides si niveau 0–1
  escalationRequired: boolean;        // true si niveau ≥ 4
}
```

---

## 7. Roadmap d'implémentation

### Sprint 1 — Moteur ✅ TERMINÉ
- [x] `src/types/solutions.ts` — types SolutionResponse (+ `closing`), MicroAction, Resource, TriageLevel, TherapeuticBrick
- [x] `src/data/solutions.ts` — bibliothèque complète : 20 micro-actions, PROFILE_MESSAGES enrichis v2, PROFILE_CLOSINGS, RESOURCES_BY_LEVEL
- [x] `src/lib/solutionEngine.ts` — selectMessage, selectClosing, selectActions, selectBrick, computeSolution

### Sprint 2 — Écran Solutions ✅ TERMINÉ
- [x] `screens/Solutions.tsx` — message + micro-actions + ressources + escalade + clôture + bloc "Et maintenant ?"
- [x] Intégration dans routes.ts (`/solutions`)
- [x] Lien depuis SupportResponse (CTA "Voir mes pistes d'action" → `/solutions`)
- [x] Scripts UX/cliniques v2 intégrés — 8 émotions × 5 niveaux × kids/adult
- [x] 17 keywords critiques (filet de sécurité absolu)

### Sprint 3 — Backend & polish 🔜 EN ATTENTE
- [ ] Endpoint FastAPI `POST /solutions` (pour contenu dynamique / LLM futur)
- [ ] Multi-sélection émotions (Palier 2 — `EmotionSelection.tsx`)
- [ ] Connexion `/checkin` backend pour vrais rappels
- [ ] Tests unitaires frontend (solutionEngine, computeFinalScore, detectClinicalDimensions)
- [ ] Revue Copilot + scan sécurité final

### Contraintes non-négociables
- Niveau 4 → jamais d'écran vide, toujours le 3114 visible
- Enfants → jamais afficher un score numérique de détresse
- Aucune action irréversible sans confirmation utilisateur
- L'app ne pose jamais de diagnostic — elle oriente
