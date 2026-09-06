import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Shell from "./components/Shell";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Bookings from "./pages/Bookings";
import FrontDesk from "./pages/FrontDesk";
import WebsiteRequests from "./pages/WebsiteRequests";
import Housekeeping from "./pages/Housekeeping";
import Guests from "./pages/Guests";
import Billing from "./pages/Billing";
import Analytics from "./pages/Analytics";
import Rates from "./pages/Rates";
import Staff from "./pages/Staff";
import ActivityLog from "./pages/ActivityLog";
import { Loading } from "./components/ui";

/**
 * Routes are gated by module permission. A cleaner who types /billing straight
 * into the address bar lands back on the room board — and even if they got the
 * page to render, every API call behind it is refused server-side too.
 */
function Guarded({ module, children }) {
  const { can } = useAuth();
  if (!can(module)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user, loading, can } = useAuth();

  if (loading) {
    return (
      <div className="divic" style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <div className="serif" style={{ fontSize: 30 }}>Divic</div>
          <div style={{ width: 30, height: 1, background: "var(--gold)", margin: "12px auto" }} />
          <Loading label="Checking your sign-in" />
        </div>
      </div>
    );
  }

  if (!user) return <Login />;

  // Housekeeping staff have no dashboard, so their home is the room board.
  const home = can("dashboard") ? <Dashboard /> : <Navigate to="/housekeeping" replace />;

  return (
    <Shell>
      <Routes>
        <Route path="/" element={home} />
        <Route path="/bookings"     element={<Guarded module="bookings"><Bookings /></Guarded>} />
        <Route path="/front-desk"   element={<Guarded module="frontdesk"><FrontDesk /></Guarded>} />
        <Route path="/requests"     element={<Guarded module="bookings"><WebsiteRequests /></Guarded>} />
        <Route path="/housekeeping" element={<Guarded module="rooms"><Housekeeping /></Guarded>} />
        <Route path="/guests"       element={<Guarded module="guests"><Guests /></Guarded>} />
        <Route path="/billing"      element={<Guarded module="billing"><Billing /></Guarded>} />
        <Route path="/analytics"    element={<Guarded module="analytics"><Analytics /></Guarded>} />
        <Route path="/rates"        element={<Guarded module="rates"><Rates /></Guarded>} />
        <Route path="/staff"        element={<Guarded module="staff"><Staff /></Guarded>} />
        <Route path="/activity"     element={<Guarded module="audit"><ActivityLog /></Guarded>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
