import { useAuth } from "../../contexts/AuthContext";
import useUserFilters from "./hooks/useUserFilters";
import LocationCard from "./filters/LocationCard";
import ObjectCard from "./filters/ObjectCard";
import PriceCard from "./filters/PriceCard";
import ExtrasCard from "./filters/ExtrasCard";
import RequirePayment from "../../components/payment/RequirePayment";
import AdminDashboard from "../admin/AdminDashbaord";
import AdvancedFiltersCard from "./filters/AdvancedFiltersCard";



export default function Dashboard() {
  const { user } = useAuth();
  const { filters, loading } = useUserFilters();

  if (loading) return <p style={{ padding: 20 }}>Lade Filter…</p>;

  return (
   <RequirePayment>
  <div style={{ padding: 30 }}>
    <h1 style={{ fontSize: 40, marginBottom: 20 }}>Dein Dashboard</h1>

    <div style={{ display: "grid", gap: 20 }}>
      <LocationCard filters={filters} user={user} />
      <ObjectCard filters={filters} user={user} />
      <PriceCard filters={filters} user={user} />
      <ExtrasCard filters={filters} user={user} />
      <AdvancedFiltersCard filters={filters} user={user} />
    </div>
  </div>
</RequirePayment>

  );
}

