import { motion, useReducedMotion } from "framer-motion";

function Box({ delay = 0, dark = false }) {
  const prefersReducedMotion = useReducedMotion();
  const anim = prefersReducedMotion
    ? {}
    : {
        y: [0, -18, 0],
        scale: [1, 1.06, 1],
        rotate: [0, -2, 0],
        boxShadow: [
          "0 8px 20px rgba(0,0,0,0.08)",
          "0 16px 28px rgba(0,0,0,0.12)",
          "0 8px 20px rgba(0,0,0,0.08)",
        ],
      };

  return (
    <motion.div
      className={`h-10 w-10 rounded-xl ${dark ? "bg-white" : "bg-gray-900"}`}
      style={{
        background:
          dark
            ? "linear-gradient(135deg, #fff 0%, #d4d4d4 100%)"
            : "linear-gradient(135deg, #111827 0%, #1f2937 100%)",
      }}
      initial={{ y: 0, scale: 1, rotate: 0 }}
      animate={anim}
      transition={{
        duration: 0.9,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    />
  );
}

export default function LoadingScreen({
  label = "Wird geladen…",
  theme = "light", // "light" | "dark"
}) {
  const dark = theme === "dark";

  return (
    <div
      className={`fixed inset-0 z-[9999] grid place-items-center overflow-hidden ${
        dark ? "bg-black" : "bg-white"
      }`}
    >
      {/* Content */}
      <div className="relative flex flex-col items-center gap-6 px-6">
        {/* Boxes row */}
        <div className="flex items-end gap-3">
          <Box delay={0.00} dark={dark} />
          <Box delay={0.12} dark={dark} />
          <Box delay={0.24} dark={dark} />
          <Box delay={0.36} dark={dark} />
        </div>

        {/* Underline bar reacts to the bounce */}
        <motion.div
          className={`h-1 w-28 rounded-full ${
            dark ? "bg-white/30" : "bg-gray-900/20"
          }`}
          initial={{ scaleX: 0.7, opacity: 0.8 }}
          animate={{ scaleX: [0.7, 1, 0.7], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Label */}
        <motion.p
          className={`text-center text-sm tracking-wide ${
            dark ? "text-white/80" : "text-gray-700"
          }`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {label}
        </motion.p>
      </div>

      {/* Soft vignette */}
      <div
        className={`pointer-events-none absolute inset-0 ${
          dark ? "bg-[radial-gradient(transparent,rgba(0,0,0,0.5))]" : "bg-[radial-gradient(transparent,rgba(0,0,0,0.05))]"
        }`}
      />
    </div>
  );
}
