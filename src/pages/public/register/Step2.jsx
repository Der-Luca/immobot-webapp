import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getState } from "./storage/index.js";
import { setCoordinate, setRadiusInKm } from "./storage/step2.js";

const MAPTILER_KEY = "VUVj9lGbHQAdYVsF04k8";
const RADIUS_PRESETS = [5, 7.5, 10, 12.5, 15];

export default function Step2() {
  const navigate = useNavigate();
  const initial = useMemo(() => getState(), []);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [radius, setRadius] = useState(initial.radiusInKm ?? 10);
  const mapRef = useRef(null);
  const leafletRef = useRef({ L: null, map: null, marker: null, circle: null });

  // Leaflet + Karte initialisieren
  useEffect(() => {
    let cancelled = false;

    const ensureLeaflet = async () => {
      if (!document.querySelector('link[data-leaflet]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.3/dist/leaflet.css";
        link.setAttribute("data-leaflet", "1");
        document.head.appendChild(link);
      }
      if (!window.L) {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://unpkg.com/leaflet@1.9.3/dist/leaflet.js";
          s.onload = resolve;
          s.onerror = reject;
          document.body.appendChild(s);
        });
      }
      return window.L;
    };

    ensureLeaflet().then((L) => {
      if (cancelled || !mapRef.current) return;
      leafletRef.current.L = L;

      const startLat = initial.coordinate?.lat ?? 52.52;
      const startLon = initial.coordinate?.lon ?? 13.405;

      const map = L.map(mapRef.current).setView(
        [startLat, startLon],
        initial.coordinate ? 12 : 10
      );
      leafletRef.current.map = map;

      L.tileLayer(
        `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
        { attribution: "&copy; MapTiler" }
      ).addTo(map);

      if (initial.coordinate?.lat != null && initial.coordinate?.lon != null) {
        drawMarkerAndCircle(initial.coordinate.lat, initial.coordinate.lon, radius);
      }

      // Klick auf Karte setzt coordinate
      map.on("click", (e) => {
        const { lat, lng } = e.latlng;
        setCoordinate({ lat, lon: lng });
        drawMarkerAndCircle(lat, lng, radius);
      });

      // 🔔 Geolocation-Prompt (nur über HTTPS/localhost zuverlässig)
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            setCoordinate({ lat, lon });
            drawMarkerAndCircle(lat, lon, radius);
          },
          () => {
            // Ignorieren, wenn abgelehnt/fehlerhaft – wir bleiben bei Startposition
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
        );
      }
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Radius speichern + Kreis aktualisieren
  useEffect(() => {
    setRadiusInKm(radius);
    const { marker } = leafletRef.current;
    if (marker) {
      const p = marker.getLatLng();
      drawMarkerAndCircle(p.lat, p.lng, radius);
    }
  }, [radius]);

  // Autocomplete (nur DE/AT/CH)
  useEffect(() => {
    const run = async () => {
      const q = query.trim();
      if (q.length < 3) return setSuggestions([]);
      const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(
        q
      )}.json?key=${MAPTILER_KEY}&language=de&country=DE,AT,CH&limit=5`;
      try {
        const res = await fetch(url);
        const data = await res.json();
        const items =
          (data.features || [])
            .map((f) => ({
              label: f.place_name,
              lat: f.center?.[1],
              lon: f.center?.[0],
            }))
            .filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lon)) || [];
        setSuggestions(items);
      } catch {
        setSuggestions([]);
      }
    };
    const t = setTimeout(run, 200);
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
      fillOpacity: 0.2,
    }).addTo(map);

    leafletRef.current.marker = m;
    leafletRef.current.circle = c;

    map.fitBounds(c.getBounds(), { padding: [30, 30] });
  }

  return (
    <div className="space-y-6 rounded-2xl border p-6">
      <p className="text-center text-sm text-gray-500">Schritt 2 von 5</p>
      <h2 className="text-xl font-semibold text-center">
        Wo sollen wir etwas für dich finden?
      </h2>

      {/* Adresse */}
     {/* Adresse */}
<div className="mx-auto max-w-md relative">
  <label className="block text-sm font-medium mb-1 text-center">Ort/Stadt eingeben:</label>
  <input
    value={query}
    onChange={(e) => setQuery(e.target.value)}
    placeholder="z. B. Freiburg im Breisgau"
    className="w-full rounded-lg border px-3 py-2"
    onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
  />
  {suggestions.length > 0 && (
    <div
      className="absolute left-0 right-0 mt-1 rounded-lg border bg-white shadow"
      style={{ zIndex: 9999 }}   // ⬅️ hoch genug über Leaflet
    >
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
        <label className="block text-sm font-medium mb-2 text-center">Radius (in km):</label>
        <div className="flex flex-wrap gap-2 items-center">
          {RADIUS_PRESETS.map((km) => (
            <button
              key={km}
              type="button"
              onClick={() => setRadius(km)}
              className={`px-3 py-2 rounded-full border text-sm ${
                Number(radius) === km ? "bg-blue-600 text-white" : "bg-white"
              }`}
            >
              {km} km
            </button>
          ))}
        </div>
      </div>

     {/* Karte */}
<div
  ref={mapRef}
  style={{
    height: 320,
    borderRadius: 12,
    border: "1px solid #ccc",
    position: "relative",
    zIndex: 0,               
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
