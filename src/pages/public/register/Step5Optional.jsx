// src/pages/public/register/Step5Optional.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { readStep5State, toggleInArray, setRange } from "./storage/step5.js";

// Optionen lt. Geomap-API
const ENERGY_SOURCES = [
  "Erdgas","Erdwaerme","Fernwaerme","Fluessiggas","Gas","Holz","Kohle",
  "Luftwaerme","Nahwaerme","Oel","Pellets","Solar","Strom","Wasserwaerme","Alternativ"
];
const HEATING_TYPES = [
  "Blockheizkraftwerk","Etagenheizung","Fernheizung","Fussbodenheizung","Kachelofen",
  "Kamin","Nachtspeicher","Ofenheizung","Solarheizung","Waermepumpe","Zentralheizung"
];
const ENERGY_RATINGS = ["A3Plus","A2Plus","APlus","A","B","C","D","E","F","G","H"];
const EFFICIENCY_STANDARDS = [
  "KfwEffizienzhausDenkmal","KfwEffizienzhaus115","KfwEffizienzhaus100","KfwEffizienzhaus85",
  "KfwEffizienzhaus70","KfwEffizienzhaus60","KfwEffizienzhaus55","KfwEffizienzhaus40",
  "KfwEffizienzhaus40Plus","Passivhaus","Nullenergiehaus","Plusenergiehaus"
];

export default function Step5Optional() {
  const navigate = useNavigate();
  const s = useMemo(() => readStep5State(), []);

  // Sichtbarkeit der Extra-Filter (erst nach Klick)
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Arrays sicher initialisieren
  const [energySources, setES] = useState(s.energySources || []);
  const [heatingTypes, setHT] = useState(s.heatingTypes || []);
  const [energyRatings, setER] = useState(s.energyRatings || []);
  const [effStandards, setEff] = useState(s.energyEfficiencyStandards || []);

  // Ranges als Strings für Inputs
  const [pqmFrom, setPqmFrom] = useState(s.pricePerSqmRange?.from ?? "");
  const [pqmTo,   setPqmTo]   = useState(s.pricePerSqmRange?.to   ?? "");
  const [yieldF,  setYieldF]  = useState(s.yieldRange?.from ?? "");
  const [yieldT,  setYieldT]  = useState(s.yieldRange?.to   ?? "");
  const [ecFrom,  setEcFrom]  = useState(s.energyConsumptionRange?.from ?? "");
  const [ecTo,    setEcTo]    = useState(s.energyConsumptionRange?.to   ?? "");
  const [byFrom,  setByFrom]  = useState(s.constructionYearRange?.from ?? "");
  const [byTo,    setByTo]    = useState(s.constructionYearRange?.to   ?? "");

  function toggleChip(key, value, setLocal) {
    toggleInArray(key, value);
    setLocal((prev) =>
      prev?.includes(value)
        ? prev.filter((v) => v !== value)
        : [...(prev || []), value]
    );
  }

  function saveRanges() {
    setRange("pricePerSqmRange",       pqmFrom, pqmTo);
    setRange("yieldRange",             yieldF,  yieldT);
    setRange("energyConsumptionRange", ecFrom,  ecTo);
    setRange("constructionYearRange",  byFrom,  byTo);
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
                onToggle={(v) =>
                  toggleChip("energyEfficiencyStandards", v, setEff)
                }
              />
            </Section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Section title="Preis pro m²">
                    <RangeRow
                    unit="€/m²"
                    from={pqmFrom}
                    to={pqmTo}
                    setFrom={setPqmFrom}
                    setTo={setPqmTo}
                    onBlurSave={saveRanges}
                    />
                </Section>

                <Section title="Rendite">
                    <RangeRow
                    unit="%"
                    step="0.1"
                    from={yieldF}
                    to={yieldT}
                    setFrom={setYieldF}
                    setTo={setYieldT}
                    onBlurSave={saveRanges}
                    />
                </Section>

                <Section title="Energieverbrauch">
                    <RangeRow
                    unit="kWh/m²*a"
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
        const isActive = active?.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            // Buttons optimiert für Touch (padding, scale)
            className={`inline-flex items-center justify-center rounded-full border px-3 py-2 text-xs transition active:scale-95
              ${
                isActive
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white text-gray-800 border-gray-300 hover:bg-gray-100"
              }`}
            title={opt}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function RangeRow({ unit, from, to, setFrom, setTo, step = "1", onBlurSave }) {
  // Layout geändert: Side-by-Side (flex-row) statt übereinander, damit es auf dem Handy nicht so lang wird
  return (
    <div className="flex items-end justify-center gap-3 w-full max-w-sm mx-auto">
      {/* von */}
      <div className="flex-1">
        <label className="block text-xs text-gray-500 mb-1 text-center">von</label>
        <input
          type="number"
          step={step}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          onBlur={onBlurSave}
          // py-2.5 für bessere Touch-Bedienung
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-center text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="0"
        />
      </div>

      <span className="text-gray-400 pb-3">-</span>

      {/* bis */}
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

      {/* Einheit */}
      {unit && <span className="text-xs text-gray-500 pb-3 w-10">{unit}</span>}
    </div>
  );
}