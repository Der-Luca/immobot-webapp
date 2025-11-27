// src/pages/public/user/filters/ObjectCard.jsx
import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase";

export default function ObjectCard({ filters, user }) {
  const [objectClasses, setObjectClasses] = useState(filters.objectClasses || []);
  const [offerTypes, setOfferTypes] = useState(filters.offerTypes || []);

  const toggle = async (value, arr, setArr, key) => {
    const newArr = arr.includes(value)
      ? arr.filter((v) => v !== value)
      : [...arr, value];

    setArr(newArr);

    // direkt speichern
    await updateDoc(
      doc(db, "users", user.uid, "searchFilters", "default"),
      {
        filters: {
          ...filters,
          [key]: newArr,
        },
      }
    );
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">
        Objektarten & Angebot
      </h2>

      {/* Objektarten */}
      <h3 className="text-sm font-medium text-gray-700 mb-1">Objektarten</h3>
      <div className="flex flex-wrap gap-2 mb-4">
        {["Wohnung", "Haus", "Gewerbe", "Grundstueck"].map((v) => {
          const active = objectClasses.includes(v);
          return (
            <button
              key={v}
              onClick={() =>
                toggle(v, objectClasses, setObjectClasses, "objectClasses")
              }
              className={`px-3 py-1.5 text-xs rounded-full border transition ${
                active
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200"
              }`}
            >
              {v}
            </button>
          );
        })}
      </div>

      {/* Angebot */}
      <h3 className="text-sm font-medium text-gray-700 mb-1">Angebotsarten</h3>
      <div className="flex flex-wrap gap-2">
        {["Kauf", "Miete"].map((v) => {
          const active = offerTypes.includes(v);
          return (
            <button
              key={v}
              onClick={() =>
                toggle(v, offerTypes, setOfferTypes, "offerTypes")
              }
              className={`px-3 py-1.5 text-xs rounded-full border transition ${
                active
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200"
              }`}
            >
              {v}
            </button>
          );
        })}
      </div>
    </section>
  );
}
