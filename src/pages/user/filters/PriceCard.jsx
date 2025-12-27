import { useEffect, useMemo, useState } from "react";
import FilterFrame from "./FilterFrame";

/* ---------- Chip: IDENTISCH zu ObjectCard ---------- */
function Chip({ active, onClick, children, disabled, isEditing }) {
  const base =
    "px-4 py-2 text-sm rounded-full font-medium transition-all duration-200 border";

  if (active) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={
          isEditing
            ? `${base} bg-blue-600 border-blue-600 text-white hover:bg-blue-700`
            : `${base} bg-gray-200 border-gray-200 text-gray-700`
        }
      >
        {children}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={
        isEditing
          ? `${base} bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400`
          : `${base} bg-white border-gray-200 text-gray-400`
      }
    >
      {children}
    </button>
  );
}

/* ---------- Presets ---------- */

const RENT_PRESETS = [600, 800, 1000, 1200, 1500, null];
const BUY_PRESETS = [200000, 300000, 400000, 500000, 750000, 1000000, null];

const SPACE_PRESETS_APARTMENT = [
  { label: "bis 100 m²", from: null, to: 100 },
  { label: "ab 100 m²", from: 100, to: null },
  { label: "beliebig", from: null, to: null },
];

const SPACE_PRESETS_PLOT = [
  { label: "bis 500 m²", from: null, to: 500 },
  { label: "ab 500 m²", from: 500, to: null },
  { label: "beliebig", from: null, to: null },
];

export default function PriceCard({ filters, onChange }) {
  const [isEditing, setIsEditing] = useState(false);

  const isRentOnly =
    filters.offerTypes?.includes("Miete") &&
    !filters.offerTypes?.includes("Kauf");

  const isGrundstueck = filters.objectClasses?.includes("Grundstueck");

  const pricePresets = useMemo(
    () => (isRentOnly ? RENT_PRESETS : BUY_PRESETS),
    [isRentOnly]
  );

  const spacePresets = isGrundstueck
    ? SPACE_PRESETS_PLOT
    : SPACE_PRESETS_APARTMENT;

  const [priceTo, setPriceTo] = useState(filters.priceRange?.to ?? null);
  const [spaceRange, setSpaceRange] = useState({
    from: filters.propertySpaceRange?.from ?? null,
    to: filters.propertySpaceRange?.to ?? null,
  });

  useEffect(() => {
    setPriceTo(filters.priceRange?.to ?? null);
    setSpaceRange({
      from: filters.propertySpaceRange?.from ?? null,
      to: filters.propertySpaceRange?.to ?? null,
    });
  }, [filters]);

  const enterEdit = () => setIsEditing(true);

  const fmtEUR = (val, idx) => {
    if (val == null) return "beliebig";
    const formatted = val.toLocaleString("de-DE");

    if (isRentOnly) return `bis ${formatted} €`;

    const isLastNumber =
      idx === pricePresets.length - 2 &&
      pricePresets[pricePresets.length - 1] === null;

    return isLastNumber ? `ab ${formatted} €` : `bis ${formatted} €`;
  };

  const selectPrice = (to) => {
    if (!isEditing) return;
    setPriceTo(to);
    onChange({
      ...filters,
      priceRange: { ...(filters.priceRange || {}), to },
    });
  };

  const selectSpace = (preset) => {
    if (!isEditing) return;
    setSpaceRange({ from: preset.from, to: preset.to });
    onChange({
      ...filters,
      propertySpaceRange: { from: preset.from, to: preset.to },
    });
  };

  return (
    <FilterFrame
      isEditing={isEditing}
      header={
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Preis & Fläche
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
        <div className="space-y-8">
          <div>
            <h3 className="text-base font-bold text-gray-800 mb-4">
              {isRentOnly ? "Maximale Kaltmiete" : "Maximaler Kaufpreis"}
            </h3>

            <div className="flex flex-wrap gap-2">
              {pricePresets.map((p, i) => (
                <Chip
                  key={i}
                  active={priceTo === p}
                  onClick={() => selectPrice(p)}
                  disabled={!isEditing}
                  isEditing={isEditing}
                >
                  {fmtEUR(p, i)}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-base font-bold text-gray-800 mb-4">
              {isGrundstueck ? "Grundstücksfläche" : "Wohnfläche"}
            </h3>

            <div className="flex flex-wrap gap-2">
              {spacePresets.map((preset, i) => {
                const active =
                  spaceRange.from === preset.from &&
                  spaceRange.to === preset.to;

                return (
                  <Chip
                    key={i}
                    active={active}
                    onClick={() => selectSpace(preset)}
                    disabled={!isEditing}
                    isEditing={isEditing}
                  >
                    {preset.label}
                  </Chip>
                );
              })}
            </div>
          </div>
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
