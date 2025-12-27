// src/pages/user/filters/ObjectCard.jsx
import { useEffect, useState } from "react";
import FilterFrame from "./FilterFrame";

const OBJECT_CLASSES = [
  { value: "Wohnung", label: "Wohnung" },
  { value: "Haus", label: "Haus" },
  { value: "Gewerbe", label: "Gewerbe" },
  { value: "Grundstueck", label: "Grundstück" },
];

export default function ObjectCard({ filters, onChange }) {
  const [objectClasses, setObjectClasses] = useState(filters.objectClasses || []);
  const [offerTypes, setOfferTypes] = useState(filters.offerTypes || []);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setObjectClasses(filters.objectClasses || []);
    setOfferTypes(filters.offerTypes || []);
  }, [filters]);

  const enterEdit = () => setIsEditing(true);

  const toggleObjectClass = (value) => {
    if (!isEditing) return;

    const next = objectClasses.includes(value)
      ? objectClasses.filter((v) => v !== value)
      : [...objectClasses, value];

    setObjectClasses(next);
    onChange({ ...filters, objectClasses: next });
  };

  const setOfferType = (value) => {
    if (!isEditing) return;
    if (offerTypes[0] === value) return;

    const next = [value];
    setOfferTypes(next);
    onChange({ ...filters, offerTypes: next });
  };

  const chipClass = (active) => {
    const base = "px-4 py-2 text-sm rounded-full border transition-all duration-200";
    if (active) {
      return isEditing
        ? `${base} bg-blue-600 border-blue-600 text-white hover:bg-blue-700`
        : `${base} bg-gray-200 border-gray-200 text-gray-700`;
    }
    return isEditing
      ? `${base} bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400`
      : `${base} bg-white border-gray-200 text-gray-500`;
  };

  return (
    <FilterFrame
      isEditing={isEditing}
      header={
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              Objekt & Angebot
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
                shrink-0
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
      {/* Body wrapper: damit wir im View-Mode die ganze Kachel anklickbar machen */}
      <div className="relative">
        <div className="space-y-8">
          {/* Objektarten */}
          <div>
            <h3 className="text-base font-bold text-gray-800 mb-4">
              Objektarten
            </h3>
            <div className="flex flex-wrap gap-3">
              {OBJECT_CLASSES.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  disabled={!isEditing}
                  onClick={() => toggleObjectClass(o.value)}
                  className={chipClass(objectClasses.includes(o.value))}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

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
        </div>

        {/* ✅ Click-anywhere Overlay im View-Mode (nur Body, Header bleibt normal) */}
        {!isEditing && (
          <button
            type="button"
            onClick={enterEdit}
            className="
              absolute inset-0
              rounded-xl
              cursor-pointer
              bg-transparent
            "
            aria-label="Bearbeiten aktivieren"
            title="Klicken zum Bearbeiten"
          />
        )}
      </div>
    </FilterFrame>
  );
}
