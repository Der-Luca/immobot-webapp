import { useEffect, useRef } from "react";

const MAPTILER_KEY = "VUVj9lGbHQAdYVsF04k8";

export default function ResultsMap({ offers = [], onMarkerClick }) {
  const mapRef = useRef(null);
  const leafletRef = useRef({ map: null, L: null, markers: [] });

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

        // ✅ GLEICHES MAP-DESIGN WIE BEI DIR
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
      leafletRef.current.markers.forEach((m) => m.remove());
      leafletRef.current.markers = [];

      const valid = offers.filter(
        (o) =>
          typeof o.latitude === "number" &&
          typeof o.longitude === "number" &&
          o.docId
      );

      valid.forEach((o) => {
        const marker = L.marker([o.latitude, o.longitude])
          .addTo(map)
          // ✅ Sprechblase wieder da
          .bindPopup(`
            <div style="min-width:180px">
              <strong>${o.title || "Ohne Titel"}</strong><br/>
              ${o.price ? o.price + " €" : ""}<br/>
              ${o.rooms ? o.rooms + " Zimmer" : ""}
            </div>
          `);

        marker.on("click", () => {
          marker.openPopup();          // 👈 visuelles Feedback
          onMarkerClick?.(o.docId);    // 👈 Liste links highlighten
        });

        leafletRef.current.markers.push(marker);
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
  }, [offers, onMarkerClick]);

  return (
    <div
      ref={mapRef}
      className="h-full w-full rounded-2xl border border-gray-200"
    />
  );
}
