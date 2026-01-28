import { useEffect, useRef } from "react";

// ✅ Hier holen wir den Key sicher aus der .env Datei
// Falls du nicht Vite nutzt, sondern Create-React-App, nutze process.env.REACT_APP_MAPTILER_KEY
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;

export default function ResultsMap({ offers = [], onMarkerClick, selectedId }) {
  const mapRef = useRef(null);
  const leafletRef = useRef({ map: null, L: null, markers: {} });
  const onMarkerClickRef = useRef(onMarkerClick);

  // Ref immer aktuell halten
  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick;
  }, [onMarkerClick]);

  useEffect(() => {
    let cancelled = false;

    async function ensureLeaflet() {
      if (!window.L) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);

        await new Promise((resolve) => {
          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.onload = resolve;
          document.body.appendChild(script);
        });
      }
      return window.L;
    }

    async function init() {
      const L = await ensureLeaflet();
      if (cancelled || !mapRef.current) return;

      if (!leafletRef.current.map) {
        leafletRef.current.map = L.map(mapRef.current).setView([51, 10], 6);
        leafletRef.current.L = L;

        // Sicherheitscheck, falls Key in .env vergessen wurde
        if (!MAPTILER_KEY) {
            console.error("MapTiler Key fehlt in der .env Datei!");
        }

        // ✅ KEY WIRD HIER EINGESETZT
        L.tileLayer(
          `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
          { attribution: "&copy; MapTiler" }
        ).addTo(leafletRef.current.map);
      }

      drawMarkers();
    }

    function drawMarkers() {
      const { map, L } = leafletRef.current;
      if (!map || !L) return;

      // alte Marker weg
      Object.values(leafletRef.current.markers).forEach((m) => m.remove());
      leafletRef.current.markers = {};

      const valid = offers.filter(
        (o) =>
          typeof o.latitude === "number" &&
          typeof o.longitude === "number" &&
          o.docId
      );

      valid.forEach((o) => {
        const marker = L.marker([o.latitude, o.longitude])
          .addTo(map)
          .bindPopup(`
            <div style="min-width:180px">
              <strong>${o.title || "Ohne Titel"}</strong><br/>
              ${o.price ? o.price + " €" : ""}<br/>
              ${o.rooms ? o.rooms + " Zimmer" : ""}
            </div>
          `);

        marker.on("click", () => {
          marker.openPopup();
          onMarkerClickRef.current?.(o.docId);
        });

        leafletRef.current.markers[o.docId] = marker;
      });

      if (valid.length > 0) {
        const bounds = L.latLngBounds(
          valid.map((o) => [o.latitude, o.longitude])
        );
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
      }
    }

    init();
    return () => (cancelled = true);
  }, [offers]);

  // Marker hervorheben wenn von der Liste ausgewählt
  useEffect(() => {
    if (!selectedId) return;
    const marker = leafletRef.current.markers[selectedId];
    const map = leafletRef.current.map;
    if (marker && map) {
      map.setView(marker.getLatLng(), 14, { animate: true });
      marker.openPopup();
    }
  }, [selectedId]);

  return (
    <div
      ref={mapRef}
      className="h-full w-full rounded-2xl border border-gray-200"
    />
  );
}