import { useState } from "react";
import { CreditCard } from "lucide-react";
import api from "../lib/api";
import { useApi } from "../lib/useApi";
import { useAuth } from "../context/AuthContext";
import { naira } from "../lib/format";
import { PageHead, Card, Metric, Empty, Loading, ErrorNote, Chip } from "../components/ui";
import PaymentModal from "../components/PaymentModal";

export default function Billing() {
  const { location } = useAuth();
  const [paying, setPaying] = useState(null);
  const { data, loading, error, reload } = useApi(() => api.folios(location), [location]);

  const rows = (data || []).slice().sort((a, b) => b.balance - a.balance);
  const outstanding = rows.reduce((s, r) => s + Math.max(0, r.balance), 0);
  const collected = rows.reduce((s, r) => s + r.paid, 0);
  const open = rows.filter((r) => r.balance > 0).length;

  return (
    <>
      <PageHead title="Billing"
        blurb="Folios for every stay, with what is still owed. Card payments go through Paystack; cash, transfer and POS are recorded by hand." />

      <div className="grid g3" style={{ marginBottom: 20 }}>
        <Metric accent label="Outstanding" value={naira(outstanding)} note="Across open folios" />
        <Metric label="Collected" value={naira(collected)} note="All recorded payments" />
        <Metric label="Open folios" value={open} note="Awaiting settlement" />
      </div>

      <ErrorNote>{error}</ErrorNote>

      <Card>
        {loading ? <Loading /> : !rows.length ? (
          <Empty heading="No folios yet" text="Folios appear here as soon as a booking is created." />
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Folio</th><th>Guest</th><th>Room</th><th>Charges</th>
                  <th>Paid</th><th>Balance</th><th style={{ textAlign: "right" }}>Action</th></tr>
            </thead>
            <tbody>
              {rows.map((f) => (
                <tr key={f.bookingId}>
                  <td className="mono" style={{ color: "var(--gold-deep)" }}>{f.ref}</td>
                  <td>{f.guest}</td>
                  <td className="mono">{f.roomNumber}</td>
                  <td className="mono">{naira(f.charges)}</td>
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
        )}
      </Card>

      {paying && <PaymentModal folio={paying} onClose={() => setPaying(null)} onPaid={reload} />}
    </>
  );
}
