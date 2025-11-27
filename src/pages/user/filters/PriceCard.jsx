// src/pages/public/user/filters/PriceCard.jsx
import { useEffect, useMemo, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { useAuth } from "../../../contexts/AuthContext";

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 rounded-full border text-sm ${
        active ? "bg-blue-600 text-white" : "bg-white"
      }`}
    >
      {children}
    </button>
  );
}

// simple Presets – kannst du bei Bedarf anpassen
const RENT_PRESETS = [600, 800, 1000, 1200, 1500, null];
const BUY_PRESETS  = [200000, 300000, 400000, 500000, 750000, 1000000, null];
const SPACE_PRESETS = [40, 60, 80, 100, 120, 150, 200, null];

export default function PriceCard({ filters }) {
  const { user } = useAuth();

  const isRentOnly =
    filters.offerTypes?.includes("Miete") &&
    !filters.offerTypes?.includes("Kauf");

  const pricePresets = useMemo(
    () => (isRentOnly ? RENT_PRESETS : BUY_PRESETS),
    [isRentOnly]
  );

  const [priceTo, setPriceTo] = useState(filters.priceRange?.to ?? null);
  const [spaceTo, setSpaceTo] = useState(filters.propertySpaceRange?.to ?? null);

  // Titel wie in Step3
  const title = isRentOnly
    ? "Was ist dein persönlicher Höchstpreis (Miete)?"
    : "Was ist dein persönlicher Höchstpreis (Kauf)?";

  const fmtEUR = (n) =>
    typeof n === "number" ? `bis ${n.toLocaleString("de-DE")} €` : "beliebig";
  const fmtQM = (n) =>
    typeof n === "number" ? `bis ${n} qm` : "beliebig";

  // Wenn sich Angebot (Kauf/Miete) ändert → Preis auf „beliebig“ resetten
  useEffect(() => {
    setPriceTo(null);

    if (!user?.uid) return;

    const ref = doc(db, "users", user.uid, "searchFilters", "default");
    updateDoc(ref, {
      filters: {
        ...filters,
        priceRange: {
          ...(filters.priceRange || {}),
          to: null,
        },
      },
    }).catch((err) => console.error(err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRentOnly]);

  async function savePrice(to) {
    if (!user?.uid) return;
    const ref = doc(db, "users", user.uid, "searchFilters", "default");
    await updateDoc(ref, {
      filters: {
        ...filters,
        priceRange: {
          ...(filters.priceRange || {}),
          to,
        },
      },
    });
  }

  async function saveSpace(to) {
    if (!user?.uid) return;
    const ref = doc(db, "users", user.uid, "searchFilters", "default");
    await updateDoc(ref, {
      filters: {
        ...filters,
        propertySpaceRange: {
          ...(filters.propertySpaceRange || {}),
          to,
        },
      },
    });
  }

  const selectPrice = (to) => {
    setPriceTo(to);
    savePrice(to);
  };

  const selectSpace = (to) => {
    setSpaceTo(to);
    saveSpace(to);
  };

  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-xs text-gray-500 uppercase tracking-wide">
        Preis & Fläche
      </p>
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>

      {/* Preis-Presets */}
      <div className="flex flex-wrap gap-2 justify-start">
        {pricePresets.map((p, i) => (
          <Chip
            key={i}
            active={priceTo === p}
            onClick={() => selectPrice(p)}
          >
            {fmtEUR(p)}
          </Chip>
        ))}
      </div>

      {/* Fläche */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-center sm:text-left">
          Fläche:
        </label>
        <div className="flex flex-wrap gap-2">
          {SPACE_PRESETS.map((s, i) => (
            <Chip
              key={i}
              active={spaceTo === s}
              onClick={() => selectSpace(s)}
            >
              {fmtQM(s)}
            </Chip>
          ))}
        </div>
      </div>
    </section>
  );
}
