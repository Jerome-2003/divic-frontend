import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api from "../lib/api";
import { onEvent } from "../lib/socket";
import { useAuth } from "./AuthContext";

/**
 * One notification feed shared across the app, so the bell in the top bar and
 * the badge on the sidebar read the same data instead of each running their
 * own fetch, socket listener, and poll timer.
 *
 * Sockets push new items in as they happen, but a websocket can drop quietly —
 * a receptionist must never miss an arrival because of that — so a slow poll
 * runs underneath as a floor, not as the main mechanism.
 */
const NotificationsContext = createContext(null);

// The three notification types that originate from a website request — a new
// unpaid one, a paid one that got a room automatically, or a paid one that
// could not. All three belong under the "Website requests" badge.
export const WEBSITE_REQUEST_TYPES = ["request:new", "booking:auto", "booking:unassigned"];

export function NotificationsProvider({ children }) {
  const { location, can } = useAuth();
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const reload = useCallback(async () => {
    if (!can("notifications")) return;
    try {
      const res = await api.notifications(location, 40);
      setItems(res.notifications || []);
      setUnreadCount(res.unread || 0);
    } catch {
      // An alert list that fails to load must not break the page under it.
    }
  }, [location, can]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    const off = onEvent("notification:new", () => reload());
    const timer = setInterval(reload, 60000);
    return () => { off(); clearInterval(timer); };
  }, [reload]);

  const unreadByType = useCallback(
    (types) => items.filter((n) => !n.read && (Array.isArray(types) ? types.includes(n.type) : n.type === types)).length,
    [items]
  );

  const markRead = useCallback(async (id) => {
    try { await api.markNotificationRead(id); } finally { reload(); }
  }, [reload]);

  /** Marks every unread item of the given type(s) read — used when the user
      visits the page that "resolves" that category, e.g. Website requests. */
  const markTypesRead = useCallback(async (types) => {
    const list = Array.isArray(types) ? types : [types];
    const targets = items.filter((n) => !n.read && list.includes(n.type));
    if (!targets.length) return;
    try {
      await Promise.all(targets.map((n) => api.markNotificationRead(n._id)));
    } finally {
      reload();
    }
  }, [items, reload]);

  const markAllRead = useCallback(async () => {
    try { await api.markAllNotificationsRead(location); } finally { reload(); }
  }, [location, reload]);

  return (
    <NotificationsContext.Provider value={{
      items, unreadCount, unreadByType, markRead, markTypesRead, markAllRead, reload,
    }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationsProvider");
  return ctx;
};
