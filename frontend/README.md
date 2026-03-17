# Frontend — "Comment vas-tu ?" Web App

Application mobile-first React/TypeScript — interface de check-in émotionnel avec moteur de recommandation clinique (Phases 2 & 3).

---

## Stack

| Technologie | Version |
|-------------|---------|
| Vite | 6.3.5 |
| React | 18 |
| TypeScript | 5.9 |
| Tailwind CSS | v4 (via `@tailwindcss/vite`) |
| motion | v12 (`import from "motion/react"`) |
| React Router | v7 |
| lucide-react | 0.487 |
| tw-animate-css | latest |

---

## Structure

```
frontend/
├── src/
│   ├── screens/
│   │   ├── Welcome.tsx          # Accueil — choix mode Enfant / Adulte
│   │   ├── EmotionSelection.tsx # Grille 8 émotions (cards colorées + timer auto)
│   │   ├── Expression.tsx       # Textarea + POST /predict (distilbert) + AbortController
│   │   ├── SupportResponse.tsx  # Pipeline clinique : fusion ML + émotion → DiagnosticProfile
│   │   ├── Solutions.tsx        # Phase 3 : message + micro-actions + ressources + clôture
│   │   └── CheckIn.tsx          # Planification d'un rappel (1h / 4h / demain)
│   ├── types/
│   │   ├── diagnostic.ts        # DiagnosticProfile, ClinicalProfile, ClinicalDimension, EmotionAxes
│   │   └── solutions.ts         # SolutionResponse, MicroAction, Resource, TriageLevel, TherapeuticBrick
│   ├── data/
│   │   └── solutions.ts         # Bibliothèque thérapeutique : messages, closings, actions, ressources
│   ├── lib/
│   │   └── solutionEngine.ts    # Moteur : DiagnosticProfile → SolutionResponse (triage 0–4)
│   ├── components/
│   │   └── figma/
│   │       └── ImageWithFallback.tsx
│   ├── App.tsx                  # Mobile frame + RouterProvider
│   ├── routes.ts                # createBrowserRouter — 6 routes
│   ├── index.css                # Imports CSS (fonts + tailwind + theme)
│   ├── tailwind.css             # Tailwind v4 + tw-animate-css
│   └── theme.css                # CSS custom properties (design tokens)
└── vite.config.ts               # Proxy /predict /checkin /health → :8000
```

---

## Workflow utilisateur (Phase 3 complet)

```
Welcome
  ↓ Mode Enfant ou Adulte
EmotionSelection
  ↓ 1 émotion parmi 8
Expression
  ↓ Texte libre → POST /predict (distilbert) — spinner + AbortController
SupportResponse   [Pipeline clinique]
  ↓ finalScore = max(mlScore + maskingBonus, emotionFloor)
  ↓ detectClinicalDimensions → deriveClinicalProfile
  ↓ DiagnosticProfile → navigate("/solutions")
Solutions         [Phase 3 — Moteur de recommandation]
  ↓ computeSolution(diagnosticProfile) → SolutionResponse (triage 0–4)
  ↓ message empathique + micro-actions + ressources + clôture + "Et maintenant ?"
CheckIn
  ↓ Programmer un rappel (1h / 4h / demain)
```

---

## Lancement

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173
```

Le backend FastAPI doit tourner sur `:8000` pour les appels ML :

```bash
# Depuis la racine du projet
TRANSFORMERS_NO_TF=1 uvicorn src.api.main:app --reload --port 8000
```

---

## Phase 2 — Pipeline clinique (SupportResponse)

### Planchers d'émotion recalibrés

| Émotion | emotionFloor | Justification clinique |
|---------|-------------|----------------------|
| sadness, fear | **0.35** | Signal majeur — minimum `elevated` garanti |
| anger, tiredness | **0.30** | Dépression masquée, burn-out |
| stress | **0.25** | Anxiété chronique |
| joy, calm, pride | **0.0** | Pas de plancher |

### Score final

```
isMasking  = (emotionFloor < 0.2) AND (mlScore > 0.50)
finalScore = min(1.0, max(mlScore + (isMasking ? 0.15 : 0), emotionFloor))
```

### Dimensions cliniques détectées

4 dimensions via keywords FR/EN dans le texte :

| Dimension | Signal |
|-----------|--------|
| `burnout` | épuisement, surcharge, je n'en peux plus… |
| `anxiety` | panique, crises d'angoisse, je n'arrive plus… |
| `depression_masked` | rien ne sert à rien, tout est inutile… |
| `dysregulation` | violence, crise, perte de contrôle… |

Présence d'une dimension → niveau minimum `elevated`.

### Filet de sécurité absolu — 17 keywords critiques

`suicide`, `suicider`, `me tuer`, `mourir`, `plus envie de vivre`, `disparaître`, `en finir`, `me supprimer`, `j'ai envie de mourir`, `pensées suicidaires`, `je veux mourir`, `je n'en peux plus`, `je veux disparaître`, `je ne veux plus être là`, `personne ne m'aime`, `personne ne peut m'aider`, `je ne veux plus vivre`

→ Force `critical` immédiatement, sans tenir compte du score ML.

### Profils cliniques dérivés (6)

| Profil | Condition |
|--------|-----------|
| `crisis` | keywords critiques détectés |
| `depression` | sadness/fear + distress élevée |
| `burnout` | tiredness/anger + dimension burnout |
| `anxiety` | fear/stress + dimension anxiety |
| `adjustment` | distress légère |
| `wellbeing` | joy/calm/pride + score bas |

---

## Phase 3 — Moteur de recommandation clinique (Solutions)

### Triage 5 niveaux

| Niveau | État | Protocole |
|--------|------|-----------|
| 0 | Bien-être | Renforcement positif, ancrage |
| 1 | Inconfort léger | Auto-régulation (CBT activation) |
| 2 | Détresse modérée | Structuration + soutien (CBT/ACT) |
| 3 | Alerte clinique | Orientation professionnelle |
| 4 | Urgence critique | 3114 + SAMU — escalade immédiate |

### Briques thérapeutiques

`cbt_activation` · `cbt_restructuring` · `act` · `mindfulness` · `psychoeducation` · `social_support` · `professional` · `crisis`

### Contenu (bibliothèque `data/solutions.ts`)

- **20 micro-actions** : respiration 4-7-8, cohérente, grounding 5-4-3-2-1, scan corporel, journaling, restructuration cognitive, ACT, psychoéducation, bilan de charge, hygiène de sommeil…
- **Scripts UX/cliniques v2** : 8 émotions × 5 niveaux × kids/adult (message + lecture émotionnelle + clôture)
- **Ressources France** : 3114, SAMU, Fil Santé Jeunes, Mon Soutien Psy, Psycom, médecin traitant

### Contraintes non-négociables

- Niveau 4 → 3114 toujours visible, jamais d'écran vide
- Mode enfants → aucun score numérique de détresse affiché, badge clinique masqué
- L'app n'émet jamais de diagnostic médical — elle oriente uniquement

---

## Build

```bash
npm run build     # tsc -b && vite build → dist/
```
