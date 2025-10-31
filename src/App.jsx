import { Routes, Route, Navigate } from "react-router-dom";
import PublicLayout from "./layouts/PublicLayout";
import UserLayout from "./layouts/UserLayout";
import AdminLayout from "./layouts/AdminLayout";

import Home from "./pages/public/Home";
import Login from "./pages/public/Login";

// Register-Flow (öffentlich)
import Step1 from "./pages/public/register/Step1";
import Step2 from "./pages/public/register/Step2";
import Step3 from "./pages/public/register/Step3";
import Step4Optional from "./pages/public/register/Step4Optional";
import Step5Optional from "./pages/public/register/Step5Optional";

// Geschützte Bereiche
import ProtectedRoute from "./routes/ProtectedRoute";
import AdminRoute from "./routes/AdminRoute";
import Dashboard from "./pages/public/user/Dashboard";

import AdminDashboard from "./pages/admin/AdminDashbaord";
import RegisterFinish from "./pages/public/register/RegisterFinish";

export default function App() {
  return (
    <Routes>
      {/* PUBLIC */}
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="/login" element={<Login />} />

        {/* Register-Flow */}
        <Route path="/register">
          <Route index element={<Navigate to="/register/step1" replace />} />
          <Route path="step1" element={<Step1 />} />
          <Route path="step2" element={<Step2 />} />
          <Route path="step3" element={<Step3 />} />
          <Route path="/register/step4" element={<Step4Optional />} />
          <Route path="/register/step5" element={<Step5Optional />} />
          <Route path="/register/finish" element={<RegisterFinish />} />
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
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
