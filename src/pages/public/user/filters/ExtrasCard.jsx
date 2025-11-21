// src/pages/public/user/filters/ExtrasCard.jsx
import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../../firebase";

export default function ExtrasCard({ filters, user }) {
  const [edit, setEdit] = useState(false);

  const [bathroomWithWindow, setBathroomWithWindow] = useState(filters.bathroomWithWindow || false);
  const [elevator, setElevator] = useState(filters.elevator || false);
  const [balcony, setBalcony] = useState(filters.balconyTerrace || false);

  async function save() {
    await updateDoc(
      doc(db, "users", user.uid, "searchFilters", "default"),
      {
        filters: {
          ...filters,
          bathroomWithWindow,
          elevator,
          balconyTerrace: balcony,
        }
      }
    );
    setEdit(false);
  }

  return (
    <div style={{ background: "#f5f7fa", padding: 20, borderRadius: 10 }}>
      <h2>Ausstattung & Extras</h2>

      {!edit ? (
        <>
          <p><strong>Fensterbad:</strong> {bathroomWithWindow ? "Ja" : "Nein"}</p>
          <p><strong>Aufzug:</strong> {elevator ? "Ja" : "Nein"}</p>
          <p><strong>Balkon/Terrasse:</strong> {balcony ? "Ja" : "Nein"}</p>

          <button onClick={() => setEdit(true)}>Bearbeiten</button>
        </>
      ) : (
        <>
          <label>
            <input type="checkbox" checked={bathroomWithWindow} onChange={(e) => setBathroomWithWindow(e.target.checked)} />
            Fensterbad
          </label>

          <label>
            <input type="checkbox" checked={elevator} onChange={(e) => setElevator(e.target.checked)} />
            Aufzug
          </label>

          <label>
            <input type="checkbox" checked={balcony} onChange={(e) => setBalcony(e.target.checked)} />
            Balkon / Terrasse
          </label>

          <div style={{ marginTop: 10 }}>
            <button onClick={save}>Speichern</button>
            <button onClick={() => setEdit(false)}>Abbrechen</button>
          </div>
        </>
      )}
    </div>
  );
}
