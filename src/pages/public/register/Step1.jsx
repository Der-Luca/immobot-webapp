import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getState, setState } from "./storage/index";
import { toggleObjectClass } from "./storage/step1";

// Objektklassen (max 2)
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
  { label: "Microapartements", value: "Microapartements" },
  { label: "Pflege / Alter", value: "PflegeAlter" },
  { label: "Sonstige", value: "Sonstige" },
  { label: "Studentenwohnungen", value: "Studenten" },
];

export default function Step1() {
  const nav = useNavigate();
  const initial = useMemo(() => getState(), []);

  // initiale Auswahl aus Storage ableiten (OR-Priorität: ZV > Bauprojekt > Miete > Kauf)
  const initialTop =
    initial.searchString === "Zwangsversteigerung"
      ? "ZV"
      : Array.isArray(initial.constructionStatus) &&
        (initial.constructionStatus.includes("InPlanung") ||
         initial.constructionStatus.includes("ImBauInSanierung"))
      ? "Bauprojekt"
      : initial.offerTypes?.includes("Miete")
      ? "Miete"
      : initial.offerTypes?.includes("Kauf")
      ? "Kauf"
      : null;

  const [selectedTop, setSelectedTop] = useState(initialTop);
  const [selectedClasses, setSelectedClasses] = useState(initial.objectClasses || []);

  // --- OR-Handler: genau eine Option aktiv halten und Storage setzen ---
  function selectTop(mode) {
    setSelectedTop(mode);

    if (mode === "Kauf") {
      setState({
        offerTypes: ["Kauf"],
        constructionStatus: undefined,
        searchString: undefined,
      });
    } else if (mode === "Miete") {
      setState({
        offerTypes: ["Miete"],
        constructionStatus: undefined,
        searchString: undefined,
      });
    } else if (mode === "Bauprojekt") {
      // Bauprojekte sind i. d. R. Kauf; Status setzen
      setState({
        offerTypes: ["Kauf"],
        constructionStatus: ["InPlanung", "ImBauInSanierung"],
        searchString: undefined,
      });
    } else if (mode === "ZV") {
      // Zwangsversteigerung ≈ Kauf + Suchstring
      setState({
        offerTypes: ["Kauf"],
        constructionStatus: undefined,
        searchString: "Zwangsversteigerung",
      });
    }
  }

  // Objektklassen (max 2)
  const onToggleClass = (val) => {
    const active = selectedClasses.includes(val);
    if (!active && selectedClasses.length >= 2) return;
    const next = active ? selectedClasses.filter((v) => v !== val) : [...selectedClasses, val];
    setSelectedClasses(next);
    toggleObjectClass(val);
  };

  return (
    <div className="space-y-8 rounded-2xl border p-6">
      <p className="text-center text-sm text-gray-500">Schritt 1 von 3</p>
      <h2 className="text-xl font-semibold text-center">Was sollen wir für dich finden?</h2>

      {/* Angebotsart – OR-Logik */}
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {[
            { key: "Kauf", label: "Kauf" },
            { key: "Miete", label: "Miete" },
            { key: "Bauprojekt", label: "Bauprojekt" },
            { key: "ZV", label: "Zwangsversteigerung" },
          ].map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => selectTop(b.key)}
              className={`px-4 py-2 rounded-full border ${
                selectedTop === b.key ? "bg-blue-600 text-white" : "bg-white"
              }`}
              title={
                b.key === "Bauprojekt"
                  ? "setzt constructionStatus: InPlanung + ImBauInSanierung"
                  : b.key === "ZV"
                  ? 'setzt searchString: "Zwangsversteigerung"'
                  : ""
              }
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Objektklassen (max 2) */}
      <div className="space-y-2">
        <p className="text-center text-sm text-gray-600">Wähle bis zu zwei Stück aus:</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {CLASS_OPTIONS.map((opt) => {
            const active = selectedClasses.includes(opt.value);
            const disabled = !active && selectedClasses.length >= 2;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onToggleClass(opt.value)}
                disabled={disabled}
                className={`px-3 py-2 rounded-full border text-sm
                  ${active ? "bg-blue-600 text-white" : "bg-white"}
                  ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                title={`objectClasses: ${opt.value}`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Weiter */}
      <div className="flex justify-center">
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
