import { useState } from "react";
import { Plus, Check } from "lucide-react";
import api from "../lib/api";
import { useApi } from "../lib/useApi";
import { useAuth } from "../context/AuthContext";
import { naira, cap, telUrl, today } from "../lib/format";
import { PageHead, Card, Empty, Loading, ErrorNote, ConfirmModal } from "../components/ui";
import NewBookingModal from "../components/NewBookingModal";

export default function FrontDesk() {
  const { location } = useAuth();
  const [tab, setTab] = useState("arrivals");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);
  // The server refuses a checkout with money owing; this holds the booking and
  // the server's own breakdown while the desk decides whether to override.
  const [owing, setOwing] = useState(null);

  const { data, loading, error, reload } = useApi(() => api.bookings(location), [location]);
  const t = today();

  const arrivals = (data || []).filter((b) => b.status === "confirmed" && b.checkIn <= t);
  const inHouse = (data || []).filter((b) => b.status === "in-house");
  const departures = inHouse.filter((b) => b.checkOut <= t);
  const list = tab === "arrivals" ? arrivals : tab === "departures" ? departures : inHouse;

  const doCheckIn = async (b) => {
    setBusyId(b._id); setActionError(null);
    try { await api.checkIn(b._id); await reload(); }
    catch (e) { setActionError(e.message); }
    finally { setBusyId(null); }
  };

  const doCheckOut = async (b) => {
    setBusyId(b._id); setActionError(null);
    try {
      await api.checkOut(b._id);
      await reload();
    } catch (e) {
      // The server refuses a checkout with money owing unless it is overridden.
      // It breaks the balance out, so the dialog can show where each figure
      // came from — "the bar" is a different conversation from "the room".
      if (e.status === 409 && e.payload?.balance) setOwing({ booking: b, ...e.payload });
      else setActionError(e.message);
    } finally { setBusyId(null); }
  };

  const forceCheckOut = async () => {
    const b = owing.booking;
    setBusyId(b._id); setActionError(null);
    try { await api.checkOut(b._id, true); setOwing(null); await reload(); }
    catch (e) { setActionError(e.message); setOwing(null); }
    finally { setBusyId(null); }
  };

  return (
    <>
      <PageHead title="Front desk" blurb="Check guests in and out, and see who is in the building right now.">
        <button className="btn btn-gold" onClick={() => setAdding(true)}><Plus size={15} /> Walk-in booking</button>
      </PageHead>

      <div className="tabs">
        <button className={tab === "arrivals" ? "on" : ""} onClick={() => setTab("arrivals")}>Arrivals ({arrivals.length})</button>
        <button className={tab === "inhouse" ? "on" : ""} onClick={() => setTab("inhouse")}>Staying ({inHouse.length})</button>
        <button className={tab === "departures" ? "on" : ""} onClick={() => setTab("departures")}>Departures ({departures.length})</button>
      </div>

      <ErrorNote>{error || actionError}</ErrorNote>

      <Card>
        {loading ? <Loading /> : list.length === 0 ? (
          <Empty heading="Nothing here right now"
            text={tab === "arrivals" ? "No guests are waiting to check in."
              : tab === "departures" ? "No one is due to check out."
              : "No guests are staying right now."} />
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Guest</th><th>Room</th><th>Stay</th><th>Bill</th><th style={{ textAlign: "right" }}>Action</th></tr>
            </thead>
            <tbody>
              {list.map((b) => (
                <tr key={b._id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{b.guest?.name}</div>
                    <div style={{ fontSize: "0.7188rem" }}>
                      <a href={telUrl(b.guest?.phone)} style={{ borderBottom: "1px solid var(--line)", color: "var(--slate-faint)" }}>
                        {b.guest?.phone}
                      </a>
                    </div>
                  </td>
                  <td className="mono">
                    {b.roomNumber}
                    <div style={{ fontSize: "0.7188rem", color: "var(--slate-faint)" }}>{cap(b.roomType)}</div>
                  </td>
                  <td className="mono" style={{ fontSize: "0.7812rem" }}>{b.checkIn} → {b.checkOut}</td>
                  <td className="mono" style={{ fontSize: "0.7812rem" }}>
                    {/* The room plus anything signed for at the bar — the same
                        total the balance below is worked out from. */}
                    {naira(b.totalCharges ?? b.totalCharge)}
                    <div style={{ fontSize: "0.7188rem", color: b.balance > 0 ? "var(--clay)" : "var(--sage)" }}>
                      {b.balance > 0 ? naira(b.balance) + " outstanding" : "Settled"}
                    </div>
                    {b.facilityCharges > 0 && (
                      <div style={{ fontSize: "0.6875rem", color: "var(--slate-faint)" }}>
                        incl. {naira(b.facilityCharges)} bar
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {b.status === "confirmed" && (
                      <button className="btn btn-sm btn-gold" disabled={busyId === b._id} onClick={() => doCheckIn(b)}>
                        <Check size={14} /> {busyId === b._id ? "Working" : "Check in"}
                      </button>
                    )}
                    {b.status === "in-house" && (
                      <button className="btn btn-sm" disabled={busyId === b._id} onClick={() => doCheckOut(b)}>
                        {busyId === b._id ? "Working" : "Check out"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {adding && <NewBookingModal onClose={() => setAdding(false)} onCreated={reload} />}

      {owing && (
        <ConfirmModal
          title="This bill is not settled"
          blurb={owing.booking.guest?.name + " · room " + owing.booking.roomNumber}
          destructive
          confirmLabel="Check out anyway"
          cancelLabel="Take payment first"
          busy={busyId === owing.booking._id}
          onConfirm={forceCheckOut}
          onClose={() => setOwing(null)}
        >
          <table className="tbl" style={{ marginBottom: 16 }}>
            <tbody>
              <tr>
                <td>Room charges</td>
                <td className="mono" style={{ textAlign: "right" }}>{naira(owing.roomCharges)}</td>
              </tr>
              {owing.facilityCharges > 0 && (
                <tr>
                  <td>Bar &amp; restaurant</td>
                  <td className="mono" style={{ textAlign: "right" }}>{naira(owing.facilityCharges)}</td>
                </tr>
              )}
              <tr>
                <td>Paid so far</td>
                <td className="mono" style={{ textAlign: "right" }}>{naira(owing.paid)}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 500 }}>Still owing</td>
                <td className="mono" style={{ textAlign: "right", fontWeight: 500, color: "var(--brick)" }}>
                  {naira(owing.balance)}
                </td>
              </tr>
            </tbody>
          </table>
          <p style={{ fontSize: "0.8438rem", color: "var(--slate-soft)", margin: 0, lineHeight: 1.6 }}>
            Checking out now leaves this balance owing against the stay. It stays on
            the bill and shows on the billing screen until someone settles it.
          </p>
        </ConfirmModal>
      )}
    </>
  );
}
