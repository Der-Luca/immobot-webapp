export default function RenderValue({ value }) {
  if (value === null || value === undefined) {
    return <span className="text-gray-400">—</span>;
  }

  // Firestore Timestamp
  if (typeof value?.toDate === "function") {
    return (
      <span>
        {value.toDate().toLocaleString("de-DE")}
      </span>
    );
  }

  // Array
  if (Array.isArray(value)) {
    return (
      <ul className="list-disc ml-5 space-y-1">
        {value.map((v, i) => (
          <li key={i}>
            <RenderValue value={v} />
          </li>
        ))}
      </ul>
    );
  }

  // Object / Map
  if (typeof value === "object") {
    return (
      <div className="space-y-1 ml-4 border-l pl-3">
        {Object.entries(value).map(([k, v]) => (
          <div key={k}>
            <div className="text-xs text-gray-500">{k}</div>
            <RenderValue value={v} />
          </div>
        ))}
      </div>
    );
  }

  // Boolean
  if (typeof value === "boolean") {
    return <span>{value ? "Ja" : "Nein"}</span>;
  }

  // String / Number
  return <span>{String(value)}</span>;
}
