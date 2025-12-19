import { motion } from "framer-motion";

export default function LoadingScreen({
  label = "System wird initialisiert...",
  theme = "light", // "light" | "dark"
}) {
  const isDark = theme === "dark";

  // Farben basierend auf Theme
  const bgClass = isDark ? "bg-[#050505]" : "bg-[#f8f9fa]";
  const textClass = isDark ? "text-white/60" : "text-black/60";
  
  // Der "Glow" hinter dem Loader
  const glowColor = isDark 
    ? "bg-indigo-500/20" 
    : "bg-blue-400/20";

  // Die Farbe der tanzenden Quadrate
  const boxColor = isDark ? "bg-white" : "bg-gray-900";

  // Animations-Varianten für die 4 Boxen
  const containerVariants = {
    animate: {
      rotate: [0, 90, 180, 270, 360],
      transition: {
        duration: 4, // Langsame, majestätische Rotation
        ease: "linear",
        repeat: Infinity,
      },
    },
  };

  const itemVariants = {
    initial: { scale: 0.5, opacity: 0 },
    animate: {
      scale: [1, 0.8, 1],
      borderRadius: ["20%", "50%", "20%"], // Morphing zu Kreis und zurück
      gap: ["0px", "12px", "0px"], // "Atmen" (Auseinander/Zusammen)
      transition: {
        duration: 2,
        ease: "easeInOut",
        repeat: Infinity,
      },
    },
  };

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden ${bgClass}`}
    >
      {/* 1. ATMOSPHERIC GLOW BACKGROUND */}
      <motion.div
        className={`absolute h-[400px] w-[400px] rounded-full blur-[100px] ${glowColor}`}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* 2. THE MAIN LOADER (The Core) */}
      <div className="relative z-10 flex flex-col items-center gap-12">
        
        {/* Container der sich dreht */}
        <motion.div
          className="grid h-16 w-16 grid-cols-2 grid-rows-2 gap-2"
          variants={containerVariants}
          animate="animate"
        >
          {/* Die 4 tanzenden Elemente */}
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className={`h-full w-full rounded-lg shadow-2xl ${boxColor}`}
              // Jedes Element atmet leicht versetzt für organischen Look
              animate={{
                scale: [1, 0.5, 1],
                borderRadius: ["30%", "50%", "30%"],
                x: i % 2 === 0 ? [0, -4, 0] : [0, 4, 0], // Leichtes Auseinanderdriften X
                y: i < 2 ? [0, -4, 0] : [0, 4, 0],       // Leichtes Auseinanderdriften Y
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.1, // Versatz
              }}
              style={{
                backdropFilter: "blur(10px)",
              }}
            />
          ))}
        </motion.div>

        {/* 3. SHIMMERING TEXT LABEL */}
        <div className="relative overflow-hidden">
          <p className={`text-sm font-medium tracking-[0.2em] uppercase ${textClass}`}>
            {label}
          </p>
          
          {/* Lichtreflexion über dem Text */}
          <motion.div
            className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent"
            animate={{
              translateX: ["-100%", "200%"],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
              repeatDelay: 0.5,
            }}
          />
        </div>
      </div>

      {/* 4. SUBTLE NOISE OVERLAY (Optional für Texture) */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      />
    </div>
  );
}