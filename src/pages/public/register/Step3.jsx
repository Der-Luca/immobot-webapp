import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getState } from "./storage/index.js";
import {
  getPricePresets,
  getSpacePresets,
  setPriceUpper,
  setSpacePreset,
} from "./storage/step3.js";

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full border text-sm transition ${
        active
          ? "bg-blue-600 text-white border-blue-600"
          : "bg-white text-gray-800"
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
  const [spaceValue, setSpaceValue] = useState(
    initial.propertySpaceRange?.to ?? null
  );

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

    if (preset.type === "max") return `bis ${preset.value} qm`;
    if (preset.type === "min") return `ab ${preset.value} qm`;
  };

  return (
    <div className="space-y-8 rounded-2xl border p-6 w-2/3 mx-auto mt-10">
      <p className="text-center text-sm text-gray-500">Schritt 3 von 5</p>

      <h2 className="text-2xl font-semibold text-center text-gray-800">
        {isMieteOnly
          ? "Was ist dein persönlicher Höchstpreis (Miete)?"
          : "Was ist dein persönlicher Höchstpreis (Kauf)?"}
      </h2>

      {/* Preis */}
      <div>
        <p className="text-sm text-center text-gray-600 mb-2">
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
      <div>
        <p className="text-2xl mt-4 font-semibold text-center text-gray-800">
          Fläche
        </p>

        <p className="text-sm text-center text-gray-600">
          {isGrundstueck
            ? "Wie groß soll dein Grundstück sein?"
            : "Wie groß soll die Wohnfläche sein?"}
        </p>

        <div className="flex flex-wrap gap-2 justify-center mt-2">
          {spacePresets.map((preset, i) => (
            <Chip
              key={i}
              active={spaceValue === (preset?.value ?? null)}
              onClick={() => {
                setSpaceValue(preset?.value ?? null);
                setSpacePreset(preset);
              }}
            >
              {fmtQM(preset)}
            </Chip>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="px-6 py-3 rounded-xl bg-gray-200 text-gray-800"
          onClick={() => navigate("/register/step2")}
        >
          &lt; zurück
        </button>
        <button
          type="button"
          className="px-6 py-3 rounded-xl bg-blue-900 text-white"
          onClick={() => navigate("/register/step4")}
        >
          Weiter &gt;
        </button>
      </div>
    </div>
  );
}
