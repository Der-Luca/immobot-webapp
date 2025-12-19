import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { trackAndRedirect } from "./trackAndRedirect";

export default function ResultsList({ offers = [], highlightedId }) {
  const { user } = useAuth();
  const itemRefs = useRef({});

  // 🔥 Auto-Scroll bei Map-Klick
  useEffect(() => {
    if (highlightedId && itemRefs.current[highlightedId]) {
      itemRefs.current[highlightedId].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [highlightedId]);

  return (
    <div className="space-y-4">
      {offers.map((o) => {
        const isActive = o.docId === highlightedId;

        return (
          <div
            key={o.docId}
            ref={(el) => (itemRefs.current[o.docId] = el)}
            className={`
              rounded-2xl p-5 transition-all
              ${
                isActive
                  ? "border-2 border-indigo-500 bg-indigo-50 shadow-xl scale-[1.02]"
                  : "border border-gray-200 bg-white hover:bg-gray-50"
              }
            `}
          >
            <div className="flex justify-between items-center gap-4">
              <div>
                <h3 className="font-bold text-gray-900">
                  {o.title || "Ohne Titel"}
                </h3>
                <p className="text-xs text-gray-500">
                  {o.vendor?.name} · {o.rooms} Zi. · {o.price} €
                </p>
              </div>

              <button
                onClick={() =>
                  trackAndRedirect({
                    redirectId: o.docId, // 🔥 Firestore Document ID
                    geomapOfferId: o.geomapOfferId,
                    redirectUrl: o.redirectUrl,
                    userId: user?.uid || null,
                    source: "web-app",
                  })
                }
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
              >
                Zum Angebot ↗
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
