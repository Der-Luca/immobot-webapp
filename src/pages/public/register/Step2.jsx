import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getState } from "./storage/index.js";
import { setCoordinate, setRadiusInKm } from "./storage/step2.js";

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;
const RADIUS_PRESETS = [5, 7.5, 10, 12.5, 15];

export default function Step2() {
  const navigate = useNavigate();
  const initial = useMemo(() => getState(), []);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [radius, setRadius] = useState(initial.radiusInKm ?? 10);

  const mapRef = useRef(null);
  const leafletRef = useRef({ L: null, map: null, marker: null, circle: null });

  // Leaflet initialisieren – ohne Geolocation, ohne Drag, ohne Zoom
  useEffect(() => {
    let cancelled = false;

    const ensureLeaflet = async () => {
      // CSS einbinden
      if (!document.querySelector("link[data-leaflet]")) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.3/dist/leaflet.css";
        link.setAttribute("data-leaflet", "1");
        document.head.appendChild(link);
      }

      // JS laden
      if (!window.L) {
        await new Promise((resolve) => {
          const s = document.createElement("script");
          s.src = "https://unpkg.com/leaflet@1.9.3/dist/leaflet.js";
          s.onload = resolve;
          document.body.appendChild(s);
        });
      }

      return window.L;
    };

    ensureLeaflet().then((L) => {
      if (cancelled || !mapRef.current) return;
      leafletRef.current.L = L;

      const map = L.map(mapRef.current, {
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        touchZoom: false,
      }).setView([52.52, 13.405], 10); // BERLIN FIX

      leafletRef.current.map = map;

      L.tileLayer(
        `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
        { attribution: "&copy; MapTiler" }
      ).addTo(map);

      // Wenn zuvor Koordinaten bereits gespeichert waren
      if (initial.coordinate?.lat && initial.coordinate?.lon) {
        drawMarkerAndCircle(initial.coordinate.lat, initial.coordinate.lon, radius);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Radius aktualisieren
  useEffect(() => {
    setRadiusInKm(radius);
    const { marker } = leafletRef.current;
    if (marker) {
      const p = marker.getLatLng();
      drawMarkerAndCircle(p.lat, p.lng, radius);
    }
  }, [radius]);

  // Autocomplete
  useEffect(() => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const t = setTimeout(async () => {
      const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(
        query.trim()
      )}.json?key=${MAPTILER_KEY}&language=de&country=DE,AT,CH&limit=5`;

      try {
        const res = await fetch(url);
        const data = await res.json();
        const items =
          data.features
            ?.map((f) => ({
              label: f.place_name,
              lat: f.center?.[1],
              lon: f.center?.[0],
            }))
            .filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lon)) || [];

        setSuggestions(items);
      } catch {
        setSuggestions([]);
      }
    }, 200);

    return () => clearTimeout(t);
  }, [query]);

  function onPickSuggestion(item) {
    setQuery(item.label);
    setSuggestions([]);

    setCoordinate({ lat: item.lat, lon: item.lon });
    drawMarkerAndCircle(item.lat, item.lon, radius);
  }

  function drawMarkerAndCircle(lat, lon, rKm) {
    const { L, map, marker, circle } = leafletRef.current;
    if (!L || !map) return;

    if (marker) marker.remove();
    if (circle) circle.remove();

    const m = L.marker([lat, lon]).addTo(map);
    const c = L.circle([lat, lon], {
      radius: (rKm || 0) * 1000,
      color: "#007bff",
      fillOpacity: 0.25,
    }).addTo(map);

    leafletRef.current.marker = m;
    leafletRef.current.circle = c;

    map.fitBounds(c.getBounds(), { padding: [40, 40] });
  }

  return (
    <div className="space-y-8 rounded-2xl border p-6 w-2/3 mx-auto mt-10">
      <p className="text-center text-sm text-gray-500">Schritt 2 von 5</p>

      <h2 className="text-xl font-semibold text-center">
        Wo sollen wir etwas für dich finden?
      </h2>

      {/* Adresse */}
      <div className="mx-auto max-w-md relative">
        <label className="block text-sm font-medium mb-1 text-center">
          Ort/Stadt eingeben
        </label>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="z. B. Freiburg im Breisgau"
          className="w-full rounded-lg border px-3 py-2"
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
        />

        {suggestions.length > 0 && (
          <div className="absolute left-0 right-0 mt-1 rounded-lg border bg-white shadow z-50">
            {suggestions.map((s, i) => (
              <div
                key={i}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => onPickSuggestion(s)}
              >
                {s.label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Radius */}
      <div className="mx-auto max-w-md">
        <label className="block text-sm font-medium mb-2 text-center">
          Radius auswählen:
        </label>

        <div className="flex justify-center flex-wrap gap-2">
          {RADIUS_PRESETS.map((km) => (
            <button
              key={km}
              type="button"
              onClick={() => setRadius(km)}
              className={`px-4 py-2 rounded-full border text-sm transition
                ${
                  Number(radius) === km
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-800 border-gray-300 hover:bg-gray-100"
                }`}
            >
              {km} km
            </button>
          ))}
        </div>
      </div>

      {/* Karte — locked */}
      <div
        ref={mapRef}
        style={{
          height: 400,
          borderRadius: 12,
          border: "1px solid #ccc",
          position: "relative",
          pointerEvents: "none", // WICHTIG → keine Interaktion möglich
        }}
      />

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="px-6 py-3 rounded-xl bg-gray-200"
          onClick={() => navigate("/register/step1")}
        >
          &lt; zurück
        </button>

        <button
          type="button"
          className="px-6 py-3 rounded-xl bg-blue-900 text-white"
          onClick={() => navigate("/register/step3")}
        >
          Schritt 3 &gt;
        </button>
      </div>
    </div>
  );
}
