// src/pages/public/user/filters/PriceCard.jsx
import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../../firebase";

export default function PriceCard({ filters, user }) {
  const [edit, setEdit] = useState(false);

  const [minPrice, setMinPrice] = useState(filters.priceMin || 0);
  const [maxPrice, setMaxPrice] = useState(filters.priceMax || 0);

  const [minSize, setMinSize] = useState(filters.sizeMin || 0);
  const [maxSize, setMaxSize] = useState(filters.sizeMax || 0);

  async function save() {
    await updateDoc(
      doc(db, "users", user.uid, "searchFilters", "default"),
      {
        filters: {
          ...filters,
          priceMin: minPrice,
          priceMax: maxPrice,
          sizeMin: minSize,
          sizeMax: maxSize,
        }
      }
    );
    setEdit(false);
  }

  return (
    <div style={{ background: "#f5f7fa", padding: 20, borderRadius: 10 }}>
      <h2>Preis & Fläche</h2>

      {!edit ? (
        <>
          <p><strong>Preis:</strong> {minPrice}€ – {maxPrice}€</p>
          <p><strong>Fläche:</strong> {minSize}m² – {maxSize}m²</p>
          <button onClick={() => setEdit(true)}>Bearbeiten</button>
        </>
      ) : (
        <>
          <label>Preis von:</label>
          <input value={minPrice} onChange={(e) => setMinPrice(Number(e.target.value))} />
          <label>Preis bis:</label>
          <input value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} />

          <label>Fläche von:</label>
          <input value={minSize} onChange={(e) => setMinSize(Number(e.target.value))} />
          <label>Fläche bis:</label>
          <input value={maxSize} onChange={(e) => setMaxSize(Number(e.target.value))} />

          <div style={{ marginTop: 10 }}>
            <button onClick={save}>Speichern</button>
            <button onClick={() => setEdit(false)}>Abbrechen</button>
          </div>
        </>
      )}
    </div>
  );
}
