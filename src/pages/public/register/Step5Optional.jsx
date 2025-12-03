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
    <div className="space-y-6 rounded-2xl border p-6 w-2/3 mx-auto mt-10">
      <p className="text-center text-sm text-gray-500">
        Schritt 5 von 5 (optional)
      </p>

      {/* ——— Startzustand: NUR Frage + zwei CTAs ——— */}
      {!showAdvanced && (
        <div>
          <p className="text-sm text-gray-700 mb-3 text-center">
            Möchtest du noch weitere technische Filter nutzen?
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              type="button"
              className="px-5 py-3 rounded-xl bg-white border border-gray-300 text-sm text-gray-800 hover:bg-gray-100 transition"
              onClick={() => setShowAdvanced(true)}
            >
              Ja, unbedingt
            </button>
            <button
              type="button"
              className="px-5 py-3 rounded-xl bg-blue-900 text-white text-sm"
              onClick={() => navigate("/register/finish")}
            >
              Nein, jetzt registrieren
            </button>
          </div>
        </div>
      )}

      {showAdvanced && (
        <>
          <h2 className="text-xl font-semibold text-center">Weitere technische Filter</h2>

          <p className="text-xs sm:text-sm text-gray-600 text-center max-w-xl mx-auto">
            Achtung: Jeder weitere Filter kann die Trefferquote reduzieren.{" "}
            <a
              href="https://immobot.pro/funktionen/"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Siehe FAQ
            </a>
            .
          </p>

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
        </>
      )}

      {/* Navigation unten – immer gleiche Reihe wie Step 4 */}
      <div className="flex items-center justify-between mt-6">
        <button
          type="button"
          className="px-6 py-3 rounded-xl bg-gray-200"
          onClick={() => navigate("/register/step4")}
        >
          &lt; zurück
        </button>

        {showAdvanced ? (
          <button
            type="button"
            className="px-6 py-3 rounded-xl bg-blue-900 text-white"
            onClick={() => {
              saveRanges();
              navigate("/register/finish");
            }}
          >
            Jetzt registrieren &gt;
          </button>
        ) : (
          <div /> // Platzhalter, damit die Reihe stabil bleibt
        )}
      </div>
    </div>
  );
}

/* helpers */
function Section({ title, children }) {
  return (
    <div className="mt-4">
      <h3 className="mb-2 font-semibold text-sm text-center">{title}</h3>
      {children}
    </div>
  );
}

function ChipGrid({ options, active = [], onToggle }) {
  return (
    <div className="flex flex-wrap justify-center max-w-3xl mx-auto">
      {options.map((opt) => {
        const isActive = active?.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`m-1 inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-xs sm:text-sm transition
              ${
                isActive
                  ? "bg-blue-600 text-white border-blue-600"
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
  return (
    <div className="flex flex-col items-center gap-2">
      {/* von */}
      <div className="flex flex-col items-center w-full max-w-xs">
        <label className="text-xs text-gray-500 mb-1">von</label>
        <input
          type="number"
          step={step}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          onBlur={onBlurSave}
          className="w-full rounded-lg border px-3 py-2 text-center"
        />
      </div>

      {/* bis */}
      <div className="flex flex-col items-center w-full max-w-xs">
        <label className="text-xs text-gray-500 mb-1">bis</label>
        <input
          type="number"
          step={step}
          value={to}
          onChange={(e) => setTo(e.target.value)}
          onBlur={onBlurSave}
          className="w-full rounded-lg border px-3 py-2 text-center"
        />
      </div>

      {/* Einheit */}
      {unit && <span className="text-sm text-gray-500 mt-1">{unit}</span>}
    </div>
  );
}
