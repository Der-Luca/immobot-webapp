// src/pages/public/user/filters/ObjectCard.jsx
import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../../firebase";

export default function ObjectCard({ filters, user }) {
  const [edit, setEdit] = useState(false);

  const [objectClasses, setObjectClasses] = useState(filters.objectClasses || []);
  const [offerTypes, setOfferTypes] = useState(filters.offerTypes || []);

  const toggle = (value, arr, setArr) => {
    if (arr.includes(value)) {
      setArr(arr.filter((v) => v !== value));
    } else {
      setArr([...arr, value]);
    }
  };

  async function save() {
    await updateDoc(
      doc(db, "users", user.uid, "searchFilters", "default"),
      {
        filters: {
          ...filters,
          objectClasses,
          offerTypes,
        }
      }
    );
    setEdit(false);
  }

  return (
    <div style={{ background: "#f5f7fa", padding: 20, borderRadius: 10 }}>
      <h2>Objektarten & Angebot</h2>

      {!edit ? (
        <>
          <p><strong>Objektarten:</strong> {objectClasses.join(", ")}</p>
          <p><strong>Angebotsarten:</strong> {offerTypes.join(", ")}</p>
          <button onClick={() => setEdit(true)}>Bearbeiten</button>
        </>
      ) : (
        <>
          <label>Objektarten</label>
          <div style={{ display: "flex", gap: 10 }}>
            {["Wohnung", "Haus", "Gewerbe", "Grundstueck"].map((v) => (
              <button
                key={v}
                onClick={() => toggle(v, objectClasses, setObjectClasses)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  background: objectClasses.includes(v) ? "#3793ff" : "#ddd",
                  color: objectClasses.includes(v) ? "#fff" : "#000",
                }}
              >
                {v}
              </button>
            ))}
          </div>

          <label style={{ marginTop: 10 }}>Angebot</label>
          <div style={{ display: "flex", gap: 10 }}>
            {["Kauf", "Miete"].map((v) => (
              <button
                key={v}
                onClick={() => toggle(v, offerTypes, setOfferTypes)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  background: offerTypes.includes(v) ? "#3793ff" : "#ddd",
                  color: offerTypes.includes(v) ? "#fff" : "#000",
                }}
              >
                {v}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 10 }}>
            <button onClick={save}>Speichern</button>
            <button onClick={() => setEdit(false)}>Abbrechen</button>
          </div>
        </>
      )}
    </div>
  );
}
