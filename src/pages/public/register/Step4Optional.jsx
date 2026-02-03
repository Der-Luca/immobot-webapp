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
    // CONTAINER: Mobile (kein Border) vs Desktop (Karte)
    <div className="
      w-full mx-auto max-w-2xl bg-white space-y-6
      p-4 mt-2
      md:p-6 md:mt-10 md:w-2/3 md:border md:rounded-2xl md:shadow-sm
    ">
      <p className="text-center text-xs md:text-sm text-gray-500">
        Schritt 4 von 5 (optional)
      </p>

      {/* Startzustand: Frage + zwei CTAs */}
      {!showAmenities && (
        <div className="py-2">
          <p className="text-sm md:text-base text-gray-700 mb-6 text-center font-medium">
            Möchtest du noch weitere Filter nutzen?
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              // Buttons auf Mobile volle Breite (w-full), auf Desktop auto
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white border border-gray-300 text-sm font-medium text-gray-800 hover:bg-gray-50 active:scale-95 transition"
              onClick={() => setShowAmenities(true)}
            >
              Ja, unbedingt
            </button>
            <button
              type="button"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-900 text-white text-sm font-medium shadow-sm hover:bg-blue-800 active:scale-95 transition"
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
          <h2 className="text-xl md:text-2xl font-semibold text-center leading-tight">
            Ausstattung
          </h2>

          <p className="text-xs sm:text-sm text-gray-600 text-center max-w-xl mx-auto">
            Achtung: Jeder weitere Filter kann die Trefferquote reduzieren.{" "}
            <a
              href="https://immobot.pro#faq"
              target="_blank"
              rel="noreferrer"
              className="underline text-blue-600 hover:text-blue-800"
            >
              Siehe FAQ
            </a>
            .
          </p>

          <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto mt-2">
            {AMENITIES.map((a) => {
              const active = !!amen[a.key];
              return (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => onToggleAmenity(a.key)}
                  // Touch-freundliche Größe (px-3 py-2 auf Mobile)
                  className={`px-3 py-2 md:px-4 md:py-2 rounded-full border text-xs md:text-sm transition active:scale-95
                    ${
                      active
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
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

      {/* Navigation unten */}
      <div className="flex items-center justify-between gap-4 mt-6">
        <button
          type="button"
          className="px-6 py-3 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium transition"
          onClick={() => navigate("/register/step3")}
        >
          &lt; Zurück
        </button>

        {showAmenities && (
          <button
            type="button"
            className="px-8 py-3 rounded-xl bg-blue-900 text-white font-medium shadow-sm hover:bg-blue-800 transition active:scale-95"
            onClick={() => navigate("/register/step5")}
          >
            Weiter &gt;
          </button>
        )}
      </div>
    </div>
  );
}