import { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { motion } from "motion/react";
import { Clock, Check, X, Calendar, Coffee, Moon, Loader2 } from "lucide-react";
import { API_BASE } from "../lib/api";

type ReminderOffset = "1h" | "4h" | "tomorrow";

interface ReminderResponse {
  id: string;
  offset: string;
  scheduled_at: string;
  scheduled_label: string;
  message: string;
}

export default function CheckIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const mode = (location.state?.mode || "kids") as "kids" | "adult";
  const diagnosticProfile = location.state?.diagnosticProfile ?? null;

  const [selectedReminder, setSelectedReminder] = useState<ReminderOffset | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmed, setConfirmed] = useState<ReminderResponse | null>(null);
  const [error, setError] = useState(false);

  const handleReminderSelect = async (offset: ReminderOffset) => {
    if (isLoading || confirmed) return;
    setSelectedReminder(offset);
    setIsLoading(true);
    setError(false);

    try {
      const res = await fetch(`${API_BASE}/checkin/reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offset,
          mode,
          emotion_id: diagnosticProfile?.emotionId ?? null,
          distress_level: diagnosticProfile?.distressLevel ?? null,
        }),
      });

      if (res.ok) {
        const data: ReminderResponse = await res.json();
        setConfirmed(data);
        setTimeout(() => navigate("/"), 2500);
      } else {
        // Fallback cosmétique si l'API est indisponible
        setError(true);
        setConfirmed({ id: "", offset, scheduled_at: "", scheduled_label: "", message: "" });
        setTimeout(() => navigate("/"), 2000);
      }
    } catch {
      // Réseau indisponible → fallback gracieux
      setError(true);
      setConfirmed({ id: "", offset, scheduled_at: "", scheduled_label: "", message: "" });
      setTimeout(() => navigate("/"), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => navigate("/");

  const reminderOptions: { value: ReminderOffset; label: string; icon: typeof Coffee; color: string; description: string }[] = [
    {
      value: "1h",
      label: "Dans 1 heure",
      icon: Coffee,
      color: "from-yellow-300 to-amber-400",
      description: mode === "kids" ? "Un petit moment" : "Bientôt",
    },
    {
      value: "4h",
      label: "Dans 4 heures",
      icon: Clock,
      color: "from-teal-300 to-cyan-400",
      description: mode === "kids" ? "Après-midi ou soirée" : "Plus tard aujourd'hui",
    },
    {
      value: "tomorrow",
      label: "Demain",
      icon: Moon,
      color: "from-blue-300 to-indigo-400",
      description: mode === "kids" ? "Après une bonne nuit" : "Lendemain matin",
    },
  ];

  const isConfirmed = confirmed !== null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-teal-50 to-yellow-50 flex flex-col">
      {/* Header */}
      <div className="px-6 pt-12 pb-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="mb-6 inline-block"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-teal-300 to-blue-300 rounded-full flex items-center justify-center shadow-xl">
              <Calendar className="w-10 h-10 text-white" />
            </div>
          </motion.div>

          <h1 className="text-3xl mb-3" style={{ color: "#2A5F7D" }}>
            {mode === "kids" ? "On se refait un point ?" : "Planifier un suivi"}
          </h1>
          <p className="text-gray-500 px-4">
            {mode === "kids"
              ? "Choisis quand tu veux qu'on reprenne des nouvelles ensemble"
              : "Quand souhaitez-vous faire un nouveau point sur vos émotions ?"}
          </p>
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 pb-6 flex flex-col">
        <div className="flex-1 max-w-md mx-auto w-full space-y-4">
          {reminderOptions.map((option, index) => {
            const Icon = option.icon;
            const isSelected = selectedReminder === option.value;
            const isThisLoading = isSelected && isLoading;

            return (
              <motion.div
                key={option.value}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
              >
                <motion.button
                  whileHover={{ scale: isConfirmed || isLoading ? 1 : 1.02, x: isConfirmed || isLoading ? 0 : 5 }}
                  whileTap={{ scale: isConfirmed || isLoading ? 1 : 0.98 }}
                  onClick={() => handleReminderSelect(option.value)}
                  disabled={isConfirmed || isLoading}
                  className={`w-full rounded-3xl p-6 shadow-lg transition-all flex items-center gap-4 ${
                    isSelected
                      ? `bg-gradient-to-r ${option.color} text-white border-2 border-white`
                      : "bg-white/80 backdrop-blur-sm hover:bg-white hover:shadow-xl"
                  } ${isConfirmed && !isSelected ? "opacity-40" : ""} ${
                    isLoading && !isSelected ? "opacity-40 cursor-not-allowed" : ""
                  }`}
                >
                  <div
                    className={`rounded-2xl p-4 ${
                      isSelected ? "bg-white/30 backdrop-blur-sm" : "bg-gradient-to-br " + option.color
                    }`}
                  >
                    {isThisLoading ? (
                      <Loader2 className="w-7 h-7 text-white animate-spin" />
                    ) : (
                      <Icon className="w-7 h-7 text-white" />
                    )}
                  </div>

                  <div className="flex-1 text-left">
                    <div className={`text-lg font-medium ${isSelected ? "text-white" : "text-gray-800"}`}>
                      {option.label}
                    </div>
                    <div className={`text-sm ${isSelected ? "text-white/80" : "text-gray-500"}`}>
                      {option.description}
                    </div>
                  </div>

                  {isSelected && !isLoading && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring" }}
                    >
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                        <Check className="w-5 h-5 text-teal-500" />
                      </div>
                    </motion.div>
                  )}
                </motion.button>
              </motion.div>
            );
          })}

          {/* Confirmation */}
          {isConfirmed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl p-4 text-center shadow-md ${
                error
                  ? "bg-gradient-to-r from-gray-100 to-slate-100"
                  : "bg-gradient-to-r from-green-100 to-teal-100"
              }`}
            >
              <div className={`flex flex-col items-center gap-1 ${error ? "text-gray-600" : "text-green-700"}`}>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">
                    {error
                      ? mode === "kids" ? "Noté ! On se retrouve bientôt 💙" : "Rappel enregistré"
                      : confirmed?.message || (mode === "kids" ? "Super ! Rendez-vous programmé 💚" : "Rappel programmé avec succès")}
                  </span>
                </div>
                {!error && confirmed?.scheduled_label && (
                  <span className="text-sm opacity-75">
                    {mode === "kids"
                      ? `À tout à l'heure — ${confirmed.scheduled_label}`
                      : confirmed.scheduled_label}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-6"
        >
          <button
            onClick={handleSkip}
            disabled={isConfirmed || isLoading}
            className={`text-gray-500 hover:text-gray-700 transition-colors flex items-center justify-center gap-2 mx-auto ${
              isConfirmed || isLoading ? "opacity-40 cursor-not-allowed" : ""
            }`}
          >
            <X className="w-4 h-4" />
            <span>{mode === "kids" ? "Peut-être plus tard" : "Passer"}</span>
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-sm text-gray-500 mt-6 px-4"
        >
          {mode === "kids"
            ? "Tu peux revenir quand tu veux, même sans rappel 💙"
            : "Vous pouvez revenir à tout moment pour exprimer vos émotions"}
        </motion.div>
      </div>

      <div className="h-8"></div>
    </div>
  );
}
