import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, CalendarDays, ConciergeBell, Globe, Sparkles, Users,
  Receipt, Martini, TrendingUp, Tags, UserCog, ScrollText, Globe2, LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNotifications, WEBSITE_REQUEST_TYPES } from "../context/NotificationsContext";
import { ROLE_LABEL, LOCATIONS } from "../lib/constants";

const ITEMS = [
  { module: "dashboard", label: "Dashboard",        path: "/",             icon: LayoutDashboard },
  { module: "bookings",  label: "Bookings",         path: "/bookings",     icon: CalendarDays },
  { module: "frontdesk", label: "Front desk",       path: "/front-desk",   icon: ConciergeBell },
  { module: "bookings",  label: "Website requests", path: "/requests",     icon: Globe },
  { module: "rooms",     label: "Housekeeping",     path: "/housekeeping", icon: Sparkles },
  { module: "guests",    label: "Guests",           path: "/guests",       icon: Users },
  { module: "billing",   label: "Billing",          path: "/billing",      icon: Receipt },
  { module: "pos",       label: "Point of sale",    path: "/pos",          icon: Martini },
  { module: "analytics", label: "Analytics",        path: "/analytics",    icon: TrendingUp },
  { module: "rates",     label: "Rates",            path: "/rates",        icon: Tags },
  { module: "staff",     label: "Staff",            path: "/staff",        icon: UserCog },
  { module: "content",   label: "Website",          path: "/website",      icon: Globe2 },
  { module: "audit",     label: "Activity log",     path: "/activity",     icon: ScrollText },
];

export default function Sidebar() {
  const { user, can, signOut } = useAuth();
  const { unreadByType } = useNotifications();
  const items = ITEMS.filter((i) => can(i.module));
  // A new website request is easy to miss if it only shows once the bell is
  // opened, so it also gets a plain dot right on the nav item itself.
  const newWebsiteRequests = unreadByType(WEBSITE_REQUEST_TYPES);

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
              className={({ isActive }) => "nav-item" + (isActive ? " on" : "")}
            >
              <Icon size={16} strokeWidth={1.6} /> {i.label}
              {i.path === "/requests" && newWebsiteRequests > 0 && (
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
        <button className="signout" onClick={signOut}><LogOut size={14} /> Sign out</button>
      </div>
    </aside>
  );
}