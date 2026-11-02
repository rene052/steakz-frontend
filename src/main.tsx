import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, homeFor, useAuth } from "./auth";
import type { Role } from "./types";
import { PublicLayout } from "./components/Layouts";
import { Loading } from "./components/ui";
import { BranchPage, BranchesPage, HomePage, LoginPage, NotFoundPage, RegisterPage } from "./pages/Public";
import CustomerDashboard from "./pages/customer/CustomerDashboard";
import CashierDashboard from "./pages/cashier/CashierDashboard";
import ChefDashboard from "./pages/chef/ChefDashboard";
import ManagerDashboard from "./pages/manager/ManagerDashboard";
import HqDashboard from "./pages/hq/HqDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import "@fontsource/big-shoulders-display/600";
import "@fontsource/big-shoulders-display/700";
import "@fontsource/big-shoulders-display/800";
import "@fontsource/public-sans/400.css";
import "@fontsource/public-sans/500.css";
import "@fontsource/public-sans/600.css";
import "@fontsource/public-sans/700.css";
import "./styles.css";

/** Front-end mirror of requireRole: the API enforces the real rule, this just routes people. */
function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (!roles.includes(user.role)) return <Navigate to={homeFor[user.role]} replace />;
  return <>{children}</>;
}

function AppHome() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  return <Navigate to={user ? homeFor[user.role] : "/login"} replace />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/branches" element={<BranchesPage />} />
            <Route path="/branches/:id" element={<BranchPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
          <Route path="/app" element={<AppHome />} />
          <Route path="/app/customer" element={<RequireRole roles={["CUSTOMER"]}><CustomerDashboard /></RequireRole>} />
          <Route path="/app/cashier" element={<RequireRole roles={["CASHIER"]}><CashierDashboard /></RequireRole>} />
          <Route path="/app/chef" element={<RequireRole roles={["CHEF"]}><ChefDashboard /></RequireRole>} />
          <Route path="/app/manager" element={<RequireRole roles={["BRANCH_MANAGER"]}><ManagerDashboard /></RequireRole>} />
          <Route path="/app/hq" element={<RequireRole roles={["HQ_MANAGER"]}><HqDashboard /></RequireRole>} />
          <Route path="/app/admin" element={<RequireRole roles={["ADMIN"]}><AdminDashboard /></RequireRole>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
