import { useState } from "react";
import { Plus, Search, AlertTriangle, ArrowLeftRight, CalendarClock, Clock3, XCircle } from "lucide-react";
import api from "../lib/api";
import { useApi } from "../lib/useApi";
import { useAuth } from "../context/AuthContext";
import { LOCATIONS, BOOKING_STATUS } from "../lib/constants";
import { naira, cap, today, hourNow } from "../lib/format";
import { PageHead, Card, Empty, Loading, ErrorNote, Chip, ConfirmModal } from "../components/ui";
import NewBookingModal from "../components/NewBookingModal";
import MoveRoomModal from "../components/MoveRoomModal";
import BookingDatesModal from "../components/BookingDatesModal";

const toneFor = (status) =>
  status === "in-house" ? "st-occupied" : status === "confirmed" ? "gold" : "st-maintenance";

export default function Bookings() {
  const { location } = useAuth();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [adding, setAdding] = useState(false);
  const [moving, setMoving] = useState(null);
  const [editingDates, setEditingDates] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  const cancelBooking = async (reason) => {
    setBusy(true); setActionError(null);
    try { await api.cancelBooking(cancelling._id, reason); setCancelling(null); await reload(); }
    catch (e) { setActionError(e.message); setCancelling(null); }
    finally { setBusy(false); }
  };

  const { data, loading, error, reload } = useApi(
    () => api.bookings(location, { status: status || undefined, q: q || undefined }),
    [location, status, q]
  );

  return (
    <>
      <PageHead title="Bookings" blurb={"Every reservation at " + LOCATIONS[location].name + ", newest first."}>
        <button className="btn btn-gold" onClick={() => setAdding(true)}><Plus size={15} /> New booking</button>
      </PageHead>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Search size={15} style={{ position: "absolute", left: 11, top: 11, color: "var(--slate-faint)" }} />
          <input placeholder="Search by name, phone, reference or room"
            value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 34 }} />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 190 }}>
          <option value="">All bookings</option>
          <option value="confirmed">Arriving</option>
          <option value="in-house">Staying</option>
          <option value="checked-out">Checked out</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <ErrorNote>{error || actionError}</ErrorNote>

      {/* Paid, but no room. The guest has a contract and nowhere to sleep, so it
          sits at the top of the page rather than in a row somewhere below. */}
      {(data || []).filter((b) => b.needsAttention).map((b) => (
        <div key={b._id} className="attention">
          <AlertTriangle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1 }}>
            <strong>{b.guest?.name} paid online but has no room.</strong>
            <div style={{ fontSize: "0.7812rem", marginTop: 3 }}>
              {b.nights} night{b.nights === 1 ? "" : "s"} from {b.checkIn}, {cap(b.roomType)} requested.
              {b.attentionReason ? " " + b.attentionReason : ""}
            </div>
          </div>
          <button className="btn btn-sm btn-gold" onClick={() => setMoving(b)}>Place in a room</button>
        </div>
      ))}

      <Card>
        {loading ? <Loading /> : !data?.length ? (
          <Empty heading="Nothing matches" text="Try a different search, or create a booking."
            action={<button className="btn btn-gold" onClick={() => setAdding(true)}><Plus size={15} /> New booking</button>} />
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Reference</th><th>Guest</th><th>Room</th><th>Stay</th>
                <th>Status</th><th style={{ textAlign: "right" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {data.map((b) => {
                // Both the day and the hour read from the hotel's clock, not
                // the browser's — a laptop set to another zone would otherwise
                // raise this alert on the wrong day, or not at all.
                const checkoutAlert = b.status === "in-house" && b.checkOut === today() && hourNow() >= 12;
                return (
                <tr key={b._id}>
                  <td className="mono" style={{ color: "var(--gold-deep)" }}>{b.ref}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{b.guest?.name}</div>
                    <div style={{ fontSize: "0.7188rem", color: "var(--slate-faint)" }}>{cap(b.source)}</div>
                  </td>
                  <td className="mono">
                    {b.roomNumber ? (
                      <>
                        {b.roomNumber}
                        <span style={{ color: "var(--slate-faint)", fontSize: "0.7188rem" }}> {cap(b.roomType)}</span>
                        {b.autoAssigned && (
                          <div style={{ fontSize: "0.6875rem", color: "var(--slate-faint)" }}>chosen automatically</div>
                        )}
                      </>
                    ) : (
                      <span style={{ color: "var(--wine)" }}>No room</span>
                    )}
                  </td>
                  <td className="mono" style={{ fontSize: "0.7812rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {b.checkIn} → {b.checkOut}
                      <button className="btn btn-sm btn-quiet" onClick={() => setEditingDates(b)} title={b.status === "in-house" ? "Extend or change departure" : "Change booking dates"} aria-label={b.status === "in-house" ? "Extend or change departure" : "Change booking dates"}>
                        <CalendarClock size={13} />
                      </button>
                      {checkoutAlert && <span title="Check-out due by 12pm today" aria-label="Check-out due by 12pm today" style={{ color: "var(--wine)", display: "inline-flex" }}><Clock3 size={15} /></span>}
                    </div>
                    <div style={{ color: checkoutAlert ? "var(--wine)" : "var(--slate-faint)", fontSize: "0.7188rem" }}>
                      {checkoutAlert ? "Check out by 12pm today" : `${b.nights} night${b.nights === 1 ? "" : "s"}`}
                    </div>
                  </td>
                  <td><Chip tone={toneFor(b.status)}>{BOOKING_STATUS[b.status]}</Chip></td>
                  <td className="mono" style={{ textAlign: "right" }}>
                    {["confirmed", "in-house"].includes(b.status) && (
                      <button
                        className="btn btn-sm btn-quiet"
                        style={{ marginRight: 6 }}
                        onClick={() => setMoving(b)}
                        aria-label={b.roomNumber ? "Move to another room" : "Place in a room"}
                      >
                        <ArrowLeftRight size={13} />
                      </button>
                    )}
                    {/* A guest ringing to cancel is an everyday call, and until
                        now the desk had nowhere to record it: the page could
                        filter by cancelled and never make one. A stay already
                        finished cannot be cancelled — the server refuses it. */}
                    {["confirmed", "in-house"].includes(b.status) && (
                      <button
                        className="btn btn-sm btn-quiet"
                        style={{ marginRight: 6 }}
                        onClick={() => setCancelling(b)}
                        title="Cancel this booking"
                        aria-label="Cancel this booking"
                      >
                        <XCircle size={13} />
                      </button>
                    )}
                    {naira(b.totalCharge)}
                    {b.balance > 0 && (
                      <div style={{ fontSize: "0.7188rem", color: "var(--clay)" }}>{naira(b.balance)} due</div>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {cancelling && (
        <ConfirmModal
          title={"Cancel " + cancelling.ref + "?"}
          blurb={(cancelling.guest?.name || "This guest") +
            " · room " + (cancelling.roomNumber || "unplaced") +
            " · " + cancelling.checkIn + " → " + cancelling.checkOut}
          destructive
          confirmLabel="Cancel the booking"
          cancelLabel="Keep it"
          busy={busy}
          requireReason
          reasonLabel="Why is it being cancelled?"
          reasonPlaceholder="Guest rang to cancel"
          onConfirm={cancelBooking}
          onClose={() => setCancelling(null)}
        >
          <p style={{ fontSize: "0.8438rem", color: "var(--slate-soft)", margin: 0, lineHeight: 1.6 }}>
            {cancelling.status === "in-house"
              ? "This guest is checked in, so their room goes to housekeeping. Anything already on their bill stays owed — cancelling a booking does not write off money."
              : "The room is released for those dates and can be sold again. Anything already paid is not refunded here — that is a separate conversation with the guest."}
          </p>
        </ConfirmModal>
      )}

      {adding && <NewBookingModal onClose={() => setAdding(false)} onCreated={reload} />}
      {moving && <MoveRoomModal booking={moving} onClose={() => setMoving(null)} onMoved={reload} />}
      {editingDates && <BookingDatesModal booking={editingDates} onClose={() => setEditingDates(null)} onSaved={reload} />}
    </>
  );
}
