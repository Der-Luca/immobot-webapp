// src/pages/public/user/filters/ExtrasCard.jsx
import { useEffect, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { useAuth } from "../../../contexts/AuthContext";

// gleiche Ausstattung wie Step4
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

function buildAmenFromFilters(filters) {
  return AMENITIES.reduce(
    (acc, a) => ({
      ...acc,
      [a.key]: filters?.[a.key] ?? false,
    }),
    {}
  );
}

export default function ExtrasCard({ filters }) {
  const { user } = useAuth();

  // lokale States laden
  const [amen, setAmen] = useState(() => buildAmenFromFilters(filters));

  // 🔥 wichtig: sync wenn filters async nachgeladen werden
  useEffect(() => {
    setAmen(buildAmenFromFilters(filters));
  }, [filters]);

  // togglen + speichern
  const toggle = async (key) => {
    const newVal = !amen[key];
    const newAmen = { ...amen, [key]: newVal };
    setAmen(newAmen);

    await updateDoc(doc(db, "users", user.uid), {
      lastSearch: {
        ...filters,
        ...newAmen,
      },
    });
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">
        Ausstattung & Extras
      </h2>

      <div className="flex flex-wrap gap-2">
        {AMENITIES.map((a) => {
          const active = amen[a.key];
          return (
            <button
              key={a.key}
              onClick={() => toggle(a.key)}
              className={`px-3 py-1.5 text-xs rounded-full border transition ${
                active
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200"
              }`}
            >
              {a.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
