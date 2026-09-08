import { useState } from "react";
import { Globe, Check, X } from "lucide-react";
import api from "../lib/api";
import { useApi } from "../lib/useApi";
import { useAuth } from "../context/AuthContext";
import { naira, cap, telUrl, prettyDateTime } from "../lib/format";
import { PageHead, Card, Empty, Loading, ErrorNote, Chip, Note } from "../components/ui";

/**
 * Requests lodged by the public website. They hold no room until a receptionist
 * accepts one — that is what stops a stranger on the internet from taking a
 * room out from under a walk-in standing at the desk.
 */
export default function WebsiteRequests() {
  const { location } = useAuth();
  const [tab, setTab] = useState("pending");
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);

  const { data, loading, error, reload } = useApi(() => api.requests(location, tab), [location, tab]);

  const accept = async (r) => {
    setBusyId(r._id); setActionError(null);
    try { await api.acceptRequest(r._id); await reload(); }
    catch (e) { setActionError(e.message); }
    finally { setBusyId(null); }
  };

  const decline = async (r) => {
    const reason = window.prompt("Why are you declining this request?\nThe guest will be called with this reason.");
    if (reason === null) return;
    setBusyId(r._id); setActionError(null);
    try { await api.declineRequest(r._id, reason); await reload(); }
    catch (e) { setActionError(e.message); }
    finally { setBusyId(null); }
  };

  return (
    <>
      <PageHead title="Website requests"
        blurb="Requests from the hotel website. Accepting one assigns a real room and creates the booking." />

      <div className="tabs">
        {["pending", "accepted", "declined"].map((s) => (
          <button key={s} className={tab === s ? "on" : ""} onClick={() => setTab(s)}>{cap(s)}</button>
        ))}
      </div>

      <ErrorNote>{error || actionError}</ErrorNote>

      <Card>
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
                <tr key={r._id}>
                  <td className="mono" style={{ color: "var(--gold-deep)" }}>
                    {r.reference}
                    <div style={{ fontSize: 11, color: "var(--slate-faint)" }}>{prettyDateTime(r.createdAt)}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{r.guestName}</div>
                    <div style={{ fontSize: 11.5 }}>
                      <a href={telUrl(r.guestPhone)} style={{ color: "var(--slate-faint)", borderBottom: "1px solid var(--line)" }}>
                        {r.guestPhone}
                      </a>
                    </div>
                  </td>
                  <td>
                    <Chip>{cap(r.roomType)}</Chip>
                    {r.specialRequests && (
                      <div style={{ fontSize: 11.5, color: "var(--slate-faint)", marginTop: 4, maxWidth: 200 }}>
                        {r.specialRequests}
                      </div>
                    )}
                  </td>
                  <td className="mono" style={{ fontSize: 12.5 }}>
                    {r.checkIn} → {r.checkOut}
                    <div style={{ color: "var(--slate-faint)", fontSize: 11.5 }}>{r.nights} nights</div>
                  </td>
                  <td className="mono">
                    {naira(r.quotedTotal)}
                    {r.payment?.verified && (
                      <div style={{ fontSize: 11, color: "var(--sage)" }}>
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
                          <button className="btn btn-sm btn-quiet" disabled={busyId === r._id} onClick={() => decline(r)}>
                            <X size={13} /> Decline
                          </button>
                        </>
                      ) : (
                        <>
                          <Chip tone="st-dirty">Nothing free</Chip>
                          <button className="btn btn-sm btn-quiet" onClick={() => decline(r)}>Decline</button>
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
