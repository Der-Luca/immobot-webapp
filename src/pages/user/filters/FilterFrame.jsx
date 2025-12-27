// src/pages/user/filters/FilterFrame.jsx
export default function FilterFrame({ isEditing, header, children }) {
  return (
    <section
      className={`
        relative h-full rounded-[20px] p-6 md:p-8 transition-all duration-200
        ${
          isEditing
            ? "bg-white ring-4 ring-blue-50 shadow-md"
            : "bg-gray-50 border border-gray-200 shadow-sm"
        }
      `}
    >
      {/* Header immer klickbar */}
      <div className="relative z-20 mb-8">{header}</div>

      {/* Body */}
      <div className="relative">
        <div className={isEditing ? "" : "opacity-75"}>{children}</div>

        {/* Schleier nur über Body */}
        {!isEditing && (
          <div
            className="
              absolute inset-0 rounded-xl
              bg-white/40 backdrop-blur-[1px]
              pointer-events-none
            "
            aria-hidden="true"
          />
        )}
      </div>
    </section>
  );
}
