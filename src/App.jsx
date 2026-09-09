import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Shell from "./components/Shell";
import Splash from "./components/Splash";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Bookings from "./pages/Bookings";
import FrontDesk from "./pages/FrontDesk";
import WebsiteRequests from "./pages/WebsiteRequests";
import Housekeeping from "./pages/Housekeeping";
import Guests from "./pages/Guests";
import Billing from "./pages/Billing";
import PointOfSale from "./pages/PointOfSale";
import Analytics from "./pages/Analytics";
import Rates from "./pages/Rates";
import Staff from "./pages/Staff";
import ActivityLog from "./pages/ActivityLog";
import Website from "./pages/Website";
import Todos from "./pages/Todos";
import { Empty } from "./components/ui";

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

/* The splash runs to 1.28s; hold it that long so a fast session check does not
   cut the animation off half way through. */
const SPLASH_MS = 1300;
const reducedMotion = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function App() {
  const { user, loading, can } = useAuth();
  // Under reduced motion there is no animation to wait for, so the hold starts
  // already satisfied and the app appears as soon as the check is done.
  const [held, setHeld] = useState(reducedMotion);

  useEffect(() => {
    if (held) return;
    const t = setTimeout(() => setHeld(true), SPLASH_MS);
    return () => clearTimeout(t);
  }, [held]);

  if (loading || !held) return <Splash waiting={held && loading} />;

  if (!user) return <Login />;

  /* Housekeeping have no dashboard, so their home is the room board; facility
     staff have neither and land on their till. The chain ends in a message
     rather than another redirect — a role with none of the three would
     otherwise bounce between "/" and its own home for ever. */
  const home = can("dashboard") ? <Dashboard />
    : can("rooms") ? <Navigate to="/housekeeping" replace />
    : can("pos") ? <Navigate to="/pos" replace />
    : <Empty heading="Nothing to show you yet"
        text="This account has no screens assigned. Ask your manager to check its role." />;

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
        <Route path="/pos"          element={<Guarded module="pos"><PointOfSale /></Guarded>} />
        <Route path="/analytics"    element={<Guarded module="analytics"><Analytics /></Guarded>} />
        <Route path="/rates"        element={<Guarded module="rates"><Rates /></Guarded>} />
        <Route path="/staff"        element={<Guarded module="staff"><Staff /></Guarded>} />
        <Route path="/website"      element={<Guarded module="content"><Website /></Guarded>} />
        <Route path="/activity"     element={<Guarded module="audit"><ActivityLog /></Guarded>} />
        <Route path="/todos"       element={<Guarded module="todos"><Todos /></Guarded>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
