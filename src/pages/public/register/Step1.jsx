import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getState, setState } from "./storage/index";
import { toggleObjectClass } from "./storage/step1";

// Objektklassen (max 2) — bereinigt!
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
  const initial = useMemo(() => getState(), []);

  const initialTop =
    initial.offerTypes?.includes("Miete")
      ? "Miete"
      : initial.offerTypes?.includes("Kauf")
      ? "Kauf"
      : null;

  const [selectedTop, setSelectedTop] = useState(initialTop);
  const [selectedClasses, setSelectedClasses] = useState(
    initial.objectClasses || []
  );

  function selectTop(mode) {
    setSelectedTop(mode);

    if (mode === "Kauf") {
      setState({ offerTypes: ["Kauf"], constructionStatus: undefined });
    } else if (mode === "Miete") {
      setState({ offerTypes: ["Miete"], constructionStatus: undefined });
    }
  }

  // max 2 Objektklassen
  const onToggleClass = (val) => {
    const active = selectedClasses.includes(val);
    if (!active && selectedClasses.length >= 2) return;

    const next = active
      ? selectedClasses.filter((v) => v !== val)
      : [...selectedClasses, val];

    setSelectedClasses(next);
    toggleObjectClass(val);
  };

  return (
    <div className="space-y-8 rounded-2xl border p-6 w-2/3 mx-auto mt-10">
      <p className="text-center text-sm text-gray-500">Schritt 1 von 5</p>

      {/* Titel */}

      <p className="block text-sm font-medium mb-1 text-center">
        Angebotsart
      </p>

      {/* Angebotsart */}
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {[
            { key: "Kauf", label: "Kauf" },
            { key: "Miete", label: "Miete" },
          ].map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => selectTop(b.key)}
              className={`px-4 py-2 rounded-full border text-sm transition
                ${
                  selectedTop === b.key
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-800 border-gray-300 hover:bg-gray-100"
                }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Objektarten */}
      <div className="space-y-2">
        <p className="block text-sm font-medium mb-1 text-center">
          Objektart
        </p>
        <p className="text-center text-sm text-gray-600">
          Wähle bis zu zwei Stück aus:
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
                className={`px-4 py-2 rounded-full border text-sm transition
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
      <div className="flex justify-center mt-4">
        <button
          type="button"
          className="px-6 py-3 rounded-xl bg-blue-900 text-white"
          onClick={() => nav("/register/step2")}
        >
          Schritt 2 &gt;
        </button>
      </div>
    </div>
  );
}
