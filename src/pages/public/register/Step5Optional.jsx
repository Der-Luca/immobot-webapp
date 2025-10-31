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
    setLocal(prev => (prev?.includes(value) ? prev.filter(v => v !== value) : [...(prev||[]), value]));
  }

  function saveRanges() {
    setRange("pricePerSqmRange",       pqmFrom, pqmTo);
    setRange("yieldRange",             yieldF,  yieldT);
    setRange("energyConsumptionRange", ecFrom,  ecTo);
    setRange("constructionYearRange",  byFrom,  byTo);
  }

  return (
    <div className="space-y-6 rounded-2xl border p-6">
      <p className="text-center text-sm text-gray-500">Schritt 5 von 5 (optional)</p>

      {/* ——— Startzustand: NUR Frage + zwei CTAs ——— */}
      {!showAdvanced && (
        <div>
          <p className="text-sm text-gray-700 mb-3 text-center">
            Benötigst du noch mehr Filter?
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              type="button"
              className="px-5 py-3 rounded-xl bg-white border hover:bg-gray-100"
              onClick={() => setShowAdvanced(true)}
            >
              Ja, mehr Filter bitte…
            </button>
            <button
              type="button"
              className="px-5 py-3 rounded-xl bg-blue-900 text-white"
              onClick={() => navigate("/login")}
            >
              Nein… Jetzt registrieren
            </button>
          </div>
        </div>
      )}

      {/* ——— Nach Klick: Extra-Filter + „Login >“ ——— */}
      {showAdvanced && (
        <>
          <h2 className="text-xl font-semibold text-center">Weitere Filter</h2>
          <p className="text-sm text-gray-600 text-center">
            Achtung: Jeder weitere Filter kann die Trefferquote reduzieren.
          </p>

          <Section title="Energieträger (energySources)">
            <ChipGrid options={ENERGY_SOURCES} active={energySources}
              onToggle={(v)=>toggleChip("energySources", v, setES)} />
          </Section>

          <Section title="Heizungsart (heatingTypes)">
            <ChipGrid options={HEATING_TYPES} active={heatingTypes}
              onToggle={(v)=>toggleChip("heatingTypes", v, setHT)} />
          </Section>

          <Section title="Energieklasse (energyRatings)">
            <ChipGrid options={ENERGY_RATINGS} active={energyRatings}
              onToggle={(v)=>toggleChip("energyRatings", v, setER)} />
          </Section>

          <Section title="Energiestandard (energyEfficiencyStandards)">
            <ChipGrid options={EFFICIENCY_STANDARDS} active={effStandards}
              onToggle={(v)=>toggleChip("energyEfficiencyStandards", v, setEff)} />
          </Section>

          <Section title="Preis pro m² (pricePerSqmRange)">
            <RangeRow unit="€/m²" from={pqmFrom} to={pqmTo}
              setFrom={setPqmFrom} setTo={setPqmTo} onBlurSave={saveRanges} />
          </Section>

          <Section title="Rendite (yieldRange)">
            <RangeRow unit="%" step="0.1" from={yieldF} to={yieldT}
              setFrom={setYieldF} setTo={setYieldT} onBlurSave={saveRanges} />
          </Section>

          <Section title="Energieverbrauch (energyConsumptionRange)">
            <RangeRow unit="kWh/m²*a" from={ecFrom} to={ecTo}
              setFrom={setEcFrom} setTo={setEcTo} onBlurSave={saveRanges} />
          </Section>

          <Section title="Baujahr (constructionYearRange)">
            <RangeRow unit="" from={byFrom} to={byTo}
              setFrom={setByFrom} setTo={setByTo} onBlurSave={saveRanges} />
          </Section>

          <div className="flex items-center justify-between">
            <button
              type="button"
              className="text-sm underline"
              onClick={() => setShowAdvanced(false)}
            >
              Auswahl ausblenden
            </button>
            <button
              type="button"
              className="px-5 py-3 rounded-xl bg-blue-900 text-white"
              onClick={() => { saveRanges(); navigate("/login"); }}
            >
              Login &gt;
            </button>
          </div>
        </>
      )}

      {/* Navigation unten */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="px-6 py-3 rounded-xl bg-gray-200"
          onClick={() => navigate("/register/step4")}
        >
          &lt; zurück
        </button>
        {/* Platzhalter, damit Layout stabil bleibt, wenn nichts offen ist */}
        {showAdvanced ? (
          <button
            type="button"
            className="px-6 py-3 rounded-xl bg-blue-900 text-white"
            onClick={() => { saveRanges(); navigate("/login"); }}
          >
            Login &gt;
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
    <div className="mt-4">
      <h3 className="mb-2 font-semibold text-sm">{title}</h3>
      {children}
    </div>
  );
}

function ChipGrid({ options, active = [], onToggle }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {options.map((opt) => {
        const isActive = active?.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`px-3 py-2 rounded-full border text-sm text-left ${
              isActive ? "bg-blue-600 text-white" : "bg-white"
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

function RangeRow({ unit, from, to, setFrom, setTo, step="1", onBlurSave }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        step={step}
        value={from}
        onChange={(e)=>setFrom(e.target.value)}
        onBlur={onBlurSave}
        className="w-28 rounded-lg border px-3 py-2"
        placeholder="von"
      />
      <span>bis</span>
      <input
        type="number"
        step={step}
        value={to}
        onChange={(e)=>setTo(e.target.value)}
        onBlur={onBlurSave}
        className="w-28 rounded-lg border px-3 py-2"
        placeholder="bis"
      />
      {unit && <span className="text-sm text-gray-500">{unit}</span>}
    </div>
  );
}
