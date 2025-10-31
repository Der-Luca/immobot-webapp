import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getState } from "./storage/index.js";
import { getPricePresets, getSpacePresets, setPriceUpper, setSpaceUpper } from "./storage/step3.js";

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 rounded-full border text-sm ${active ? "bg-blue-600 text-white" : "bg-white"}`}
    >
      {children}
    </button>
  );
}

function Step3() {
  const navigate = useNavigate();
  const initial = useMemo(() => getState(), []);
  const pricePresets = useMemo(() => getPricePresets(), []);
  const spacePresets = useMemo(() => getSpacePresets(), []);
  const [priceTo, setPriceTo] = useState(initial.priceRange?.to ?? null);
  const [spaceTo, setSpaceTo] = useState(initial.propertySpaceRange?.to ?? null);

  const selectPrice = (to) => { setPriceTo(to); setPriceUpper(to); };
  const selectSpace = (to) => { setSpaceTo(to); setSpaceUpper(to); };

  const fmtEUR = (n) => (typeof n === "number" ? `bis ${n.toLocaleString("de-DE")} €` : "beliebig");
  const fmtQM  = (n) => (typeof n === "number" ? `bis ${n} qm` : "beliebig");

  const isRentOnly = initial.offerTypes?.includes("Miete") && !initial.offerTypes?.includes("Kauf");
  const title = isRentOnly ? "Was ist dein persönlicher Höchstpreis (Miete)?" :
                             "Was ist dein persönlicher Höchstpreis (Kauf)?";

  return (
    <div className="space-y-8 rounded-2xl border p-6 max-w-xl mx-auto">
      <p className="text-center text-sm text-gray-500">Schritt 3 von 3</p>
      <h2 className="text-xl font-semibold text-center">{title}</h2>

      <div className="flex flex-wrap gap-2 justify-center">
        {pricePresets.map((p, i) => (
          <Chip key={i} active={priceTo === p} onClick={() => selectPrice(p)}>
            {fmtEUR(p)}
          </Chip>
        ))}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-center">Fläche:</label>
        <div className="flex flex-wrap gap-2 justify-center">
          {spacePresets.map((s, i) => (
            <Chip key={i} active={spaceTo === s} onClick={() => selectSpace(s)}>
              {fmtQM(s)}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button type="button" className="px-6 py-3 rounded-xl bg-gray-200" onClick={() => navigate("/register/step2")}>
          &lt; zurück
        </button>
        <button type="button" className="px-6 py-3 rounded-xl bg-blue-900 text-white" onClick={() => navigate("/register/step4")}>
          Weiter &gt;
        </button>
      </div>
    </div>
  );
}

export default Step3;   // <— wichtig
