import { useState } from "react";
import FilterFrame from "./FilterFrame";

/* ------------------- Constants ------------------- */
const ENERGY_SOURCES = [
  { value: "Erdgas", label: "Erdgas" },
  { value: "Erdwaerme", label: "Erdwärme" },
  { value: "Fernwaerme", label: "Fernwärme" },
  { value: "Fluessiggas", label: "Flüssiggas" },
  { value: "Gas", label: "Gas" },
  { value: "Holz", label: "Holz" },
  { value: "Kohle", label: "Kohle" },
  { value: "Luftwaerme", label: "Luftwärme" },
  { value: "Nahwaerme", label: "Nahwärme" },
  { value: "Oel", label: "Öl" },
  { value: "Pellets", label: "Pellets" },
  { value: "Solar", label: "Solar" },
  { value: "Strom", label: "Strom" },
  { value: "Wasserwaerme", label: "Wasserwärme" },
  { value: "Alternativ", label: "Alternativ" },
];

const HEATING_TYPES = [
  { value: "Blockheizkraftwerk", label: "Blockheizkraftwerk" },
  { value: "Etagenheizung", label: "Etagenheizung" },
  { value: "Fernheizung", label: "Fernheizung" },
  { value: "Fussbodenheizung", label: "Fußbodenheizung" },
  { value: "Kachelofen", label: "Kachelofen" },
  { value: "Kamin", label: "Kamin" },
  { value: "Nachtspeicher", label: "Nachtspeicher" },
  { value: "Ofenheizung", label: "Ofenheizung" },
  { value: "Solarheizung", label: "Solarheizung" },
  { value: "Waermepumpe", label: "Wärmepumpe" },
  { value: "Zentralheizung", label: "Zentralheizung" },
];

const ENERGY_RATINGS = ["A3Plus","A2Plus","APlus","A","B","C","D","E","F","G","H"];
const EFFICIENCY_STANDARDS = [
  "KfwEffizienzhausDenkmal","KfwEffizienzhaus115","KfwEffizienzhaus100",
  "KfwEffizienzhaus85","KfwEffizienzhaus70","KfwEffizienzhaus60",
  "KfwEffizienzhaus55","KfwEffizienzhaus40","KfwEffizienzhaus40Plus",
  "Passivhaus","Nullenergiehaus","Plusenergiehaus"
];

/* ------------------- Helpers ------------------- */

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

