import { useEffect, useState } from "react";
import FilterFrame from "./FilterFrame";

/* ---------------- Optionen (wie Register) ---------------- */

const OBJECT_CLASSES = [
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

/* ---------------- Mapping ---------------- */

const CLASS_TO_CATEGORY = {
  Haus: "Wohnen",
  Wohnung: "Wohnen",
  Studenten: "Wohnen",
  Ferienobjekt: "Wohnen",
  Grundstueck: "Wohnen",

  StellplatzGarage: "Gewerbe",
  BüroPraxis: "Gewerbe",
  Gastronomie: "Gewerbe",
  Gewerbeeinheit: "Gewerbe",
  HalleLagerProduktion: "Gewerbe",
  Hotel: "Gewerbe",
  LandForst: "Gewerbe",

  Sonstige: "Wohnen",
};

function deriveCategories(classes = []) {
  return Array.from(
    new Set(classes.map((c) => CLASS_TO_CATEGORY[c]).filter(Boolean))
  );
}

/* ---------------- Component ---------------- */

export default function ObjectCard({ filters, onChange }) {
  const [objectClasses, setObjectClasses] = useState(
    filters.objectClasses || []
  );
  const [offerTypes, setOfferTypes] = useState(filters.offerTypes || []);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setObjectClasses(filters.objectClasses || []);
    setOfferTypes(filters.offerTypes || []);
  }, [filters]);

  const enterEdit = () => setIsEditing(true);

  const toggleObjectClass = (value) => {
    if (!isEditing) return;

    const active = objectClasses.includes(value);
    if (!active && objectClasses.length >= 2) return; // 🔒 max 2

    const nextClasses = active
      ? objectClasses.filter((v) => v !== value)
      : [...objectClasses, value];

    const nextCategories = deriveCategories(nextClasses);

    setObjectClasses(nextClasses);

    onChange({
      ...filters,
      objectClasses: nextClasses,
      objectCategories: nextCategories,
    });
  };

  const setOfferType = (value) => {
    if (!isEditing) return;
    if (offerTypes[0] === value) return;

    const next = [value];
    setOfferTypes(next);
    onChange({ ...filters, offerTypes: next });
  };

  const chipClass = (active, disabled) => {
    const base =
      "px-4 py-2 text-sm rounded-full border transition-all duration-200";
    if (active) {
      return `${base} bg-blue-600 border-blue-600 text-white hover:bg-blue-700`;
    }
    if (disabled) {
      return `${base} bg-white border-gray-200 text-gray-400 cursor-not-allowed`;
    }
    return `${base} bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400`;
  };

  return (
    <FilterFrame
      isEditing={isEditing}
      header={
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              Objekt & Angebot
            </h2>

            {!isEditing && (
              <button
                type="button"
                onClick={enterEdit}
                className="mt-2 px-3 py-1.5 text-sm font-semibold rounded-full bg-gray-200 text-gray-800 hover:bg-gray-300"
              >
                Bearbeiten
              </button>
            )}
          </div>

          {isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-5 py-2 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700"
            >
              Fertig
            </button>
          )}
        </div>
      }
    >
      <div className="relative">
        <div className="space-y-8">
         
          <hr className="border-gray-200/60" />

          {/* Angebotsart */}
          <div>
            <h3 className="text-base font-bold text-gray-800 mb-4">
              Angebotsart
            </h3>
            <div className="flex flex-wrap gap-3">
              {["Kauf", "Miete"].map((v) => (
                <button
                  key={v}
                  type="button"
                  disabled={!isEditing}
                  onClick={() => setOfferType(v)}
                  className={chipClass(offerTypes.includes(v))}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
           {/* Objektarten */}
          <div>
            <h3 className="text-base font-bold text-gray-800 mb-4">
              Objektarten
            </h3>
            <p className="text-sm text-gray-600">
              Wähle bis zu zwei Stück aus:
            </p>
            <br />

            <div className="flex flex-wrap gap-3">
              {OBJECT_CLASSES.map((o) => {
                const active = objectClasses.includes(o.value);
                const disabled = !active && objectClasses.length >= 2;

                return (
                  <button
                    key={o.value}
                    type="button"
                    disabled={!isEditing || disabled}
                    onClick={() => toggleObjectClass(o.value)}
                    className={chipClass(active, disabled)}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {!isEditing && (
          <button
            type="button"
            onClick={enterEdit}
            className="absolute inset-0 rounded-xl bg-transparent"
          />
        )}
      </div>
    </FilterFrame>
  );
}
