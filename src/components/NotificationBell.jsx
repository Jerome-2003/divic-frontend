import { useEffect, useRef, useState } from "react";
import { Bell, AlertTriangle, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationsContext";
import { prettyDateTime } from "../lib/format";
import { useAuth } from "../context/AuthContext";

/**
 * The panel. Fetching, sockets, and polling all live in NotificationsContext
 * now — this component just renders whatever it's given, so the sidebar badge
 * can read the same feed without a second subscription.
 *
 * There is no sound by default. A front desk that beeps every few minutes gets
 * muted within a day, and then the urgent one is missed too.
 */
export default function NotificationBell() {
  const { can } = useAuth();
  const { items, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const nav = useNavigate();

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
    if (!n.read) markRead(n._id);
    if (n.href) nav(n.href);
  };

  if (!can("notifications")) return null;

  const urgentUnread = items.some((n) => n.urgent && !n.read);

  return (
    <div className="notif" ref={panelRef}>
      <button
        className={"notif-btn" + (urgentUnread ? " urgent" : "")}
        onClick={() => setOpen((v) => !v)}
        aria-label={unreadCount ? unreadCount + " unread notifications" : "Notifications"}
      >
        <Bell size={16} strokeWidth={1.7} />
        {unreadCount > 0 && <span className="notif-count">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>

      {open && (
        <div className="notif-panel" role="dialog" aria-label="Notifications">
          <div className="notif-head">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button className="btn btn-sm btn-quiet" onClick={markAllRead}>
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
