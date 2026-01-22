import { useEffect, useRef, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { useAuth } from "../../../contexts/AuthContext";
import FilterFrame from "./FilterFrame";


const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;

const RADIUS_OPTIONS = [5, 7.5, 10, 12.5, 15];

export default function LocationCard({ filters }) {
  const { user } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  

  const [address, setAddress] = useState(filters?.address || "");
  const [suggestions, setSuggestions] = useState([]);

  const [lat, setLat] = useState(filters?.coordinate?.lat ?? 52.52);
  const [lon, setLon] = useState(filters?.coordinate?.lon ?? 13.405);
  const [radius, setRadius] = useState(filters?.radiusInKm ?? 10);

  const mapRef = useRef(null);
  const leafletRef = useRef({ map: null, marker: null, circle: null });

  /* ---------------- Sync ---------------- */

  useEffect(() => {
    if (!filters) return;
    if (filters.coordinate?.lat != null) setLat(filters.coordinate.lat);
    if (filters.coordinate?.lon != null) setLon(filters.coordinate.lon);
    if (filters.radiusInKm != null) setRadius(filters.radiusInKm);
    

    if (filters.address) setAddress(filters.address);
  }, [filters]);

  const enterEdit = () => setIsEditing(true);

  const finishEdit = async () => {
    if (user?.uid) {
      await updateDoc(doc(db, "users", user.uid), {
        lastSearch: {
          ...(filters || {}),
          coordinate: { lat, lon },
          radiusInKm: radius,
          address: address, 
        },
      });
    }
    setIsEditing(false);
  };



  async function searchAddress(q) {
    if (!q || q.length < 3) {
      setSuggestions([]);
      return;
    }

    // ✅ Filter auf DE, AT, CH setzen (&country=de,at,ch)
    try {
      const res = await fetch(
        `https://api.maptiler.com/geocoding/${encodeURIComponent(
          q
        )}.json?key=${MAPTILER_KEY}&language=de&country=de,at,ch`
      );
      const data = await res.json();

      setSuggestions(
        data.features?.map((f) => ({
          label: f.place_name,
          lat: f.center[1],
          lon: f.center[0],
        })) ?? []
      );
    } catch (error) {
      console.error("Fehler bei der Adresssuche:", error);
    }
  }

  function selectAddress(s) {
    setAddress(s.label);
    setLat(s.lat);
    setLon(s.lon);
    setSuggestions([]); // Dropdown schließen
  }

  /* ---------------- Map ---------------- */

  useEffect(() => {
    let cancelled = false;

    async function loadLeaflet() {
      if (!window.L) {
        await new Promise((resolve) => {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.3/dist/leaflet.css";
          document.head.appendChild(link);

          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.3/dist/leaflet.js";
          script.onload = resolve;
          document.body.appendChild(script);
        });
      }
      return window.L;
    }

    async function init() {
      if (!mapRef.current) return;
      const L = await loadLeaflet();
      if (cancelled) return;

      if (!leafletRef.current.map) {
        leafletRef.current.map = L.map(mapRef.current, {
          zoomControl: false,
        }).setView([lat, lon], 11);

        L.tileLayer(
          `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
          { attribution: '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a>' }
        ).addTo(leafletRef.current.map);
      } else {
        // Karte zentrieren bei Änderung
        leafletRef.current.map.setView([lat, lon]);
      }

      leafletRef.current.marker?.remove();
      leafletRef.current.circle?.remove();

      leafletRef.current.marker = L.marker([lat, lon]).addTo(
        leafletRef.current.map
      );
      leafletRef.current.circle = L.circle([lat, lon], {
        radius: radius * 1000,
        color: "#2563eb",
        fillOpacity: 0.2,
      }).addTo(leafletRef.current.map);

      leafletRef.current.map.fitBounds(
        leafletRef.current.circle.getBounds(),
        { padding: [20, 20] }
      );
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [lat, lon, radius]);

  /* ---------------- Chip Style ---------------- */

  const chipClass = (active) => {
    const base =
      "px-4 py-2 text-sm rounded-full border transition-all duration-200";
    if (active) {
      return isEditing
        ? `${base} bg-blue-600 border-blue-600 text-white hover:bg-blue-700`
        : `${base} bg-gray-200 border-gray-200 text-gray-700`;
    }
    return isEditing
      ? `${base} bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400`
      : `${base} bg-white border-gray-200 text-gray-500`;
  };

  /* ---------------- Render ---------------- */

  return (
    <FilterFrame
      isEditing={isEditing}
      header={
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              Standort & Radius
            </h2>
            {/* Kleine Anzeige der Adresse auch wenn nicht im Edit-Modus */}
            {!isEditing && address && (
               <p className="text-sm text-gray-500 mt-1 truncate max-w-[200px]">
                 {address}
               </p>
            )}

            {!isEditing && (
              <button
                type="button"
                onClick={enterEdit}
                className="
                  inline-flex items-center
                  mt-2
                  px-3 py-1.5
                  text-sm font-semibold
                  rounded-full
                  bg-gray-200 text-gray-800
                  hover:bg-gray-300
                  transition
                "
              >
                Bearbeiten
              </button>
            )}
          </div>

          {isEditing && (
            <button
              type="button"
              onClick={finishEdit}
              className="
                shrink-0
                px-5 py-2
                text-sm font-semibold
                rounded-xl
                bg-blue-600 text-white
                hover:bg-blue-700
                transition
              "
            >
              Fertig
            </button>
          )}
        </div>
      }
    >
      {/* Body */}
      <div className="relative">
        <div className="space-y-8">
          {/* Edit-Felder */}
          {isEditing && (
            <div className="space-y-4 relative">
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Adresse suchen 
                </label>
                <input
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    searchAddress(e.target.value);
                  }}
                  className="w-full rounded-xl border-gray-300 bg-gray-50 px-4 py-3 text-sm"
                  placeholder="z.B. Berlin Alexanderplatz"
                />

    
                {suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 rounded-xl border bg-white shadow-2xl z-[1000] max-h-60 overflow-auto">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => selectAddress(s)}
                        className="block w-full text-left px-4 py-3 text-sm hover:bg-blue-50 border-b last:border-0 text-gray-700"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-base font-bold text-gray-800 mb-4">
                  Radius
                </h3>
                <div className="flex flex-wrap gap-3">
                  {RADIUS_OPTIONS.map((km) => (
                    <button
                      key={km}
                      type="button"
                      disabled={!isEditing}
                      onClick={() => setRadius(km)}
                      className={chipClass(radius === km)}
                    >
                      {km} km
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Map */}
     
          <div className="h-64 w-full rounded-2xl border border-gray-200 overflow-hidden relative z-0">
            <div ref={mapRef} className="h-full w-full bg-gray-100" />
          </div>
        </div>

        {/* Click-anywhere Overlay */}
        {!isEditing && (
          <button
            type="button"
            onClick={enterEdit}
            className="absolute inset-0 rounded-xl cursor-pointer bg-transparent z-10"
            aria-label="Bearbeiten aktivieren"
          />
        )}
      </div>
    </FilterFrame>
  );
}