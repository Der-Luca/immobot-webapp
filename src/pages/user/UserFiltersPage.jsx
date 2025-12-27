import useUserFilters from "./hooks/useUserFilters";

import LocationCard from "./filters/LocationCard";
import ObjectCard from "./filters/ObjectCard";
import PriceCard from "./filters/PriceCard";
import ExtrasCard from "./filters/ExtrasCard";
import AdvancedFiltersCard from "./filters/AdvancedFiltersCard";

import RequirePayment from "../../components/payment/RequirePayment";

export default function UserFiltersPage() {
  const { filters, loading, updateFilters } = useUserFilters();

  if (loading || !filters) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-gray-500 font-medium animate-pulse">Lade Filter…</div>
      </div>
    );
  }

  return (
    <RequirePayment>
      <div className="max-w-7xl mx-auto px-4 py-8 md:px-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
            Meine Suchfilter
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            Passe deine Suche an, um die besten Deals zu finden.
          </p>
        </div>

        {/* ✅ KEIN auto-rows-fr mehr (war zu hoch) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Zeile 1 */}
          <div className="h-full">
            <ObjectCard filters={filters} onChange={updateFilters} />
          </div>
          <div className="h-full">
            <LocationCard filters={filters} onChange={updateFilters} />
          </div>

          {/* Zeile 2 */}
          <div className="h-full">
            <PriceCard filters={filters} onChange={updateFilters} />
          </div>
          <div className="h-full">
            <ExtrasCard filters={filters} onChange={updateFilters} />
          </div>

          {/* volle Breite */}
          <div className="lg:col-span-2">
            <AdvancedFiltersCard filters={filters} onChange={updateFilters} />
          </div>
        </div>
      </div>
    </RequirePayment>
  );
}
