import { useState } from "react";
import { CreditCard, Receipt as ReceiptIcon } from "lucide-react";
import api from "../lib/api";
import { useApi } from "../lib/useApi";
import { useAuth } from "../context/AuthContext";
import { naira } from "../lib/format";
import { Card, Metric, Empty, Loading, ErrorNote, Note, Chip } from "./ui";
import PaymentModal from "./PaymentModal";
import BillDetail from "./BillDetail";

/**
 * Every stay's bill, on the front desk where it is settled.
 *
 * What this page is, and is not, matters. It is the ROOM bill. A drink bought
 * at the bar, an afternoon in the pool, a month in the gym — those are the
 * facility's own takings, settled at the facility's own till, and they never
 * appear here at all. The only facility money on this page is money a guest
 * specifically asked to put on their room, and when that happens it is listed
 * under the name of the facility it came from rather than folded into the room
 * total or filed under whichever facility happened to exist first.
 *
 * That distinction is not a presentational nicety. A receptionist looking at
 * ₦40,000 outstanding needs to know whether it is the room or the gym, because
 * those are two different conversations to have with the guest standing in
 * front of them.
 */
export default function BillingPanel() {
  const { location } = useAuth();
  const [paying, setPaying] = useState(null);
  const [viewing, setViewing] = useState(null);
  const { data, loading, error, reload } = useApi(() => api.folios(location), [location]);

  const rows = (data || []).slice().sort((a, b) => b.balance - a.balance);
  const outstanding = rows.reduce((s, r) => s + Math.max(0, r.balance), 0);
  const roomOwed = rows.reduce((s, r) => s + Math.max(0, Math.min(r.balance, r.roomCharges - r.paid)), 0);
  const signedToRooms = rows.reduce((s, r) => s + (r.facilityCharges || 0), 0);
  const open = rows.filter((r) => r.balance > 0).length;

  return (
    <>
      <div className="grid g4" style={{ marginBottom: 20 }}>
        <Metric accent label="Still owed" value={naira(outstanding)} note="Across unpaid bills" />
        <Metric label="Unpaid bills" value={open} note="Awaiting settlement" />
        <Metric label="Signed to rooms" value={naira(signedToRooms)}
          note="From the bar, pool and gym" />
        <Metric label="Collected" value={naira(rows.reduce((s, r) => s + r.paid, 0))}
          note="Against these bills" />
      </div>

      <ErrorNote>{error}</ErrorNote>

      <Card
        title="Bills"
        sub="Largest balance first. These are room bills — anything a guest paid for at a facility till is settled there and never reaches this page."
      >
        {loading ? <Loading /> : !rows.length ? (
          <Empty heading="No bills yet" text="A bill appears here as soon as a booking is created." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Bill</th><th>Guest</th><th>Room</th>
                  <th>The room</th>
                  <th>Signed to the room</th>
                  <th>Paid</th><th>Balance</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((f) => (
                  <tr key={f.bookingId}>
                    <td className="mono" style={{ color: "var(--gold-deep)" }}>{f.ref}</td>
                    <td>{f.guest}</td>
                    <td className="mono">{f.roomNumber}</td>
                    <td className="mono">{naira(f.roomCharges ?? f.charges)}</td>
                    {/* Named, not lumped. "Bar & restaurant" was the honest
                        label when the bar was the only facility; it is a lie
                        now that a pool entry and a gym term can land here. */}
                    <td>
                      {f.facilityCharges
                        ? <FacilityLines breakdown={f.facilityBreakdown} total={f.facilityCharges} />
                        : <span style={{ color: "var(--slate-faint)" }}>Nothing signed</span>}
                    </td>
                    <td className="mono">{naira(f.paid)}</td>
                    <td className="mono" style={{ color: f.balance > 0 ? "var(--clay)" : "var(--sage)" }}>
                      {f.balance > 0 ? naira(f.balance) : "Settled"}
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button className="btn btn-sm btn-quiet" onClick={() => setViewing(f)}>
                        <ReceiptIcon size={13} /> Bill
                      </button>
                      {f.balance > 0
                        ? <button className="btn btn-sm btn-gold" onClick={() => setPaying(f)}>
                            <CreditCard size={13} /> Take payment
                          </button>
                        : <Chip tone="st-available">Paid in full</Chip>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div style={{ marginTop: 16 }}>
        <Note>
          The bar, pool and gym keep their own takings. A guest who paid at the
          till is square with the hotel and has no bill here — only what they asked
          to put on their room shows up, under the name of the place they spent it.
          Facility takings in full are on Records.
        </Note>
      </div>

      {paying && <PaymentModal folio={paying} onClose={() => setPaying(null)} onPaid={reload} />}
      {viewing && <BillDetail bookingId={viewing.bookingId} onClose={() => setViewing(null)} />}
    </>
  );
}

/** Which facilities, at a glance, without opening the bill. */
function FacilityLines({ breakdown, total }) {
  const lines = breakdown || [];
  if (lines.length === 0) return <span className="mono">{naira(total)}</span>;
  return (
    <div className="fac-lines">
      {lines.map((l) => (
        <div key={String(l.facilityId)}>
          <span>{l.name}</span>
          <span className="mono">{naira(l.amount)}</span>
        </div>
      ))}
      {lines.length > 1 && (
        <div className="fl-total">
          <span>Together</span>
          <span className="mono">{naira(total)}</span>
        </div>
      )}
    </div>
  );
}
