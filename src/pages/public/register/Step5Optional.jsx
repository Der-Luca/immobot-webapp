// src/pages/public/register/Step5Optional.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { readStep5State, toggleInArray, setRange } from "./storage/step5.js";

/* ------------------- Options (value=API-safe, label=UI) ------------------- */

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
  { value: "KfwEffizienzhausDenkmal", label: "KfW Effizienzhaus Denkmal" },
  { value: "KfwEffizienzhaus115", label: "KfW Effizienzhaus 115" },
  { value: "KfwEffizienzhaus100", label: "KfW Effizienzhaus 100" },
  { value: "KfwEffizienzhaus85", label: "KfW Effizienzhaus 85" },
  { value: "KfwEffizienzhaus70", label: "KfW Effizienzhaus 70" },
  { value: "KfwEffizienzhaus60", label: "KfW Effizienzhaus 60" },
  { value: "KfwEffizienzhaus55", label: "KfW Effizienzhaus 55" },
  { value: "KfwEffizienzhaus40", label: "KfW Effizienzhaus 40" },
  { value: "KfwEffizienzhaus40Plus", label: "KfW Effizienzhaus 40+" },
  { value: "Passivhaus", label: "Passivhaus" },
  { value: "Nullenergiehaus", label: "Nullenergiehaus" },
  { value: "Plusenergiehaus", label: "Plusenergiehaus" },
];

/* ------------------- Helpers ------------------- */

