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

  const selectedClasses = filters.objectClasses || [];

  const initialTop =
    filters.offerTypes?.includes("Miete")
      ? "Miete"
      : filters.offerTypes?.includes("Kauf")
      ? "Kauf"
      : null;

  const [selectedTop, setSelectedTop] = useState(initialTop);

  function selectTop(mode) {
    setSelectedTop(mode);
    setFilters(getState()); // sync UI
  }

  function onToggleClass(val) {
    toggleObjectClass(val);
    setFilters(getState()); // 🔁 UI neu aus Storage lesen
  }

  function selectTop(mode) {
  setOfferType(mode);       // ✅ persistiert
  setSelectedTop(mode);     // UI
  setFilters(getState());   // UI sync
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
      <div className="flex justify-center mt-6">
        <button
          type="button"
          onClick={() => nav("/register/step2")}
          className="px-8 py-3 rounded-xl bg-blue-900 text-white font-medium"
        >
          Schritt 2 &gt;
        </button>
      </div>
    </div>
  );
}
