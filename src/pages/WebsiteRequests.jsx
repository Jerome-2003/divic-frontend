import { useState } from "react";
import { Globe, Check, X } from "lucide-react";
import api from "../lib/api";
import { useApi } from "../lib/useApi";
import { useAuth } from "../context/AuthContext";
import { naira, cap, telUrl, prettyDateTime } from "../lib/format";
import { PageHead, Card, Empty, Loading, ErrorNote, Chip, Note, ConfirmModal } from "../components/ui";

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
                  <td className="mono">{naira(r.quotedTotal)}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {r.status === "pending" ? (
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
