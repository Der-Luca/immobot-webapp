import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getState, setOfferType } from "./storage/index";
import { toggleObjectClass } from "./storage/step1";

/* ---------------- Objektarten ---------------- */

const CLASS_OPTIONS = [
  { label: "Haus", value: "Haus" },
  { label: "Wohnung", value: "Wohnung" },
  { label: "Grundstück", value: "Grundstueck" },
  { label: "Stellplatz / Garage", value: "StellplatzGarage" },
  { label: "Büro / Praxis", value: "BüroPraxis" },
  { label: "Ferienobjekt", value: "Ferienobjekt" },
  { label: "Gastronomie", value: "Gastronomie" },
  { label: "Gewerbeeinheit", value: "Gewerbeeinheit" },
  { label: "Halle / Lager / Produktion", value: "HalleLagerProduktion" },
  { label: "Hotel", value: "Hotel" },
  { label: "Land- / Forstwirtschaft", value: "LandForst" },
  { label: "Sonstige", value: "Sonstige" },
  { label: "Studentenwohnungen", value: "Studenten" },
];

export default function Step1() {
  const nav = useNavigate();

  const [filters, setFilters] = useState(() => getState());
  const [error, setError] = useState("");

  const selectedClasses = filters.objectClasses || [];

  const initialTop =
    filters.offerTypes?.includes("Miete")
      ? "Miete"
      : filters.offerTypes?.includes("Kauf")
      ? "Kauf"
      : null;

  const [selectedTop, setSelectedTop] = useState(initialTop);

  function onToggleClass(val) {
    toggleObjectClass(val);
    setFilters(getState()); // 🔁 UI neu aus Storage lesen
  }

  function selectTop(mode) {
    setOfferType(mode); // ✅ persistiert
    setSelectedTop(mode); // UI
    setFilters(getState()); // UI sync
  }

  const canProceed = Boolean(selectedTop) && selectedClasses.length > 0;

  function onNext() {
    const missingOffer = !selectedTop;
    const missingClass = selectedClasses.length === 0;

    if (missingOffer || missingClass) {
      const parts = [];
      if (missingOffer) parts.push("Angebotsart");
      if (missingClass) parts.push("mindestens eine Objektart");
      setError(`Bitte ${parts.join(" und ")} auswählen.`);
      setTimeout(() => setError(""), 2500);
      return;
    }

    setError("");
    nav("/register/step2");
  }

  return (
    <div className="
      w-full mx-auto max-w-2xl bg-white space-y-8
      p-4 mt-2
      md:p-6 md:mt-10 md:w-2/3 md:border md:rounded-2xl md:shadow-sm
    ">
      <p className="text-center text-xs md:text-sm text-gray-500">
        Schritt 1 von 5
      </p>

      {/* Angebotsart */}
      <div className="space-y-2">
        <p className="block text-sm font-medium text-center">
          Angebotsart
        </p>

        <div className="flex justify-center gap-2">
          {["Kauf", "Miete"].map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => selectTop(mode)}
              className={`px-4 py-2 rounded-full border text-sm transition
                ${
                  selectedTop === mode
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-800 border-gray-300 hover:bg-gray-100"
                }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Objektarten */}
      <div className="space-y-3">
        <p className="block text-sm font-medium text-center">
          Objektart (max. 2)
        </p>

        <div className="flex flex-wrap gap-2 justify-center">
          {CLASS_OPTIONS.map((opt) => {
            const active = selectedClasses.includes(opt.value);
            const disabled = !active && selectedClasses.length >= 2;

            return (
              <button
                key={opt.value}
                type="button"
                disabled={disabled}
                onClick={() => onToggleClass(opt.value)}
                className={`px-3 py-2 rounded-full border text-xs md:text-sm transition
                  ${
                    active
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-800 border-gray-300 hover:bg-gray-100"
                  }
                  ${disabled ? "opacity-50 cursor-not-allowed" : ""}
                `}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-col items-center gap-2 mt-6">
        <button
          type="button"
          onClick={onNext}
          className={`px-8 py-3 rounded-xl font-medium ${
            canProceed
              ? "bg-blue-900 text-white"
              : "bg-gray-300 text-gray-700"
          }`}
        >
          Schritt 2 &gt;
        </button>
        {error && (
          <div
            role="alert"
            className="mt-2 w-full max-w-md rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 shadow-sm"
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
