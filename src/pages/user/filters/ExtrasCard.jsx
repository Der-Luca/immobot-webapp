import { useEffect, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { useAuth } from "../../../contexts/AuthContext";
import FilterFrame from "./FilterFrame";

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

  const [isEditing, setIsEditing] = useState(false);
  const [amen, setAmen] = useState(() => buildAmenFromFilters(filters));

  useEffect(() => {
    setAmen(buildAmenFromFilters(filters));
  }, [filters]);

  const enterEdit = () => setIsEditing(true);

  const toggle = async (key) => {
    if (!isEditing) return;

    const next = { ...amen, [key]: !amen[key] };
    setAmen(next);

    if (user?.uid) {
      await updateDoc(doc(db, "users", user.uid), {
        lastSearch: {
          ...filters,
          ...next,
        },
      });
    }
  };

  const chipClass = (active) => {
    const base =
      "px-4 py-2 text-sm rounded-full border transition-all duration-200";

    if (active) {
      return `${base} bg-blue-600 border-blue-600 text-white hover:bg-blue-700`;
    }

    return isEditing
      ? `${base} bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400`
      : `${base} bg-white border-gray-200 text-gray-400`;
  };

  return (
    <FilterFrame
      isEditing={isEditing}
      header={
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              Ausstattung & Extras
            </h2>

            {!isEditing && (
              <button
                type="button"
                onClick={enterEdit}
                className="
                  inline-flex items-center
                  mt-2
                  px-3 py-1.5
                  text-sm font-semibold
                  rounded-full
                  bg-gray-200 text-gray-800
                  hover:bg-gray-300
                  transition
                "
              >
                Bearbeiten
              </button>
            )}
          </div>

          {isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="
                px-5 py-2
                text-sm font-semibold
                rounded-xl
                bg-blue-600 text-white
                hover:bg-blue-700
                transition
              "
            >
              Fertig
            </button>
          )}
        </div>
      }
    >
      {/* Body */}
      <div className="relative">
        <div className="flex flex-wrap gap-2.5">
          {AMENITIES.map((a) => (
            <button
              key={a.key}
              type="button"
              disabled={!isEditing}
              onClick={() => toggle(a.key)}
              className={chipClass(amen[a.key])}
            >
              {a.label}
            </button>
          ))}
        </div>

        {/* Click-anywhere Overlay im View-Mode */}
        {!isEditing && (
          <button
            type="button"
            onClick={enterEdit}
            className="absolute inset-0 rounded-xl bg-transparent"
            aria-label="Bearbeiten aktivieren"
          />
        )}
      </div>
    </FilterFrame>
  );
}
