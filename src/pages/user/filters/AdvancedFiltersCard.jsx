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


const ENERGY_RATINGS = [
  { value: "A3Plus", label: "A+++" },
  { value: "A2Plus", label: "A++" },
  { value: "APlus", label: "A+" },
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
  { value: "D", label: "D" },
  { value: "E", label: "E" },
  { value: "F", label: "F" },
  { value: "G", label: "G" },
  { value: "H", label: "H" },
];


const EFFICIENCY_STANDARDS = [
  { value: "KfwEffizienzhausDenkmal", label: "KfW Denkmal" },
  { value: "KfwEffizienzhaus115", label: "KfW 115" },
  { value: "KfwEffizienzhaus100", label: "KfW 100" },
  { value: "KfwEffizienzhaus85", label: "KfW 85" },
  { value: "KfwEffizienzhaus70", label: "KfW 70" },
  { value: "KfwEffizienzhaus60", label: "KfW 60" },
  { value: "KfwEffizienzhaus55", label: "KfW 55" },
  { value: "KfwEffizienzhaus40", label: "KfW 40" },
  { value: "KfwEffizienzhaus40Plus", label: "KfW 40 Plus" },
  { value: "Passivhaus", label: "Passivhaus" },
  { value: "Nullenergiehaus", label: "Nullenergiehaus" },
  { value: "Plusenergiehaus", label: "Plusenergiehaus" },
];

/* ------------------- Helpers ------------------- */

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">{title}</h3>
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

        const base = "px-3 py-1.5 text-xs font-medium rounded-full border transition-all";

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

/** Baue Zahlen-Optionen in Schritten (inkl. max) */
function buildSteps(min, max, step) {
  const out = [];
  for (let v = min; v <= max; v += step) out.push(v);
  return out;
}

function RangeSelect({
  from,
  to,
  unit,
  options,
  isEditing,
  onChange,
  placeholders = { from: "von", to: "bis" },
}) {
  const fromVal = from ?? null;
  const toVal = to ?? null;

  const toOptions = fromVal == null ? options : options.filter((v) => v >= fromVal);

  const apply = (nextFrom, nextTo) => {
    let f = nextFrom ?? null;
    let t = nextTo ?? null;

    if (f != null && t != null && f > t) {
      const tmp = f;
      f = t;
      t = tmp;
    }

    onChange({ from: f, to: t });
  };

  return (
    <div className="flex items-center gap-2 max-w-xs">
      <select
        disabled={!isEditing}
        value={fromVal ?? ""}
        onChange={(e) => {
          const v = e.target.value === "" ? null : Number(e.target.value);
          apply(v, toVal);
        }}
        className="w-24 rounded-lg border-gray-300 bg-gray-50 px-3 py-2 text-sm disabled:text-gray-400"
      >
        <option value="">{placeholders.from}</option>
        {options.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>

      <span className="text-gray-400">-</span>

      <select
        disabled={!isEditing}
        value={toVal ?? ""}
        onChange={(e) => {
          const v = e.target.value === "" ? null : Number(e.target.value);
          apply(fromVal, v);
        }}
        className="w-24 rounded-lg border-gray-300 bg-gray-50 px-3 py-2 text-sm disabled:text-gray-400"
      >
        <option value="">{placeholders.to}</option>
        {toOptions.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>

      {unit ? <span className="text-sm text-gray-500 font-medium ml-1">{unit}</span> : null}
    </div>
  );
}

/* ------------------- Range Options ------------------- */
const PRICE_PER_SQM_OPTIONS = [
  ...buildSteps(0, 3000, 100),
  ...buildSteps(3250, 10000, 250),
];

const YIELD_OPTIONS = buildSteps(0, 15, 1);
const ENERGY_CONSUMPTION_OPTIONS = buildSteps(0, 500, 50);

const CURRENT_YEAR = new Date().getFullYear();
const CONSTRUCTION_YEAR_OPTIONS = buildSteps(1900, CURRENT_YEAR, 5);

/* ------------------- Main ------------------- */

export default function AdvancedFiltersCard({ filters, onChange }) {
  const [isEditing, setIsEditing] = useState(false);
  const enterEdit = () => setIsEditing(true);

  const toggleArray = (field, value) => {
    if (!isEditing) return;
    const current = filters[field] || [];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    onChange({ ...filters, [field]: next });
  };

  const updateRangeSafe = (field, nextRange) => {
    onChange({
      ...filters,
      [field]: {
        from: nextRange?.from ?? null,
        to: nextRange?.to ?? null,
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
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Erweiterte Filter</h2>

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
          <Section title="Preis pro m² (€/m²)">
            <RangeSelect
              from={pricePerSqmRange.from ?? null}
              to={pricePerSqmRange.to ?? null}
              unit=""
              options={PRICE_PER_SQM_OPTIONS}
              isEditing={isEditing}
              onChange={(r) => updateRangeSafe("pricePerSqmRange", r)}
            />
          </Section>

          <Section title="Rendite (%)">
            <RangeSelect
              from={yieldRange.from ?? null}
              to={yieldRange.to ?? null}
              unit
              options={YIELD_OPTIONS}
              isEditing={isEditing}
              onChange={(r) => updateRangeSafe("yieldRange", r)}
            />
          </Section>

          <Section title="Energieverbrauch kWh">
            <RangeSelect
              from={energyConsumptionRange.from ?? null}
              to={energyConsumptionRange.to ?? null}
              unit=""
              options={ENERGY_CONSUMPTION_OPTIONS}
              isEditing={isEditing}
              onChange={(r) => updateRangeSafe("energyConsumptionRange", r)}
            />
          </Section>

          <Section title="Baujahr">
            <RangeSelect
              from={constructionYearRange.from ?? null}
              to={constructionYearRange.to ?? null}
              unit=""
              options={CONSTRUCTION_YEAR_OPTIONS}
              isEditing={isEditing}
              onChange={(r) => updateRangeSafe("constructionYearRange", r)}
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