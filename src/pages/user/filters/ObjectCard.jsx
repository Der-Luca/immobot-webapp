// src/pages/public/user/filters/ObjectCard.jsx
import { useEffect, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase"; // Pfad ggf. anpassen

export default function ObjectCard({ filters, user }) {
  const [objectClasses, setObjectClasses] = useState(filters.objectClasses || []);
  const [offerTypes, setOfferTypes] = useState(filters.offerTypes || []);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setObjectClasses(filters.objectClasses || []);
    setOfferTypes(filters.offerTypes || []);
  }, [filters]);

  const toggle = async (value, arr, setArr, key) => {
    if (!isEditing) return;

    const newArr = arr.includes(value)
      ? arr.filter((v) => v !== value)
      : [...arr, value];

    setArr(newArr);

    await updateDoc(doc(db, "users", user.uid), {
      lastSearch: {
        ...filters,
        [key]: newArr,
      },
    });
  };

  const getChipStyle = (active) => {
    const baseStyle = "px-4 py-2 text-sm rounded-full font-medium transition-all duration-200 ease-in-out flex items-center gap-2 border";
    
    if (active) {
      return isEditing
        ? `${baseStyle} bg-blue-600 border-blue-600 text-white shadow-md hover:bg-blue-700 hover:shadow-lg cursor-pointer hover:-translate-y-0.5`
        : `${baseStyle} bg-blue-600 border-blue-600 text-white opacity-90 cursor-default`;
    } else {
      return isEditing
        ? `${baseStyle} bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 cursor-pointer hover:-translate-y-0.5`
        : `${baseStyle} bg-gray-100 text-gray-500 border-transparent cursor-default`;
    }
  };

  return (
    <section className={`rounded-[20px] border bg-white p-6 md:p-8 shadow-sm transition-all duration-300 relative overflow-hidden ${isEditing ? "border-blue-200 shadow-md ring-4 ring-blue-50" : "border-gray-200"}`}>
      
      {/* 🔥 WICHTIG: 'relative z-20' sorgt dafür, dass der Header (und der Button)
         ÜBER dem Overlay liegen und klickbar bleiben.
      */}
      <div className="flex items-center justify-between mb-8 relative z-20">
        <div>
           <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            Objekt & Angebot
          </h2>
          {!isEditing && (
            <p className="text-sm text-gray-500 mt-1">
              Klicke auf "Bearbeiten", um zu ändern.
            </p>
          )}
        </div>
       
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`px-5 py-2 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2 cursor-pointer ${
            isEditing
              ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
              : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          {isEditing ? (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
              </svg>
              Fertig
            </>
          ) : (
            <>
              <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
              </svg>
              Bearbeiten
            </>
          )}
        </button>
      </div>

      <div className="space-y-8 relative z-20">
        {/* Objektarten */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className={`p-1.5 rounded-lg ${isEditing ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"} transition-colors`}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4zm3 1h6v4H7V5zm8 6H5v3h10v-3zm-10 5h10v1H5v-1z" clipRule="evenodd" />
                </svg>
            </div>
            <h3 className="text-base font-bold text-gray-800">Objektarten auswählen</h3>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {["Wohnung", "Haus", "Gewerbe", "Grundstueck"].map((v) => {
              const active = objectClasses.includes(v);
              return (
                <button
                  key={v}
                  onClick={() => toggle(v, objectClasses, setObjectClasses, "objectClasses")}
                  disabled={!isEditing}
                  className={getChipStyle(active)}
                >
                  {active && isEditing && (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  )}
                  {v}
                </button>
              );
            })}
          </div>
        </div>

        {!isEditing && <hr className="border-gray-100" />}

        {/* Angebotsarten */}
        <div>
          <div className="flex items-center gap-2 mb-4">
             <div className={`p-1.5 rounded-lg ${isEditing ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"} transition-colors`}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.5 3A2.5 2.5 0 003 5.5v2.879a2.5 2.5 0 00.732 1.767l6.5 6.5a2.5 2.5 0 003.536 0l2.878-2.878a2.5 2.5 0 000-3.536l-6.5-6.5A2.5 2.5 0 008.38 3H5.5zM6 7a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
            </div>
            <h3 className="text-base font-bold text-gray-800">Angebotsart</h3>
          </div>

          <div className="flex flex-wrap gap-3">
            {["Kauf", "Miete"].map((v) => {
              const active = offerTypes.includes(v);
              return (
                <button
                  key={v}
                  onClick={() => toggle(v, offerTypes, setOfferTypes, "offerTypes")}
                  disabled={!isEditing}
                  className={getChipStyle(active)}
                >
                  {active && isEditing && (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  )}
                  {v}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Das Overlay hat z-10, der Header und Content haben jetzt z-20. Jetzt gehts! */}
      {!isEditing && (
          <div className="absolute inset-0 bg-white/10 z-10 cursor-not-allowed" aria-hidden="true"></div>
      )}
    </section>
  );
}