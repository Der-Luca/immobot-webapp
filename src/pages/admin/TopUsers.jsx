import { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, onSnapshot } from "firebase/firestore";

export default function TopUsers() {
  const [top, setTop] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "clickEvents"), (snap) => {
      const map = {};

      snap.docs.forEach((d) => {
        const u = d.data().userId;
        if (!u || u === "unknown") return;
        map[u] = (map[u] || 0) + 1;
      });

      const entries = Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      setTop(entries);
    });

    return () => unsub();
  }, []);

  return (
    <div className="bg-white p-6 rounded-xl shadow">
      <h2 className="text-xl font-semibold mb-4">Top User</h2>

      <ul className="space-y-2 text-sm">
        {top.map(([userId, clicks]) => (
          <li key={userId} className="flex justify-between">
            <span>{userId}</span>
            <span className="font-bold">{clicks} Klicks</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