const toNumOrNull = (v) => {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const roundToStep = (n, step) => {
  if (!step || step <= 0) return n;
  return Math.round(n / step) * step;
};

function normalizeRange(fromStr, toStr, { step = 1, min = null, max = null, integer = false } = {}) {
  let from = toNumOrNull(fromStr);
  let to = toNumOrNull(toStr);

  if (from != null) {
    from = roundToStep(from, step);
    if (integer) from = Math.round(from);
    if (min != null) from = Math.max(min, from);
    if (max != null) from = Math.min(max, from);
  }

  if (to != null) {
    to = roundToStep(to, step);
    if (integer) to = Math.round(to);
    if (min != null) to = Math.max(min, to);
    if (max != null) to = Math.min(max, to);
  }

  // Wenn beide gesetzt und falsch rum -> swap
  if (from != null && to != null && from > to) {
    const tmp = from;
    from = to;
    to = tmp;
  }

  return {
    from,
    to,
    fromStr: from == null ? "" : String(from),
    toStr: to == null ? "" : String(to),
  };
}

/* ------------------- Component ------------------- */

export default function Step5Optional() {
  const navigate = useNavigate();
  const s = useMemo(() => readStep5State(), []);

  // Sichtbarkeit der Extra-Filter (erst nach Klick)
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Arrays sicher initialisieren (values!)
  const [energySources, setES] = useState(s.energySources || []);
  const [heatingTypes, setHT] = useState(s.heatingTypes || []);
  const [energyRatings, setER] = useState(s.energyRatings || []);
  const [effStandards, setEff] = useState(s.energyEfficiencyStandards || []);

  // Ranges als Strings für Inputs
  const [pqmFrom, setPqmFrom] = useState(s.pricePerSqmRange?.from ?? "");
  const [pqmTo, setPqmTo] = useState(s.pricePerSqmRange?.to ?? "");
  const [yieldF, setYieldF] = useState(s.yieldRange?.from ?? "");
  const [yieldT, setYieldT] = useState(s.yieldRange?.to ?? "");
  const [ecFrom, setEcFrom] = useState(s.energyConsumptionRange?.from ?? "");
  const [ecTo, setEcTo] = useState(s.energyConsumptionRange?.to ?? "");
  const [byFrom, setByFrom] = useState(s.constructionYearRange?.from ?? "");
  const [byTo, setByTo] = useState(s.constructionYearRange?.to ?? "");

  function toggleChip(key, value, setLocal) {
    toggleInArray(key, value);
    setLocal((prev) =>
      prev?.includes(value)
        ? prev.filter((v) => v !== value)
        : [...(prev || []), value]
    );
  }

  function saveRanges() {
    // Preis pro m² (100er Schritte)
    const pqm = normalizeRange(pqmFrom, pqmTo, { step: 100, min: 0 });
    setPqmFrom(pqm.fromStr);
    setPqmTo(pqm.toStr);
    setRange("pricePerSqmRange", pqm.fromStr, pqm.toStr);

    // Rendite (1er Schritte, Prozent)
    const y = normalizeRange(yieldF, yieldT, { step: 1, min: 0 });
    setYieldF(y.fromStr);
    setYieldT(y.toStr);
    setRange("yieldRange", y.fromStr, y.toStr);

    // Energieverbrauch (50er Schritte) – kannst du auf 100 stellen, wenn du willst
    const ec = normalizeRange(ecFrom, ecTo, { step: 50, min: 0 });
    setEcFrom(ec.fromStr);
    setEcTo(ec.toStr);
    setRange("energyConsumptionRange", ec.fromStr, ec.toStr);

    // Baujahr (integer)
    const yearMin = 1800; // safe
    const yearMax = new Date().getFullYear() + 1;
    const by = normalizeRange(byFrom, byTo, { step: 1, min: yearMin, max: yearMax, integer: true });
    setByFrom(by.fromStr);
    setByTo(by.toStr);
    setRange("constructionYearRange", by.fromStr, by.toStr);
  }

  return (
    // CONTAINER: Mobile (kein Border) vs Desktop (Karte)
    <div className="
      w-full mx-auto max-w-2xl bg-white space-y-6
      p-4 mt-2
      md:p-6 md:mt-10 md:w-2/3 md:border md:rounded-2xl md:shadow-sm
    ">
      <p className="text-center text-xs md:text-sm text-gray-500">
        Schritt 5 von 5 (optional)
      </p>

      {/* ——— Startzustand: NUR Frage + zwei CTAs ——— */}
      {!showAdvanced && (
        <div className="py-2">
          <p className="text-sm md:text-base text-gray-700 mb-6 text-center font-medium">
            Möchtest du noch weitere technische Filter nutzen?
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white border border-gray-300 text-sm font-medium text-gray-800 hover:bg-gray-50 active:scale-95 transition"
              onClick={() => setShowAdvanced(true)}
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

      {showAdvanced && (
        <>
          <h2 className="text-xl md:text-2xl font-semibold text-center leading-tight">
            Technische Filter
          </h2>

          <p className="text-xs sm:text-sm text-gray-600 text-center max-w-xl mx-auto">
            Achtung: Jeder weitere Filter kann die Trefferquote reduzieren.{" "}
            <a
              href="https://immobot.pro/funktionen/"
              target="_blank"
              rel="noreferrer"
              className="underline text-blue-600"
            >
              Siehe FAQ
            </a>
            .
          </p>

          <div className="space-y-6 pt-2">
            <Section title="Energieträger">
              <ChipGrid
                options={ENERGY_SOURCES}
                active={energySources}
                onToggle={(v) => toggleChip("energySources", v, setES)}
              />
            </Section>

            <Section title="Heizungsart">
              <ChipGrid
                options={HEATING_TYPES}
                active={heatingTypes}
                onToggle={(v) => toggleChip("heatingTypes", v, setHT)}
              />
            </Section>

            <Section title="Energieklasse">
              <ChipGrid
                options={ENERGY_RATINGS}
                active={energyRatings}
                onToggle={(v) => toggleChip("energyRatings", v, setER)}
              />
            </Section>

            <Section title="Energiestandard">
              <ChipGrid
                options={EFFICIENCY_STANDARDS}
                active={effStandards}
                onToggle={(v) => toggleChip("energyEfficiencyStandards", v, setEff)}
              />
            </Section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Section title="Preis pro m² (€/m)">
                <RangeRow
                  unit=""
                  step="100"
                  from={pqmFrom}
                  to={pqmTo}
                  setFrom={setPqmFrom}
                  setTo={setPqmTo}
                  onBlurSave={saveRanges}
                />
              </Section>

              <Section title="Rendite (%)">
                <RangeRow
                  unit=""
                  step="1"
                  from={yieldF}
                  to={yieldT}
                  setFrom={setYieldF}
                  setTo={setYieldT}
                  onBlurSave={saveRanges}
                />
              </Section>

              <Section title="Energieverbrauch (kWh/m²*a)">
                <RangeRow
                  unit=""
                  step="50"
                  from={ecFrom}
                  to={ecTo}
                  setFrom={setEcFrom}
                  setTo={setEcTo}
                  onBlurSave={saveRanges}
                />
              </Section>

              <Section title="Baujahr">
                <RangeRow
                  unit=""
                  step="1"
                  from={byFrom}
                  to={byTo}
                  setFrom={setByFrom}
                  setTo={setByTo}
                  onBlurSave={saveRanges}
                />
              </Section>
            </div>
          </div>
        </>
      )}

      {/* Navigation unten */}
      <div className="flex items-center justify-between gap-4 mt-6">
        <button
          type="button"
          className="px-6 py-3 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium transition"
          onClick={() => navigate("/register/step4")}
        >
          &lt; Zurück
        </button>

        {showAdvanced ? (
          <button
            type="button"
            className="px-6 py-3 rounded-xl bg-blue-900 text-white font-medium shadow-sm hover:bg-blue-800 transition active:scale-95 text-sm md:text-base"
            onClick={() => {
              saveRanges();
              navigate("/register/finish");
            }}
          >
            Registrieren &gt;
          </button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}

/* helpers */
function Section({ title, children }) {
  return (
    <div className="w-full">
      <h3 className="mb-3 font-semibold text-sm text-center text-gray-800">{title}</h3>
      {children}
    </div>
  );
}

function ChipGrid({ options, active = [], onToggle }) {
  return (
    <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
      {options.map((opt) => {
        const value = typeof opt === "string" ? opt : opt.value;
        const label = typeof opt === "string" ? opt : opt.label;

        const isActive = active?.includes(value);

        return (
          <button
            key={value}
            type="button"
            onClick={() => onToggle(value)}
            className={`inline-flex items-center justify-center rounded-full border px-3 py-2 text-xs transition active:scale-95
              ${
                isActive
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white text-gray-800 border-gray-300 hover:bg-gray-100"
              }`}
            title={value}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function RangeRow({ unit, from, to, setFrom, setTo, step = "1", onBlurSave }) {
  return (
    <div className="flex items-end justify-center gap-3 w-full max-w-sm mx-auto">
      <div className="flex-1">
        <label className="block text-xs text-gray-500 mb-1 text-center">von</label>
        <input
          type="number"
          step={step}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          onBlur={onBlurSave}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-center text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="0"
        />
      </div>

      <span className="text-gray-400 pb-3">-</span>

      <div className="flex-1">
        <label className="block text-xs text-gray-500 mb-1 text-center">bis</label>
        <input
          type="number"
          step={step}
          value={to}
          onChange={(e) => setTo(e.target.value)}
          onBlur={onBlurSave}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-center text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="max"
        />
      </div>

      {unit && <span className="text-xs text-gray-500 pb-3 w-10">{unit}</span>}
    </div>
  );
}
