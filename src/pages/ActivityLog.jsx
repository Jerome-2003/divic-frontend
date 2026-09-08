import { useState } from "react";
import api from "../lib/api";
import { useApi } from "../lib/useApi";
import { LOCATIONS, ROLE_LABEL } from "../lib/constants";
import { prettyDateTime } from "../lib/format";
import { PageHead, Card, Empty, Loading, ErrorNote } from "../components/ui";

export default function ActivityLog() {
  const [scope, setScope] = useState("all");
  const [entity, setEntity] = useState("");

  const { data, loading, error } = useApi(
    () => api.audit({ location: scope, entity: entity || undefined }),
    [scope, entity]
  );

  return (
    <>
      <PageHead title="Activity log"
        blurb="Every change to a booking, room, rate or payment, with who made it and when.">
        <div style={{ display: "flex", gap: 8 }}>
          <select value={scope} onChange={(e) => setScope(e.target.value)} style={{ width: 180 }}>
            <option value="all">Both properties</option>
            <option value="exclusive">Divic Exclusive</option>
            <option value="urban">Divic Urban</option>
          </select>
          <select value={entity} onChange={(e) => setEntity(e.target.value)} style={{ width: 160 }}>
            <option value="">Everything</option>
            <option value="Booking">Bookings</option>
            <option value="Room">Rooms</option>
            <option value="Payment">Payments</option>
            <option value="Rate">Rates</option>
            <option value="User">Staff</option>
          </select>
        </div>
      </PageHead>

      <ErrorNote>{error}</ErrorNote>

      <Card>
        {loading ? <Loading /> : !data?.length ? (
          <Empty heading="Nothing logged yet" text="Actions appear here as staff work through the day." />
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>When</th><th>Who</th><th>Property</th><th>What happened</th></tr>
            </thead>
            <tbody>
              {data.map((a) => (
                <tr key={a._id}>
                  <td className="mono" style={{ fontSize: "0.7812rem", whiteSpace: "nowrap" }}>
                    {prettyDateTime(a.at)}
                  </td>
                  <td>
                    <div style={{ fontSize: "0.8125rem" }}>{a.userName}</div>
                    <div style={{ fontSize: "0.7188rem", color: "var(--slate-faint)" }}>
                      {ROLE_LABEL[a.role] || a.role}
                    </div>
                  </td>
                  <td style={{ fontSize: "0.7812rem" }}>
                    {a.location === "all" ? "Both" : LOCATIONS[a.location]?.name || "—"}
                  </td>
                  <td style={{ fontSize: "0.8125rem" }}>{a.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
