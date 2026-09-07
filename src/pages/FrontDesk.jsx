import { useState } from "react";
import { Plus, Check } from "lucide-react";
import api from "../lib/api";
import { useApi } from "../lib/useApi";
import { useAuth } from "../context/AuthContext";
import { naira, cap, telUrl, today } from "../lib/format";
import { PageHead, Card, Empty, Loading, ErrorNote } from "../components/ui";
import NewBookingModal from "../components/NewBookingModal";

export default function FrontDesk() {
  const { location } = useAuth();
  const [tab, setTab] = useState("arrivals");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);

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
      if (e.status === 409 && e.payload?.balance) {
        // The server breaks the balance out, so say where it came from —
        // "the bar" is a different conversation from "the room".
        const fromBar = e.payload.facilityCharges
          ? "\n(" + naira(e.payload.facilityCharges) + " of that is bar and restaurant.)"
          : "";
        const ok = window.confirm(
          "This bill still owes " + naira(e.payload.balance) + "." + fromBar +
          "\n\nCheck out anyway and leave the balance owing?"
        );
        if (ok) {
          try { await api.checkOut(b._id, true); await reload(); }
          catch (e2) { setActionError(e2.message); }
        }
      } else {
        setActionError(e.message);
      }
    } finally { setBusyId(null); }
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
                    <div style={{ fontSize: 11.5 }}>
                      <a href={telUrl(b.guest?.phone)} style={{ borderBottom: "1px solid var(--line)", color: "var(--slate-faint)" }}>
                        {b.guest?.phone}
                      </a>
                    </div>
                  </td>
                  <td className="mono">
                    {b.roomNumber}
                    <div style={{ fontSize: 11.5, color: "var(--slate-faint)" }}>{cap(b.roomType)}</div>
                  </td>
                  <td className="mono" style={{ fontSize: 12.5 }}>{b.checkIn} → {b.checkOut}</td>
                  <td className="mono" style={{ fontSize: 12.5 }}>
                    {/* The room plus anything signed for at the bar — the same
                        total the balance below is worked out from. */}
                    {naira(b.totalCharges ?? b.totalCharge)}
                    <div style={{ fontSize: 11.5, color: b.balance > 0 ? "var(--clay)" : "var(--sage)" }}>
                      {b.balance > 0 ? naira(b.balance) + " outstanding" : "Settled"}
                    </div>
                    {b.facilityCharges > 0 && (
                      <div style={{ fontSize: 11, color: "var(--slate-faint)" }}>
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
    </>
  );
}
