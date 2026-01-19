import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getState } from "./storage/index.js";
import {
  getPricePresets,
  getSpacePresets,
  setPriceUpper,
  setSpacePreset,
} from "./storage/step3.js";

// Chip-Komponente optimiert für Touch (active:scale, responsive Textgröße)
function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 md:px-4 md:py-2 rounded-full border text-xs md:text-sm transition transform active:scale-95
        ${
          active
            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
            : "bg-white text-gray-800 border-gray-300 hover:bg-gray-100"
        }`}
    >
      {children}
    </button>
  );
}

export default function Step3() {
  const navigate = useNavigate();
  const initial = useMemo(() => getState(), []);

  const pricePresets = getPricePresets();
  const spacePresets = getSpacePresets();

  const [priceTo, setPriceTo] = useState(initial.priceRange?.to ?? null);
 const [spacePreset, setSpacePresetState] = useState(() => {
  const r = initial.propertySpaceRange;
  if (!r) return null;

  if (r.from === 0 && r.to != null) {
    return { type: "max", value: r.to };
  }

  if (r.from != null && r.to === 9999999) {
    return { type: "min", value: r.from };
  }

  return null;
});


  const isGrundstueck = initial.objectClasses?.includes("Grundstueck");
  const isMieteOnly =
    initial.offerTypes?.includes("Miete") &&
    !initial.offerTypes?.includes("Kauf");

  const fmtEUR = (val, idx) => {
    if (val == null) return "beliebig";
    const formatted = val.toLocaleString("de-DE");

    // Miete → nur "bis"
    if (isMieteOnly) return `bis ${formatted} €`;

    // letzter Wert vor "beliebig" = "ab"
    const isLastNumber =
      idx === pricePresets.length - 2 &&
      pricePresets[pricePresets.length - 1] === null;

    return isLastNumber ? `ab ${formatted} €` : `bis ${formatted} €`;
  };

  const fmtQM = (preset) => {
    if (preset === null) return "beliebig";

    if (preset.type === "max") return `bis ${preset.value} m²`;
    if (preset.type === "min") return `ab ${preset.value} m²`;
  };

  return (
    // LAYOUT: Mobile (kein Border, p-4) vs Desktop (Border, p-6, rounded)
    <div className="
      w-full mx-auto max-w-2xl bg-white space-y-8
      p-4 mt-2
      md:p-6 md:mt-10 md:w-2/3 md:border md:rounded-2xl md:shadow-sm
    ">
      <p className="text-center text-xs md:text-sm text-gray-500">Schritt 3 von 5</p>

      <h2 className="text-xl md:text-2xl font-semibold text-center text-gray-800 leading-tight">
        {isMieteOnly
          ? "Was ist dein persönlicher Höchstpreis (Miete)?"
          : "Was ist dein persönlicher Höchstpreis (Kauf)?"}
      </h2>

      {/* Preis */}
      <div>
        <p className="text-sm text-center text-gray-600 mb-3">
          Wähle deinen maximalen Preis:
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {pricePresets.map((p, i) => (
            <Chip
              key={i}
              active={priceTo === p}
              onClick={() => {
                setPriceTo(p);
                setPriceUpper(p);
              }}
            >
              {fmtEUR(p, i)}
            </Chip>
          ))}
        </div>
      </div>

      {/* Fläche */}
      <div className="pt-2">
        <h3 className="text-lg md:text-xl font-semibold text-center text-gray-800 mb-1">
          Fläche
        </h3>

        <p className="text-sm text-center text-gray-600 mb-3">
          {isGrundstueck
            ? "Wie groß soll dein Grundstück sein?"
            : "Wie groß soll die Wohnfläche sein?"}
        </p>

        <div className="flex flex-wrap gap-2 justify-center">
          {spacePresets.map((preset, i) => (
            <Chip
              key={i}
             active={
  preset === null
    ? spacePreset === null
    : spacePreset?.type === preset.type &&
      spacePreset?.value === preset.value
}

             onClick={() => {
  setSpacePresetState(preset);
  setSpacePreset(preset);
}}

            >
              {fmtQM(preset)}
            </Chip>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4 mt-4">
        <button
          type="button"
          className="px-6 py-3 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium transition"
          onClick={() => navigate("/register/step2")}
        >
          &lt; Zurück
        </button>
        <button
          type="button"
          className="px-8 py-3 rounded-xl bg-blue-900 text-white font-medium shadow-sm hover:bg-blue-800 transition active:scale-95"
          onClick={() => navigate("/register/step4")}
        >
          Weiter &gt;
        </button>
      </div>
    </div>
  );
}