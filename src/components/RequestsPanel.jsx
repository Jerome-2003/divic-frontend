import { useEffect, useState } from "react";
import { Globe, Check, X } from "lucide-react";
import api from "../lib/api";
import { useApi } from "../lib/useApi";
import { useAuth } from "../context/AuthContext";
import { useNotifications, WEBSITE_REQUEST_TYPES } from "../context/NotificationsContext";
import { naira, cap, telUrl, prettyDateTime } from "../lib/format";
import { Card, Empty, Loading, ErrorNote, Chip, Note, ConfirmModal } from "./ui";

/**
 * Requests lodged by the public website, shown on the front desk alongside
 * arrivals and bills — the desk handles all three in the same breath, and
 * having them on three separate screens meant a request could sit unseen while
 * someone worked the arrivals list.
 *
 * They are drawn deliberately unlike a booking. A request holds no room: it is
 * a stranger on the internet asking, not a guest with a key waiting. Every row
 * carries the website mark and the amber edge so nobody at the desk can mistake
 * one for a confirmed arrival — which is the whole reason they were worth
 * separating visually rather than simply listing together.
 */
export default function RequestsPanel() {
  const { location } = useAuth();
  const { markTypesRead } = useNotifications();

  // Visiting this page is what "resolves" a website-request notification —
  // the sidebar dot clears the same way the bell's own items do on click.
  useEffect(() => { markTypesRead(WEBSITE_REQUEST_TYPES); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [tab, setTab] = useState("pending");
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [declining, setDeclining] = useState(null);

  const { data, loading, error, reload } = useApi(() => api.requests(location, tab), [location, tab]);

  const accept = async (r) => {
    setBusyId(r._id); setActionError(null);
    try { await api.acceptRequest(r._id); await reload(); }
    catch (e) { setActionError(e.message); }
    finally { setBusyId(null); }
  };

  const decline = async (reason) => {
    const r = declining;
    setBusyId(r._id); setActionError(null);
    try { await api.declineRequest(r._id, reason); setDeclining(null); await reload(); }
    catch (e) { setActionError(e.message); setDeclining(null); }
    finally { setBusyId(null); }
  };

  return (
    <>
      <div className="tabs tabs-sub">
        {["pending", "accepted", "declined"].map((s) => (
          <button key={s} className={tab === s ? "on" : ""} onClick={() => setTab(s)}>{cap(s)}</button>
        ))}
      </div>

      <ErrorNote>{error || actionError}</ErrorNote>

      <Card title="From the website"
        sub="A request holds no room until someone here accepts it.">
        {loading ? <Loading /> : !data?.length ? (
          <Empty heading={tab === "pending" ? "No requests waiting" : "Nothing here"}
            text={tab === "pending"
              ? "New requests from the website appear here as soon as they come in."
              : "Requests you have handled will show up under this tab."} />
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Reference</th><th>Guest</th><th>Wants</th><th>Dates</th>
                  <th>Quoted</th><th style={{ textAlign: "right" }}>Action</th></tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r._id} className="wr-row">
                  <td className="mono" style={{ color: "var(--gold-deep)" }}>
                    <span className="wr-mark"><Globe size={12} /> {r.reference}</span>
                    <div style={{ fontSize: "0.6875rem", color: "var(--slate-faint)" }}>{prettyDateTime(r.createdAt)}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{r.guestName}</div>
                    <div style={{ fontSize: "0.7188rem" }}>
                      <a href={telUrl(r.guestPhone)} style={{ color: "var(--slate-faint)", borderBottom: "1px solid var(--line)" }}>
                        {r.guestPhone}
                      </a>
                    </div>
                  </td>
                  <td>
                    <Chip>{cap(r.roomType)}</Chip>
                    {r.specialRequests && (
                      <div style={{ fontSize: "0.7188rem", color: "var(--slate-faint)", marginTop: 4, maxWidth: 200 }}>
                        {r.specialRequests}
                      </div>
                    )}
                  </td>
                  <td className="mono" style={{ fontSize: "0.7812rem" }}>
                    {r.checkIn} → {r.checkOut}
                    <div style={{ color: "var(--slate-faint)", fontSize: "0.7188rem" }}>{r.nights} nights</div>
                  </td>
                  <td className="mono">
                    {naira(r.quotedTotal)}
                    {r.payment?.verified && (
                      <div style={{ fontSize: "0.6875rem", color: "var(--sage)" }}>
                        paid online{r.payment.feeAmount ? " · incl. " + naira(r.payment.feeAmount) + " card fee" : ""}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {/* A paid request is already a confirmed booking with a room —
                        there is nothing to accept, and offering an Accept button
                        here would be actively misleading. */}
                    {r.payment?.verified ? (
                      <Chip tone="st-available">Paid · booked</Chip>
                    ) : r.status === "pending" ? (
                      r.canAccept ? (
                        <>
                          <button className="btn btn-sm btn-gold" disabled={busyId === r._id} onClick={() => accept(r)}>
                            <Check size={13} /> Accept
                          </button>
                          <button className="btn btn-sm btn-quiet" disabled={busyId === r._id} onClick={() => setDeclining(r)}>
                            <X size={13} /> Decline
                          </button>
                        </>
                      ) : (
                        <>
                          <Chip tone="st-dirty">Nothing free</Chip>
                          <button className="btn btn-sm btn-quiet" onClick={() => setDeclining(r)}>Decline</button>
                        </>
                      )
                    ) : (
                      <Chip tone={r.status === "accepted" ? "st-available" : "st-maintenance"}>{cap(r.status)}</Chip>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {declining && (
        <ConfirmModal
          title={"Decline " + declining.reference}
          blurb={declining.guestName + " · " + declining.guestPhone}
          destructive
          confirmLabel="Decline this request"
          cancelLabel="Keep it pending"
          busy={busyId === declining._id}
          requireReason
          reasonLabel="Why are you declining it?"
          reasonPlaceholder="No superior room free for those dates"
          onConfirm={decline}
          onClose={() => setDeclining(null)}
        >
          <p style={{ fontSize: "0.8438rem", color: "var(--slate-soft)", margin: "0 0 14px", lineHeight: 1.6 }}>
            {declining.guestName.split(" ")[0]} will be called and told this reason, so
            write it as you would say it to them.
          </p>
        </ConfirmModal>
      )}

      {tab === "pending" && (
        <div style={{ marginTop: 16 }}>
          <Note icon={Globe}>
            A request holds no room. Accepting one picks the first free room of that
            type and turns it into a real booking, so a walk-in and a website guest
            can never end up in the same room.
          </Note>
        </div>
      )}
    </>
  );
}