function ChipGrid({ options, active = [], onToggle, isEditing }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const val = typeof opt === "string" ? opt : opt.value;
        const label = typeof opt === "string" ? opt : opt.label;
        const isActive = active.includes(val);

        const base =
          "px-3 py-1.5 text-xs font-medium rounded-full border transition-all";

        const cls = isActive
          ? isEditing
            ? `${base} bg-blue-600 border-blue-600 text-white hover:bg-blue-700`
            : `${base} bg-gray-200 border-gray-200 text-gray-700`
          : isEditing
            ? `${base} bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400`
            : `${base} bg-white border-gray-200 text-gray-400`;

        return (
          <button
            key={val}
            type="button"
            disabled={!isEditing}
            onClick={() => onToggle(val)}
            className={cls}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function RangeInput({ from, to, unit, onChangeFrom, onChangeTo, isEditing }) {
  return (
    <div className="flex items-center gap-2 max-w-xs">
      <input
        type="number"
        value={from ?? ""}
        disabled={!isEditing}
        onChange={(e) => onChangeFrom(e.target.value)}
        className="w-24 rounded-lg border-gray-300 bg-gray-50 px-3 py-2 text-sm disabled:text-gray-400"
        placeholder="von"
      />
      <span className="text-gray-400">-</span>
      <input
        type="number"
        value={to ?? ""}
        disabled={!isEditing}
        onChange={(e) => onChangeTo(e.target.value)}
        className="w-24 rounded-lg border-gray-300 bg-gray-50 px-3 py-2 text-sm disabled:text-gray-400"
        placeholder="bis"
      />
      <span className="text-sm text-gray-500 font-medium ml-1">{unit}</span>
    </div>
  );
}

const toNumberOrNull = (v) =>
  v === "" || v == null ? null : Number.isFinite(Number(v)) ? Number(v) : null;

/* ------------------- Main ------------------- */

export default function AdvancedFiltersCard({ filters, onChange }) {
  const [isEditing, setIsEditing] = useState(false);
  const enterEdit = () => setIsEditing(true);

  const toggleArray = (field, value) => {
    if (!isEditing) return;
    const current = filters[field] || [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];

    onChange({ ...filters, [field]: next });
  };

  const updateRange = (field, key, value) => {
    onChange({
      ...filters,
      [field]: {
        ...(filters[field] || {}),
        [key]: toNumberOrNull(value),
      },
    });
  };

  const {
    energySources = [],
    heatingTypes = [],
    energyRatings = [],
    energyEfficiencyStandards = [],
    pricePerSqmRange = {},
    yieldRange = {},
    energyConsumptionRange = {},
    constructionYearRange = {},
  } = filters || {};

  return (
    <FilterFrame
      isEditing={isEditing}
      header={
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              Erweiterte Filter
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
      <div className="relative space-y-8">
        <Section title="Energieträger">
          <ChipGrid
            options={ENERGY_SOURCES}
            active={energySources}
            isEditing={isEditing}
            onToggle={(v) => toggleArray("energySources", v)}
          />
        </Section>

        <Section title="Heizung">
          <ChipGrid
            options={HEATING_TYPES}
            active={heatingTypes}
            isEditing={isEditing}
            onToggle={(v) => toggleArray("heatingTypes", v)}
          />
        </Section>

        <Section title="Energieklasse">
          <ChipGrid
            options={ENERGY_RATINGS}
            active={energyRatings}
            isEditing={isEditing}
            onToggle={(v) => toggleArray("energyRatings", v)}
          />
        </Section>

        <Section title="Energiestandard">
          <ChipGrid
            options={EFFICIENCY_STANDARDS}
            active={energyEfficiencyStandards}
            isEditing={isEditing}
            onToggle={(v) => toggleArray("energyEfficiencyStandards", v)}
          />
        </Section>

        <hr className="border-gray-200/60" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Section title="Preis pro m²">
            <RangeInput
              from={pricePerSqmRange.from}
              to={pricePerSqmRange.to}
              unit="€/m²"
              isEditing={isEditing}
              onChangeFrom={(v) =>
                updateRange("pricePerSqmRange", "from", v)
              }
              onChangeTo={(v) =>
                updateRange("pricePerSqmRange", "to", v)
              }
            />
          </Section>

          <Section title="Rendite">
            <RangeInput
              from={yieldRange.from}
              to={yieldRange.to}
              unit="%"
              isEditing={isEditing}
              onChangeFrom={(v) =>
                updateRange("yieldRange", "from", v)
              }
              onChangeTo={(v) =>
                updateRange("yieldRange", "to", v)
              }
            />
          </Section>

          <Section title="Energieverbrauch">
            <RangeInput
              from={energyConsumptionRange.from}
              to={energyConsumptionRange.to}
              unit="kWh"
              isEditing={isEditing}
              onChangeFrom={(v) =>
                updateRange("energyConsumptionRange", "from", v)
              }
              onChangeTo={(v) =>
                updateRange("energyConsumptionRange", "to", v)
              }
            />
          </Section>

          <Section title="Baujahr">
            <RangeInput
              from={constructionYearRange.from}
              to={constructionYearRange.to}
              unit=""
              isEditing={isEditing}
              onChangeFrom={(v) =>
                updateRange("constructionYearRange", "from", v)
              }
              onChangeTo={(v) =>
                updateRange("constructionYearRange", "to", v)
              }
            />
          </Section>
        </div>

        {/* Click-anywhere Overlay */}
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
