import { useState } from "react";
import { CreditCard } from "lucide-react";
import api from "../lib/api";
import { useApi } from "../lib/useApi";
import { useAuth } from "../context/AuthContext";
import { naira } from "../lib/format";
import { Card, Metric, Empty, Loading, ErrorNote, Chip } from "./ui";
import PaymentModal from "./PaymentModal";

/**
 * Every stay's bill, on the front desk where it is settled. It used to be its
 * own screen, which meant checking someone out and taking their money were two
 * different places — the one moment in a shift where they are most obviously
 * the same job.
 */
export default function BillingPanel() {
  const { location } = useAuth();
  const [paying, setPaying] = useState(null);
  const { data, loading, error, reload } = useApi(() => api.folios(location), [location]);

  const rows = (data || []).slice().sort((a, b) => b.balance - a.balance);
  const outstanding = rows.reduce((s, r) => s + Math.max(0, r.balance), 0);
  const collected = rows.reduce((s, r) => s + r.paid, 0);
  const fromFacilities = rows.reduce((s, r) => s + (r.facilityCharges || 0), 0);
  const open = rows.filter((r) => r.balance > 0).length;

  return (
    <>
      <div className="grid g4" style={{ marginBottom: 20 }}>
        <Metric accent label="Still owed" value={naira(outstanding)} note="Across unpaid bills" />
        <Metric label="Collected" value={naira(collected)} note="All recorded payments" />
        <Metric label="Bar & restaurant" value={naira(fromFacilities)} note="Signed to rooms" />
        <Metric label="Unpaid bills" value={open} note="Awaiting settlement" />
      </div>

      <ErrorNote>{error}</ErrorNote>

      <Card title="Bills"
        sub="Largest balance first. Room charges and anything signed for at the bar are listed apart, so a guest querying a bill can see where each figure came from.">
        {loading ? <Loading /> : !rows.length ? (
          <Empty heading="No bills yet" text="A bill appears here as soon as a booking is created." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr><th>Bill</th><th>Guest</th><th>Room</th>
                    <th>Room charges</th><th>Bar &amp; restaurant</th>
                    <th>Paid</th><th>Balance</th><th style={{ textAlign: "right" }}>Action</th></tr>
              </thead>
              <tbody>
                {rows.map((f) => (
                  <tr key={f.bookingId}>
                    <td className="mono" style={{ color: "var(--gold-deep)" }}>{f.ref}</td>
                    <td>{f.guest}</td>
                    <td className="mono">{f.roomNumber}</td>
                    <td className="mono">{naira(f.roomCharges ?? f.charges)}</td>
                    {/* A guest disputing a bill needs the bar tab as its own
                        line, not folded into one blended total. */}
                    <td className="mono" style={{ color: f.facilityCharges ? "var(--slate)" : "var(--slate-faint)" }}>
                      {f.facilityCharges ? naira(f.facilityCharges) : "—"}
                    </td>
                    <td className="mono">{naira(f.paid)}</td>
                    <td className="mono" style={{ color: f.balance > 0 ? "var(--clay)" : "var(--sage)" }}>
                      {f.balance > 0 ? naira(f.balance) : "Settled"}
                    </td>
                    <td style={{ textAlign: "right" }}>
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

      {paying && <PaymentModal folio={paying} onClose={() => setPaying(null)} onPaid={reload} />}
    </>
  );
}
