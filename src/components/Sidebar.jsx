import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, CalendarDays, ConciergeBell, Sparkles, Users,
  Martini, TrendingUp, Tags, UserCog, ScrollText, Globe2, LogOut, FileText,
  Moon, Sun, ListTodo, HelpCircle, Waves, Dumbbell, KeyRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useTutorial } from "../context/TutorialContext";
import { useNotifications, WEBSITE_REQUEST_TYPES } from "../context/NotificationsContext";
import { ROLE_LABEL, LOCATIONS } from "../lib/constants";
import { ConfirmModal } from "./ui";
import ChangePasswordModal from "./ChangePasswordModal";
import api from "../lib/api";

const ITEMS = [
  { module: "dashboard", label: "Dashboard",        path: "/",             icon: LayoutDashboard },
  { module: "bookings",  label: "Bookings",         path: "/bookings",     icon: CalendarDays },
  // Website requests and bills are tabs of the front desk, not pages of their
  // own — the desk does all three jobs at the same counter.
  { module: "frontdesk", label: "Front desk",       path: "/front-desk",   icon: ConciergeBell },
  { module: "rooms",     label: "Housekeeping",     path: "/housekeeping", icon: Sparkles },
  { module: "guests",    label: "Guests",           path: "/guests",       icon: Users },
  { module: "pos",       label: "Bar",              path: "/bar",          icon: Martini },
  { module: "pos",       label: "Pool",             path: "/pool",         icon: Waves },
  { module: "pos",       label: "Gym",              path: "/gym",          icon: Dumbbell },
  { module: "analytics", label: "Analytics",        path: "/analytics",    icon: TrendingUp },
  { module: "analytics", label: "Records",          path: "/records",      icon: FileText },
  { module: "rates",     label: "Rates",            path: "/rates",        icon: Tags },
  { module: "staff",     label: "Staff",            path: "/staff",        icon: UserCog },
  { module: "content",   label: "Website",          path: "/website",      icon: Globe2 },
  { module: "audit",     label: "Activity log",     path: "/activity",     icon: ScrollText },
  { module: "todos",     label: "To-do list",        path: "/todos",        icon: ListTodo },
];

/** 95 -> "1h 35m", 40 -> "40m". */
function hoursSince(mins) {
  const h = Math.floor((mins || 0) / 60);
  const m = (mins || 0) % 60;
  return h ? h + "h " + m + "m" : m + "m";
}

export default function Sidebar() {
  const { user, can, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { start: startTour } = useTutorial();
  const { unreadByType } = useNotifications();
  const items = ITEMS.filter((i) => can(i.module));
  // A new website request is easy to miss if it only shows once the bell is
  // opened, so it also gets a plain dot right on the nav item itself.
  const newWebsiteRequests = unreadByType(WEBSITE_REQUEST_TYPES);
  // A stray click here would end the shift mid-task, so it asks first rather
  // than acting immediately.
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  // Whether they have a shift open, so the dialog can ask the right question.
  const [shift, setShift] = useState(null);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    if (!confirmingSignOut) return;
    api.myShift().then(setShift).catch(() => setShift(null));
  }, [confirmingSignOut]);

  /**
   * Signing out and going home are not the same thing, so the dialog offers
   * both. A receptionist moving from the desk computer to their phone signs
   * out and is still working; a bartender at the end of the night is not.
   * Guessing either way would put the wrong hours on somebody's record.
   */
  const endShiftAndOut = async () => {
    setEnding(true);
    try { await api.endMyShift(); } catch { /* signing out matters more */ }
    setEnding(false);
    signOut();
  };

  return (
    <aside className="side">
      <div className="brand">
        <div className="brand-lockup">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" width="30" height="30" /> 
          <span className="brand-mark">Divic Exclusive Hotels</span>
        </div>
        <div className="brand-rule" />
        <div className="brand-sub">Two properties, Festac</div>
      </div>

      <nav className="nav">
        {items.map((i) => {
          const Icon = i.icon;
          return (
            <NavLink
              key={i.path}
              to={i.path}
              end={i.path === "/"}
              data-tour={"nav-" + i.path}
              className={({ isActive }) => "nav-item" + (isActive ? " on" : "")}
            >
              <Icon size={16} strokeWidth={1.6} /> {i.label}
              {i.path === "/front-desk" && newWebsiteRequests > 0 && (
                <i className="notif-dot" aria-label={newWebsiteRequests + " new"} />
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="side-foot">
        <div>
          <div className="who">{user.name}</div>
          <div className="who-role">
            {ROLE_LABEL[user.role]}
            {user.location !== "all" && " · " + LOCATIONS[user.location].name.replace("Divic ", "")}
          </div>
        </div>
        <div className="foot-actions">
          <button className="signout" onClick={() => setConfirmingSignOut(true)}>
            <LogOut size={14} /> Sign out
          </button>
          <button className="notif-btn" onClick={() => setChangingPassword(true)}
            title="Change your password"
            aria-label="Change your password">
            <KeyRound size={15} />
          </button>
          <button className="notif-btn" onClick={startTour}
            title="Take the guided tour"
            aria-label="Take the guided tour">
            <HelpCircle size={15} />
          </button>
          <button className="notif-btn" onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </div>

      {changingPassword && <ChangePasswordModal onClose={() => setChangingPassword(false)} />}

      {confirmingSignOut && (
        <ConfirmModal
          title={shift?.open ? "Are you finished for the day?" : "Sign out?"}
          blurb={shift?.open
            ? "You have been on shift " + hoursSince(shift.minutes) + "."
            : "You will need to sign in again to get back in."}
          confirmLabel={shift?.open ? "End my shift and sign out" : "Sign out"}
          cancelLabel="Stay signed in"
          busy={ending}
          onConfirm={shift?.open ? endShiftAndOut : signOut}
          onClose={() => { setConfirmingSignOut(false); setShift(null); }}
          extraAction={shift?.open
            ? { label: "Just sign out, still working", onClick: signOut }
            : undefined}
        >
          {shift?.open && (
            <p style={{ fontSize: "0.8438rem", color: "var(--slate-soft)", margin: 0, lineHeight: 1.6 }}>
              Ending your shift records that you have finished. If you are only moving to
              another computer or phone, sign out without ending it — your shift keeps running.
            </p>
          )}
        </ConfirmModal>
      )}
    </aside>
  );
}