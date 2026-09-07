import { useState } from "react";
import { Plus, Search } from "lucide-react";
import api from "../lib/api";
import { useApi } from "../lib/useApi";
import { useAuth } from "../context/AuthContext";
import { LOCATIONS, BOOKING_STATUS } from "../lib/constants";
import { naira, cap } from "../lib/format";
import { PageHead, Card, Empty, Loading, ErrorNote, Chip } from "../components/ui";
import NewBookingModal from "../components/NewBookingModal";

const toneFor = (status) =>
  status === "in-house" ? "st-occupied" : status === "confirmed" ? "gold" : "st-maintenance";

export default function Bookings() {
  const { location } = useAuth();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [adding, setAdding] = useState(false);

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

      <ErrorNote>{error}</ErrorNote>

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
              {data.map((b) => (
                <tr key={b._id}>
                  <td className="mono" style={{ color: "var(--gold-deep)" }}>{b.ref}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{b.guest?.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--slate-faint)" }}>{cap(b.source)}</div>
                  </td>
                  <td className="mono">
                    {b.roomNumber}
                    <span style={{ color: "var(--slate-faint)", fontSize: 11.5 }}> {cap(b.roomType)}</span>
                  </td>
                  <td className="mono" style={{ fontSize: 12.5 }}>
                    {b.checkIn} → {b.checkOut}
                    <div style={{ color: "var(--slate-faint)", fontSize: 11.5 }}>
                      {b.nights} night{b.nights === 1 ? "" : "s"}
                    </div>
                  </td>
                  <td><Chip tone={toneFor(b.status)}>{BOOKING_STATUS[b.status]}</Chip></td>
                  <td className="mono" style={{ textAlign: "right" }}>
                    {naira(b.totalCharge)}
                    {b.balance > 0 && (
                      <div style={{ fontSize: 11.5, color: "var(--clay)" }}>{naira(b.balance)} due</div>
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
