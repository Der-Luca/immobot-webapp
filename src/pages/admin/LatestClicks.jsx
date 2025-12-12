import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";

export default function LatestClicks() {
  const [clicks, setClicks] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, "clickEvents"),
      orderBy("timestamp", "desc"),
      limit(20)
    );

    return onSnapshot(q, (snap) => {
      setClicks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-2xl font-semibold mb-6">Neueste Klicks</h2>

      <table className="w-full text-left text-sm">
        <thead className="border-b text-gray-600">
          <tr>
            <th className="py-2">User</th>
            <th>Offer ID</th>
            <th>Redirect ID</th>
            <th>Zeitpunkt</th>
          </tr>
        </thead>
        <tbody>
          {clicks.map((c) => (
            <tr key={c.id} className="border-b hover:bg-gray-50">
              <td className="py-2">{c.userId}</td>
              <td className="truncate">{c.geomapOfferId}</td>
              <td>{c.redirectId}</td>
              <td>
                {c.timestamp?.toDate?.().toLocaleString("de-DE") ??
                  "Unbekannt"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
