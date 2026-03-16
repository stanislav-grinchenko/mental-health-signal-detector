import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Heart, Sparkles } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-sky-50 to-slate-200 flex flex-col items-center justify-center px-6">
      {/* Icon */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="mb-8 relative"
      >
        <div className="w-24 h-24 bg-gradient-to-br from-teal-300 to-cyan-400 rounded-full flex items-center justify-center shadow-xl">
          <Heart className="w-12 h-12 text-white fill-white" />
        </div>
        <Sparkles className="w-6 h-6 text-yellow-400 absolute -top-1 -left-3" />
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-semibold mb-3" style={{ color: "#2A5F7D" }}>
          Comment te sens-tu<br />aujourd'hui ?
        </h1>
        <p className="text-gray-500 text-lg">
          On fait un point ensemble, sans pression.
        </p>
      </motion.div>

      {/* Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="w-full max-w-sm space-y-4"
      >
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/checkin", { state: { mode: "kids" } })}
          className="w-full py-5 rounded-full text-white text-xl font-semibold shadow-lg flex items-center justify-center gap-3 bg-gradient-to-r from-yellow-300 to-amber-400"
        >
          <Sparkles className="w-6 h-6" />
          Mode Enfant
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/checkin", { state: { mode: "adult" } })}
          className="w-full py-5 rounded-full text-white text-xl font-semibold shadow-lg flex items-center justify-center gap-3 bg-gradient-to-r from-teal-400 to-cyan-500"
        >
          <Heart className="w-6 h-6" />
          Mode Adulte
        </motion.button>
      </motion.div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55 }}
        className="text-gray-400 text-sm mt-12"
      >
        Un espace sûr pour exprimer tes émotions 💙
      </motion.p>
    </div>
  );
}
