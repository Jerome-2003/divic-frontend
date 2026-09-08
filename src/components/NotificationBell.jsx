import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, AlertTriangle, Check } from "lucide-react";
import api from "../lib/api";
import { onEvent } from "../lib/socket";
import { useAuth } from "../context/AuthContext";
import { prettyDateTime } from "../lib/format";
import { useNavigate } from "react-router-dom";

/**
 * Alerts for the property currently being viewed.
 *
 * Sockets push new ones, but a websocket can drop quietly, and a receptionist
 * must never miss an arrival because of it — so a slow poll runs underneath as
 * a floor, not as the main mechanism.
 *
 * There is no sound by default. A front desk that beeps every few minutes gets
 * muted within a day, and then the urgent one is missed too.
 */
export default function NotificationBell() {
  const { location, can } = useAuth();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const nav = useNavigate();

  const load = useCallback(async () => {
    if (!can("notifications")) return;
    try {
      const res = await api.notifications(location, 40);
      setItems(res.notifications || []);
      setUnread(res.unread || 0);
    } catch {
      // An alert list that fails to load must not break the page under it.
    }
  }, [location, can]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const off = onEvent("notification:new", () => load());
    const timer = setInterval(load, 60000);
    return () => { off(); clearInterval(timer); };
  }, [load]);

  // Click-away, so the panel does not sit open over the screen behind it.
  useEffect(() => {
    if (!open) return;
    const away = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    window.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); window.removeEventListener("keydown", esc); };
  }, [open]);

  const openItem = async (n) => {
    setOpen(false);
    if (!n.read) {
      try { await api.markNotificationRead(n._id); } catch { /* navigation matters more */ }
      load();
    }
    if (n.href) nav(n.href);
  };

  const markAll = async () => {
    try { await api.markAllNotificationsRead(location); await load(); } catch { /* no-op */ }
  };

  if (!can("notifications")) return null;

  const urgentUnread = items.some((n) => n.urgent && !n.read);

  return (
    <div className="notif" ref={panelRef}>
      <button
        className={"notif-btn" + (urgentUnread ? " urgent" : "")}
        onClick={() => setOpen((v) => !v)}
        aria-label={unread ? unread + " unread notifications" : "Notifications"}
      >
        <Bell size={16} strokeWidth={1.7} />
        {unread > 0 && <span className="notif-count">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className="notif-panel" role="dialog" aria-label="Notifications">
          <div className="notif-head">
            <span>Notifications</span>
            {unread > 0 && (
              <button className="btn btn-sm btn-quiet" onClick={markAll}>
                <Check size={13} /> Mark all read
              </button>
            )}
          </div>

          <div className="notif-list">
            {items.length === 0 ? (
              <div className="notif-empty">Nothing yet. New website bookings and payments appear here.</div>
            ) : items.map((n) => (
              <button
                key={n._id}
                className={"notif-item" + (n.read ? " read" : "") + (n.urgent ? " urgent" : "")}
                onClick={() => openItem(n)}
              >
                <div className="notif-item-head">
                  {n.urgent && <AlertTriangle size={13} style={{ flexShrink: 0 }} />}
                  <span className="notif-title">{n.title}</span>
                  {!n.read && <i className="notif-dot" aria-hidden="true" />}
                </div>
                {n.body && <div className="notif-body">{n.body}</div>}
                <div className="notif-when">{prettyDateTime(n.createdAt)}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
