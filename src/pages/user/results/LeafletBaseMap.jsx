// components/maps/LeafletBaseMap.jsx
import { useEffect, useRef } from "react";

const MAPTILER_KEY = "VUVj9lGbHQAdYVsF04k8";

export default function LeafletBaseMap({
  center,
  zoom = 11,
  markers = [],
  circles = [],
  className = "h-96 w-full rounded-xl border"
}) {
  const mapRef = useRef(null);
  const leafletRef = useRef({ map: null, L: null });

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
      const L = await ensureLeaflet();
      if (cancelled || !mapRef.current) return;

      if (!leafletRef.current.map) {
        const map = L.map(mapRef.current).setView(center, zoom);
        leafletRef.current.map = map;
        leafletRef.current.L = L;

        L.tileLayer(
          `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
          { attribution: "&copy; MapTiler" }
        ).addTo(map);
      }

      redraw();
    }

    function redraw() {
      const { map, L } = leafletRef.current;
      if (!map || !L) return;

      map.eachLayer((layer) => {
        if (layer instanceof L.Marker || layer instanceof L.Circle) {
          map.removeLayer(layer);
        }
      });

      markers.forEach((m) => {
        L.marker([m.lat, m.lng]).addTo(map);
      });

      circles.forEach((c) => {
        L.circle([c.lat, c.lng], {
          radius: c.radiusKm * 1000,
          color: "#2563eb",
          fillOpacity: 0.15,
        }).addTo(map);
      });
    }

    init();
    return () => { cancelled = true; };
  }, [center, zoom, markers, circles]);

  return <div ref={mapRef} className={className} />;
}
