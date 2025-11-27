import { useEffect, useRef, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { useAuth } from "../../../contexts/AuthContext";

const MAPTILER_KEY = "VUVj9lGbHQAdYVsF04k8";

export default function LocationCard({ filters }) {
  const { user } = useAuth();

  const [editMode, setEditMode] = useState(false);

  const [address, setAddress] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  const [lat, setLat] = useState(filters.coordinate?.lat ?? 52.52);
  const [lon, setLon] = useState(filters.coordinate?.lon ?? 13.405);
  const [radius, setRadius] = useState(filters.radiusInKm ?? 10);

  const mapRef = useRef(null);
  const leafletRef = useRef({ L: null, map: null, marker: null, circle: null });

  /* ---------------------------------------------------------- */
  /* AUTOCOMPLETE – Adresse suchen                               */
  /* ---------------------------------------------------------- */

  async function searchAddress(q) {
    if (!q || q.length < 3) {
      setSuggestions([]);
      return;
    }

    const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(
      q
    )}.json?key=${MAPTILER_KEY}&language=de`;

    const res = await fetch(url);
    const data = await res.json();

    setSuggestions(
      data.features?.map((f) => ({
        label: f.place_name,
        lat: f.center[1],
        lon: f.center[0],
      })) ?? []
    );
  }

  function selectAddress(s) {
    setAddress(s.label);
    setLat(s.lat);
    setLon(s.lon);
    setSuggestions([]);
  }

  /* ---------------------------------------------------------- */
  /* LEAFLET MAP                                                 */
  /* ---------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    async function ensureLeaflet() {
      if (!document.querySelector('link[data-leaflet]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.3/dist/leaflet.css";
        link.setAttribute("data-leaflet", "1");
        document.head.appendChild(link);
      }
      if (!window.L) {
        await new Promise((resolve) => {
          const s = document.createElement("script");
          s.src = "https://unpkg.com/leaflet@1.9.3/dist/leaflet.js";
          s.onload = resolve;
          document.body.appendChild(s);
        });
      }
      return window.L;
    }

    async function init() {
      if (!mapRef.current) return;
      const L = await ensureLeaflet();
      if (cancelled) return;
      leafletRef.current.L = L;

      if (!leafletRef.current.map) {
        const map = L.map(mapRef.current).setView([lat, lon], 11);
        leafletRef.current.map = map;

        L.tileLayer(
          `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
          { attribution: "&copy; MapTiler" }
        ).addTo(map);
      }

      draw(lat, lon, radius);
    }

    function draw(cLat, cLon, rKm) {
      const { L, map, marker, circle } = leafletRef.current;
      if (!L || !map) return;

      if (marker) marker.remove();
      if (circle) circle.remove();

      const m = L.marker([cLat, cLon]).addTo(map);
      const c = L.circle([cLat, cLon], {
        radius: rKm * 1000,
        color: "#1d4ed8",
        fillOpacity: 0.2,
      }).addTo(map);

      leafletRef.current.marker = m;
      leafletRef.current.circle = c;

      map.fitBounds(c.getBounds(), { padding: [20, 20] });
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [lat, lon, radius]);

  /* ---------------------------------------------------------- */
  /* FIRESTORE SPEICHERN                                        */
  /* ---------------------------------------------------------- */

  async function save() {
    if (!user?.uid) return;
    try {
      const ref = doc(db, "users", user.uid, "searchFilters", "default");
      await updateDoc(ref, {
        filters: {
          ...filters,
          coordinate: { lat, lon },
          radiusInKm: radius,
        },
      });
      setEditMode(false);
    } catch (err) {
      console.error(err);
    }
  }

  /* ---------------------------------------------------------- */

  return (
    <section className="mb-6 rounded-2xl border border-gray-200 bg-slate-50 p-5">
      <header className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Standort & Radius</h2>
        <button
          onClick={() => setEditMode((v) => !v)}
          className="rounded-full border border-gray-900 px-3 py-1 text-xs font-medium"
        >
          {editMode ? "Fertig" : "Bearbeiten"}
        </button>
      </header>

      {/* Adresseingabe */}
      {editMode && (
        <div className="relative mb-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Adresse eingeben
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              searchAddress(e.target.value);
            }}
            placeholder="z.B. Berlin Alexanderplatz"
            className="w-full rounded-xl border px-3 py-2 text-sm"
          />

          {/* Vorschläge */}
          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 rounded-xl border bg-white shadow z-10 max-h-40 overflow-auto">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => selectAddress(s)}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Radius Buttons */}
      {editMode && (
        <div className="mb-3">
          <p className="text-xs text-gray-600 mb-1">Radius</p>
          <div className="flex flex-wrap gap-2">
            {[5, 7.5, 10, 12.5, 15, 20].map((km) => (
              <button
                key={km}
                onClick={() => setRadius(km)}
                className={`px-3 py-1 rounded-full text-xs border ${
                  radius === km
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-800"
                }`}
              >
                {km} km
              </button>
            ))}
          </div>
        </div>
      )}

      {/* MAP */}
      <div
        ref={mapRef}
        className="h-72 w-full rounded-xl border bg-gray-200"
      />

      {/* Speichern */}
      {editMode && (
        <div className="flex justify-end mt-4">
          <button
            onClick={save}
            className="px-4 py-2 rounded-full bg-gray-900 text-white text-xs"
          >
            Speichern
          </button>
        </div>
      )}
    </section>
  );
}
