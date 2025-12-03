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

  // Sichtbarkeit der Ausstattung
  const [showAmenities, setShowAmenities] = useState(false);

  function onToggleAmenity(key) {
    toggleBool(key); // schreibt in storage/step4.js
    setAmen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="space-y-6 rounded-2xl border p-6 w-2/3 mx-auto mt-10">
      <p className="text-center text-sm text-gray-500">
        Schritt 4 von 5 (optional)
      </p>

      {/* Startzustand: Frage + zwei CTAs */}
      {!showAmenities && (
        <div>
          <p className="text-sm text-gray-700 mb-3 text-center">
            Möchtest du noch weitere Filter nutzen?
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              type="button"
              className="px-5 py-3 rounded-xl bg-white border border-gray-300 text-sm text-gray-800 hover:bg-gray-100 transition"
              onClick={() => setShowAmenities(true)}
            >
              Ja, unbedingt
            </button>
            <button
              type="button"
              className="px-5 py-3 rounded-xl bg-blue-900 text-white text-sm"
              onClick={() => navigate("/register/finish")}
            >
              Nein, jetzt registrieren
            </button>
          </div>
        </div>
      )}

      {/* Nach Klick: Ausstattung + Hinweis */}
      {showAmenities && (
        <>
          <h2 className="text-xl font-semibold text-center">Ausstattung</h2>

          <p className="text-xs sm:text-sm text-gray-600 text-center max-w-xl mx-auto">
            Achtung: Jeder weitere Filter kann die Trefferquote reduzieren.{" "}
            <a
              href="https://immobot.pro/funktionen/"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Siehe FAQ
            </a>
            .
          </p>

          <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto mt-4">
            {AMENITIES.map((a) => {
              const active = !!amen[a.key];
              return (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => onToggleAmenity(a.key)}
                  className={`px-4 py-2 rounded-full border text-sm transition
                    ${
                      active
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-800 border-gray-300 hover:bg-gray-100"
                    }`}
                  title={a.key}
                >
                  {a.label}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Navigation unten – immer eine Zeile, Buttons gleiche Höhe */}
      <div className="flex items-center justify-between mt-6">
        <button
          type="button"
          className="px-6 py-3 rounded-xl bg-gray-200"
          onClick={() => navigate("/register/step3")}
        >
          &lt; zurück
        </button>

        {showAmenities && (
          <button
            type="button"
            className="px-6 py-3 rounded-xl bg-blue-900 text-white"
            onClick={() => navigate("/register/step5")}
          >
            Weiter &gt;
          </button>
        )}
      </div>
    </div>
  );
}
