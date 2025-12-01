import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase";

const ENERGY_SOURCES = [
  "Erdgas","Erdwaerme","Fernwaerme","Fluessiggas","Gas","Holz","Kohle",
  "Luftwaerme","Nahwaerme","Oel","Pellets","Solar","Strom","Wasserwaerme","Alternativ"
];

const HEATING_TYPES = [
  "Blockheizkraftwerk","Etagenheizung","Fernheizung","Fussbodenheizung",
  "Kachelofen","Kamin","Nachtspeicher","Ofenheizung","Solarheizung",
  "Waermepumpe","Zentralheizung"
];

const ENERGY_RATINGS = ["A3Plus","A2Plus","APlus","A","B","C","D","E","F","G","H"];

const EFFICIENCY_STANDARDS = [
  "KfwEffizienzhausDenkmal","KfwEffizienzhaus115","KfwEffizienzhaus100",
  "KfwEffizienzhaus85","KfwEffizienzhaus70","KfwEffizienzhaus60",
  "KfwEffizienzhaus55","KfwEffizienzhaus40","KfwEffizienzhaus40Plus",
  "Passivhaus","Nullenergiehaus","Plusenergiehaus"
];

export default function AdvancedFiltersCard({ filters, user }) {
  const [edit, setEdit] = useState(false);

  /* Arrays */
  const [energySources, setES] = useState(filters.energySources || []);
  const [heatingTypes, setHT] = useState(filters.heatingTypes || []);
  const [energyRatings, setER] = useState(filters.energyRatings || []);
  const [effStandards, setEff] = useState(filters.energyEfficiencyStandards || []);

  /* Ranges */
  const [pqmFrom, setPqmFrom] = useState(filters.pricePerSqmRange?.from ?? "");
  const [pqmTo, setPqmTo] = useState(filters.pricePerSqmRange?.to ?? "");
  const [yieldF, setYieldF] = useState(filters.yieldRange?.from ?? "");
  const [yieldT, setYieldT] = useState(filters.yieldRange?.to ?? "");
  const [ecFrom, setEcFrom] = useState(filters.energyConsumptionRange?.from ?? "");
  const [ecTo, setEcTo] = useState(filters.energyConsumptionRange?.to ?? "");
  const [byFrom, setByFrom] = useState(filters.constructionYearRange?.from ?? "");
  const [byTo, setByTo] = useState(filters.constructionYearRange?.to ?? "");

  const toggle = (value, arr, setArr) => {
    setArr(arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value]);
  };

  async function save() {
    const ref = doc(db, "users", user.uid, "searchFilters", "default");

    await updateDoc(ref, {
      filters: {
        ...filters,
        energySources,
        heatingTypes,
        energyRatings,
        energyEfficiencyStandards: effStandards,
        pricePerSqmRange: { from: pqmFrom, to: pqmTo },
        yieldRange: { from: yieldF, to: yieldT },
        energyConsumptionRange: { from: ecFrom, to: ecTo },
        constructionYearRange: { from: byFrom, to: byTo },
      }
    });

    setEdit(false);
  }

  /* ---------------------- FORMATTER ----------------------- */

  const fmtRange = (from, to, unit = "") => {
    if (from && to) return `von ${from}${unit} bis ${to}${unit}`;
    if (from) return `ab ${from}${unit}`;
    if (to) return `bis ${to}${unit}`;
    return "—";
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

      <header className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Erweiterte Filter</h2>
        <button
          onClick={() => setEdit(!edit)}
          className="text-sm px-4 py-1.5 rounded-full border border-gray-300 hover:bg-gray-100"
        >
          {edit ? "Fertig" : "Bearbeiten"}
        </button>
      </header>

      {/* -------------------------- VIEW MODE --------------------------- */}
      {!edit ? (
        <div className="text-gray-800 text-sm space-y-2 leading-relaxed">
          <p><strong>Energieträger:</strong> {energySources.join(", ") || "—"}</p>
          <p><strong>Heizung:</strong> {heatingTypes.join(", ") || "—"}</p>
          <p><strong>Energieklasse:</strong> {energyRatings.join(", ") || "—"}</p>
          <p><strong>KfW-Standard:</strong> {effStandards.join(", ") || "—"}</p>

          <p><strong>Preis pro m²:</strong> {fmtRange(pqmFrom, pqmTo, " €/m²")}</p>
          <p><strong>Rendite:</strong> {fmtRange(yieldF, yieldT, "%")}</p>
          <p><strong>Energieverbrauch:</strong> {fmtRange(ecFrom, ecTo, " kWh/m²*a")}</p>
          <p><strong>Baujahr:</strong> {fmtRange(byFrom, byTo)}</p>
        </div>
      ) : (
        /* --------------------------- EDIT MODE --------------------------- */
        <div className="space-y-6">

          <Section title="Energieträger">
            <ChipGrid options={ENERGY_SOURCES} active={energySources} onToggle={(v) => toggle(v, energySources, setES)} />
          </Section>

          <Section title="Heizung">
            <ChipGrid options={HEATING_TYPES} active={heatingTypes} onToggle={(v) => toggle(v, heatingTypes, setHT)} />
          </Section>

          <Section title="Energieklasse">
            <ChipGrid options={ENERGY_RATINGS} active={energyRatings} onToggle={(v) => toggle(v, energyRatings, setER)} />
          </Section>

          <Section title="Energiestandard">
            <ChipGrid options={EFFICIENCY_STANDARDS} active={effStandards} onToggle={(v) => toggle(v, effStandards, setEff)} />
          </Section>

          <Section title="Preis pro m²">
            <RangeRow from={pqmFrom} to={pqmTo} setFrom={setPqmFrom} setTo={setPqmTo} unit="€/m²" />
          </Section>

          <Section title="Rendite">
            <RangeRow from={yieldF} to={yieldT} setFrom={setYieldF} setTo={setYieldT} unit="%" step="0.1" />
          </Section>

          <Section title="Energieverbrauch">
            <RangeRow from={ecFrom} to={ecTo} setFrom={setEcFrom} setTo={setEcTo} unit="kWh/m²*a" />
          </Section>

          <Section title="Baujahr">
            <RangeRow from={byFrom} to={byTo} setFrom={setByFrom} setTo={setByTo} />
          </Section>
        </div>
      )}

      {edit && (
        <div className="flex justify-end mt-4">
          <button
            onClick={save}
            className="px-4 py-2 rounded-full bg-blue-600 text-white text-xs hover:bg-blue-700"
          >
            Speichern
          </button>
        </div>
      )}
    </section>
  );
}

/* ----------------------------------------------------------- */
/* Helper UI Components */
/* ----------------------------------------------------------- */

function Section({ title, children }) {
  return (
    <div>
      <h3 className="font-semibold text-sm mb-2">{title}</h3>
      {children}
    </div>
  );
}

function ChipGrid({ options, active, onToggle }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isActive = active.includes(opt);
        return (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            className={`px-3 py-1.5 text-xs rounded-full border transition ${
              isActive
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-800 border-gray-300 hover:bg-gray-100"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function RangeRow({ from, to, setFrom, setTo, unit, step = "1" }) {
  return (
    <div className="flex flex-col gap-2 max-w-xs">
      <input
        type="number"
        step={step}
        value={from}
        onChange={(e) => setFrom(e.target.value)}
        className="rounded-lg border px-3 py-2"
        placeholder="von"
      />
      <input
        type="number"
        step={step}
        value={to}
        onChange={(e) => setTo(e.target.value)}
        className="rounded-lg border px-3 py-2"
        placeholder="bis"
      />
      {unit && <span className="text-xs text-gray-500">{unit}</span>}
    </div>
  );
}
