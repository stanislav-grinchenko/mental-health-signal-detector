import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { Smile, Frown, Angry, CloudRain, Zap, Cloud, Moon, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type Emotion = {
  id: string;
  label: string;
  labelKids: string;
  color: string;
  gradient: string;
  icon: React.ComponentType<any>;
  description: string;
};

const emotions: Emotion[] = [
  { id: "joy",       label: "Joyeux",      labelKids: "Super joyeux",  color: "#FCD34D", gradient: "from-yellow-300 to-amber-400",   icon: Smile,     description: "Plein d'énergie positive" },
  { id: "sadness",   label: "Triste",      labelKids: "Un peu triste", color: "#60A5FA", gradient: "from-blue-300 to-blue-400",      icon: Frown,     description: "Le cœur un peu lourd" },
  { id: "anger",     label: "En colère",   labelKids: "Fâché",         color: "#F87171", gradient: "from-red-300 to-rose-400",       icon: Angry,     description: "Frustré ou énervé" },
  { id: "fear",      label: "Inquiet",     labelKids: "Peur",          color: "#A78BFA", gradient: "from-purple-300 to-violet-400",  icon: CloudRain, description: "Préoccupé par quelque chose" },
  { id: "stress",    label: "Stressé",     labelKids: "Nerveux",       color: "#FB923C", gradient: "from-orange-300 to-orange-400",  icon: Zap,       description: "Sous pression" },
  { id: "calm",      label: "Calme",       labelKids: "Zen",           color: "#6EE7B7", gradient: "from-emerald-300 to-teal-400",   icon: Cloud,     description: "Paisible et serein" },
  { id: "tiredness", label: "Fatigué",     labelKids: "Très fatigué",  color: "#94A3B8", gradient: "from-slate-300 to-slate-400",    icon: Moon,      description: "Besoin de repos" },
  { id: "pride",     label: "Fier",        labelKids: "Super fier",    color: "#F9A8D4", gradient: "from-pink-300 to-pink-400",      icon: Trophy,    description: "Content de soi" },
];

const EMOTION_MAP = Object.fromEntries(emotions.map((e) => [e.id, e]));

// Priorité clinique — détermine l'émotion primaire quand plusieurs sont sélectionnées
// (basée sur EMOTION_FLOOR de scoringEngine.ts)
const CLINICAL_PRIORITY: Record<string, number> = {
  sadness: 5, fear: 5,
  anger: 4,   tiredness: 4,
  stress: 3,
  joy: 1,     calm: 1, pride: 1,
};

function selectPrimary(selectedIds: string[]): string {
  if (selectedIds.length === 0) return "";
  return [...selectedIds].sort(
    (a, b) => (CLINICAL_PRIORITY[b] ?? 0) - (CLINICAL_PRIORITY[a] ?? 0)
  )[0];
}

export default function EmotionSelection() {
  const location = useLocation();
  const navigate = useNavigate();
  const mode = (location.state?.mode || "kids") as "kids" | "adult";

  // Multi-sélection — max 2 en mode kids, 3 en mode adulte
  const MAX_SELECT = mode === "kids" ? 2 : 3;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Nettoyage de la sélection si on revient avec un état différent
  useEffect(() => { setSelectedIds([]); }, [mode]);

  const handleToggle = (emotion: Emotion) => {
    setSelectedIds((prev) => {
      if (prev.includes(emotion.id)) {
        // Désélection
        return prev.filter((id) => id !== emotion.id);
      }
      if (prev.length >= MAX_SELECT) {
        // Max atteint — remplace le dernier sélectionné
        return [...prev.slice(0, MAX_SELECT - 1), emotion.id];
      }
      return [...prev, emotion.id];
    });
  };

  const handleContinue = () => {
    if (selectedIds.length === 0) return;
    const primaryId = selectPrimary(selectedIds);
    const primary = EMOTION_MAP[primaryId];

    navigate("/quickcheck", {
      state: {
        emotionId: primary.id,
        emotionLabel: mode === "kids" ? primary.labelKids : primary.label,
        emotionColor: primary.gradient,
        // Données multi-sélection — utilisées pour l'affichage dans les écrans suivants
        emotionIds: selectedIds,
        emotionLabels: selectedIds.map((id) =>
          mode === "kids" ? EMOTION_MAP[id].labelKids : EMOTION_MAP[id].label
        ),
        mode,
      },
    });
  };

  const hasSelection = selectedIds.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-teal-50 to-yellow-50 flex flex-col">
      {/* Header */}
      <div className="px-6 pt-12 pb-4">
        <button
          onClick={() => navigate("/")}
          className="text-gray-500 mb-6 hover:text-gray-700 transition-colors"
        >
          ← Retour
        </button>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4"
        >
          <h1 className="text-3xl mb-2" style={{ color: "#2A5F7D" }}>
            {mode === "kids" ? "Comment tu te sens ?" : "Comment vous sentez-vous ?"}
          </h1>
          <p className="text-gray-500 text-sm">
            {mode === "kids"
              ? `Choisis jusqu'à ${MAX_SELECT} émotions`
              : `Sélectionnez jusqu'à ${MAX_SELECT} émotions`}
          </p>
        </motion.div>

        {/* Indicateur de sélection */}
        <AnimatePresence>
          {hasSelection && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex justify-center gap-2 mb-4 flex-wrap"
            >
              {selectedIds.map((id) => {
                const e = EMOTION_MAP[id];
                return (
                  <motion.span
                    key={id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium text-white bg-gradient-to-r ${e.gradient} shadow-sm`}
                  >
                    {mode === "kids" ? e.labelKids : e.label}
                  </motion.span>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mode indicator */}
        <div className="flex justify-center mb-4">
          <div
            className={`inline-flex px-4 py-2 rounded-full text-sm ${
              mode === "kids"
                ? "bg-yellow-200 text-yellow-800"
                : "bg-teal-200 text-teal-800"
            }`}
          >
            {mode === "kids" ? "👶 Mode Enfant" : "🧑 Mode Adulte"}
          </div>
        </div>
      </div>

      {/* Emotion Cards */}
      <div className="flex-1 px-4 overflow-y-auto" style={{ paddingBottom: hasSelection ? "120px" : "48px" }}>
        <div
          className="grid grid-cols-2 gap-4 max-w-md mx-auto"
          role="group"
          aria-label={mode === "kids" ? "Choisir une ou plusieurs émotions" : "Sélectionner une ou plusieurs émotions"}
        >
          {emotions.map((emotion, index) => {
            const Icon = emotion.icon;
            const isSelected = selectedIds.includes(emotion.id);
            const isDisabled = !isSelected && selectedIds.length >= MAX_SELECT;
            const emotionLabel = mode === "kids" ? emotion.labelKids : emotion.label;
            const ariaLabel = isDisabled
              ? `${emotionLabel} — non disponible, maximum atteint`
              : isSelected
              ? `${emotionLabel} — sélectionné, cliquer pour désélectionner`
              : `${emotionLabel}${mode === "adult" ? ` — ${emotion.description}` : ""}`;

            return (
              <motion.div
                key={emotion.id}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: index * 0.08, type: "spring" }}
              >
                <motion.button
                  whileHover={{ scale: isDisabled ? 1 : 1.05, y: isDisabled ? 0 : -5 }}
                  whileTap={{ scale: isDisabled ? 1 : 0.95 }}
                  onClick={() => !isDisabled && handleToggle(emotion)}
                  aria-pressed={isSelected}
                  aria-disabled={isDisabled}
                  aria-label={ariaLabel}
                  className={`w-full aspect-square bg-gradient-to-br ${emotion.gradient} rounded-3xl shadow-lg transition-all flex flex-col items-center justify-center gap-3 p-4 relative overflow-hidden ${
                    mode === "kids" ? "border-4 border-white" : "border-2 border-white/50"
                  } ${isSelected ? "ring-4 ring-white/80 shadow-2xl" : ""} ${
                    isDisabled ? "opacity-40 cursor-not-allowed" : "hover:shadow-2xl"
                  }`}
                >
                  {mode === "kids" && !isSelected && (
                    <div className="absolute top-2 right-2 w-8 h-8 bg-white/40 backdrop-blur-sm rounded-full flex items-center justify-center text-xs">
                      ⭐
                    </div>
                  )}

                  <div className={`text-white drop-shadow-lg ${isSelected ? "scale-110" : ""} transition-transform`} aria-hidden="true">
                    <Icon
                      className={mode === "kids" ? "w-16 h-16" : "w-14 h-14"}
                      strokeWidth={mode === "kids" ? 2.5 : 1.5}
                    />
                  </div>

                  <div className="text-center">
                    <div
                      className={`${
                        mode === "kids" ? "text-lg font-bold" : "text-base font-medium"
                      } text-white drop-shadow-md`}
                    >
                      {mode === "kids" ? emotion.labelKids : emotion.label}
                    </div>
                    {mode === "adult" && (
                      <div className="text-xs text-white/80 mt-1">{emotion.description}</div>
                    )}
                  </div>

                  {/* Overlay de sélection */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute top-2 right-2"
                      >
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md">
                          <span className="text-sm font-bold" style={{ color: "#2A5F7D" }}>✓</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* CTA flottant */}
      <AnimatePresence>
        {hasSelection && (
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ type: "spring", damping: 20 }}
            className="fixed bottom-0 left-0 right-0 px-6 pb-8 pt-4 bg-gradient-to-t from-white/95 to-transparent backdrop-blur-sm"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleContinue}
              aria-label={`Continuer avec ${selectedIds.length === 1 ? "l'émotion sélectionnée" : `les ${selectedIds.length} émotions sélectionnées`}`}
              className="w-full max-w-md mx-auto flex items-center justify-center gap-3 bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-400 text-white rounded-3xl py-5 shadow-xl font-medium text-base"
            >
              <span>
                {mode === "kids" ? "Continuer →" : "Continuer →"}
              </span>
              {selectedIds.length > 1 && (
                <span className="bg-white/30 rounded-full px-2 py-0.5 text-xs font-bold">
                  {selectedIds.length}
                </span>
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
