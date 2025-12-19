import { Routes, Route, Navigate } from "react-router-dom";
import PublicLayout from "./layouts/PublicLayout";
import UserLayout from "./layouts/UserLayout";
import AdminLayout from "./layouts/AdminLayout";
import AdminUserDetails from "./pages/admin/user/AdminUserDetails";  
import AdminUserList from "./pages/admin/user/AdminUserList";
import Login from "./pages/public/Login";
import AdminClicks from "./pages/admin/clicks/AdminClicks";
import AdminOffers from "./pages/admin/offers/AdminOffers";
import AdminOfferDetails from "./pages/admin/offers/AdminOfferDetails";

// Register-Flow (öffentlich)
import Step1 from "./pages/public/register/Step1";
import Step2 from "./pages/public/register/Step2";
import Step3 from "./pages/public/register/Step3";
import Step4Optional from "./pages/public/register/Step4Optional";
import Step5Optional from "./pages/public/register/Step5Optional";
import RegisterFinish from "./pages/public/register/RegisterFinish";

// Geschützte Bereiche
import ProtectedRoute from "./routes/ProtectedRoute";
import AdminRoute from "./routes/AdminRoute";

import Dashboard from "./pages/user/Dashboard";
import AdminDashboard from "./pages/admin/AdminDashbaord";

import RootRedirect from "./RootRedirect";
import UserProfile from "./pages/user/UserProfile";


export default function App() {
  return (
    <Routes>
      {/* PUBLIC */}
      <Route element={<PublicLayout />}>
        {/* Root: hängt von Login-Status ab */}
        <Route index element={<RootRedirect />} />

        {/* Login explizit erreichbar */}
        <Route path="/login" element={<Login />} />

        {/* Register-Flow */}
        <Route path="/register">
          <Route index element={<Navigate to="/register/step1" replace />} />
          <Route path="step1" element={<Step1 />} />
          <Route path="step2" element={<Step2 />} />
          <Route path="step3" element={<Step3 />} />
          <Route path="step4" element={<Step4Optional />} />
          <Route path="step5" element={<Step5Optional />} />
          <Route path="finish" element={<RegisterFinish />} />
        </Route>
      </Route>

      {/* USER (geschützt) */}
      <Route
        element={
          <ProtectedRoute>
            <UserLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
         <Route path="/dashboard/profile" element={<UserProfile />} />
      </Route>

      {/* ADMIN (geschützt + admin) */}
      <Route
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route path="/admin" element={<AdminDashboard />} />
<Route path="/admin/users" element={<AdminUserList />} />
<Route path="/admin/user/:uid" element={<AdminUserDetails />} />
<Route path="/admin/clicks" element={<AdminClicks />} />
<Route path="/admin/offers" element={<AdminOffers />} />
<Route path="/admin/offers/:offerId" element={<AdminOfferDetails />} />


      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
