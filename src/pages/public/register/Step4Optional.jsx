// src/pages/public/register/Step4.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { readStep4State, toggleBool } from "./storage/step4.js";

// Basis-Ausstattung (Geomap-Namen → Label)
const AMENITIES = [
  { key: "balconyTerrace", label: "Balkon / Terrasse" },
  { key: "garden", label: "Garten" },
  { key: "parkingSpace", label: "Stellplatz" },
  { key: "cellar", label: "Keller" },
  { key: "bathroomWithWindow", label: "Tageslichtbad" },
  { key: "builtInKitchen", label: "Einbauküche" },
  { key: "elevator", label: "Aufzug" },
  { key: "underfloorHeating", label: "Fußbodenheizung" },
  { key: "fireplace", label: "Kamin" },
  { key: "furnished", label: "Möbliert" },
  { key: "firstTimeUse", label: "Erstbezug" },
  { key: "refurbished", label: "Saniert" },
  { key: "leased", label: "Vermietet" },
  { key: "freeOfCommission", label: "Provisionsfrei" },
  { key: "preservationOrder", label: "Denkmalschutz" },
  { key: "divisible", label: "Teilbar" },
  { key: "barrierFree", label: "Barrierefrei" },
  { key: "airConditioningVentilation", label: "Klima / Belüftung" },
];

export default function Step4() {
  const navigate = useNavigate();

  // Initial aus Storage holen
  const s4 = useMemo(() => readStep4State(), []);
  const [amen, setAmen] = useState(
    AMENITIES.reduce((acc, a) => ({ ...acc, [a.key]: !!s4[a.key] }), {})
  );

  // Sichtbarkeit der Ausstattung (erst nach Klick auf „Noch mehr Filter …“)
  const [showAmenities, setShowAmenities] = useState(false);

  function onToggleAmenity(key) {
    toggleBool(key); // schreibt in storage/step4.js
    setAmen(prev => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="space-y-6 rounded-2xl border p-6">
      <p className="text-center text-sm text-gray-500">Schritt 4 von 5 (optional)</p>
   

      {/* ————— Startzustand: NUR Frage + zwei CTAs ————— */}
      {!showAmenities && (
        <div className="">
          <p className="text-sm text-gray-700 mb-3 text-center">
            Benötigst du weitere Filter?
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              type="button"
              className="px-5 py-3 rounded-xl bg-white border hover:bg-gray-100"
              onClick={() => setShowAmenities(true)}
            >
             Ja mehr Filter bitte…
            </button>
            <button
              type="button"
              className="px-5 py-3 rounded-xl bg-blue-900 text-white"
              onClick={() => navigate("/login")}
            >
              Nein... Jetzt registrieren
            </button>
          </div>
        </div>
      )}

      {/* ————— Nach Klick: Ausstattung wird eingeblendet + „Weiter zu Schritt 5“ ————— */}
      {showAmenities && (
        <>
              <h2 className="text-xl font-semibold text-center">Ausstattung</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {AMENITIES.map((a) => {
              const active = !!amen[a.key];
              return (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => onToggleAmenity(a.key)}
                  className={`px-3 py-2 rounded-full border text-sm text-left ${
                    active ? "bg-blue-600 text-white" : "bg-white"
                  }`}
                  title={a.key}
                >
                  {a.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              className="text-sm underline"
              onClick={() => setShowAmenities(false)}
            >
              Auswahl ausblenden
            </button>
            <button
              type="button"
              className="px-5 py-3 rounded-xl bg-blue-900 text-white"
              onClick={() => navigate("/register/step5")}
            >
              Weiter &gt;
            </button>
          </div>
        </>
      )}

      {/* Navigation unten – „Weiter“ nur sinnvoll, wenn Amenities offen sind */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="px-6 py-3 rounded-xl bg-gray-200"
          onClick={() => navigate("/register/step3")}
        >
          &lt; zurück
        </button>
      </div>
    </div>
  );
}
