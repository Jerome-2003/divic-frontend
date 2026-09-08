import { useState } from "react";
import { Search, Phone } from "lucide-react";
import api from "../lib/api";
import { useApi } from "../lib/useApi";
import { LOCATIONS } from "../lib/constants";
import { naira, telUrl } from "../lib/format";
import { PageHead, Card, Modal, Empty, Loading, ErrorNote, Note, Chip } from "../components/ui";

export default function Guests() {
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const { data, loading, error } = useApi(() => api.guests(q || undefined), [q]);
  const { data: detail } = useApi(() => api.guest(selectedId), [selectedId], { skip: !selectedId });

  return (
    <>
      <PageHead title="Guests"
        blurb="Guest records are shared across both properties, so a returning guest is recognised at either address." />

      <div style={{ position: "relative", marginBottom: 16, maxWidth: 380 }}>
        <Search size={15} style={{ position: "absolute", left: 11, top: 11, color: "var(--slate-faint)" }} />
        <input placeholder="Search by name, phone or email" value={q}
          onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 34 }} />
      </div>

      <ErrorNote>{error}</ErrorNote>

      <Card>
        {loading ? <Loading /> : !data?.length ? (
          <Empty heading="No guests match" text="Try a different name or number." />
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Guest</th><th>Contact</th><th>Stays</th><th>Last stay</th>
                  <th style={{ textAlign: "right" }}>Lifetime value</th></tr>
            </thead>
            <tbody>
              {data.map((g) => (
                <tr key={g._id} style={{ cursor: "pointer" }} onClick={() => setSelectedId(g._id)}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{g.name}</div>
                    <div style={{ fontSize: "0.7188rem", color: "var(--slate-faint)" }}>
                      {g.idType !== "None" ? g.idType + " on file" : "No ID on file"}
                      {g.properties?.length > 1 && " · both properties"}
                    </div>
                  </td>
                  <td style={{ fontSize: "0.7812rem" }}>
                    <a href={telUrl(g.phone)} onClick={(e) => e.stopPropagation()}
                       style={{ borderBottom: "1px solid var(--line)" }}>{g.phone}</a>
                    <div style={{ color: "var(--slate-faint)", fontSize: "0.7188rem" }}>{g.email}</div>
                  </td>
                  <td className="mono">{g.stays}</td>
                  <td className="mono" style={{ fontSize: "0.7812rem" }}>{g.lastStay || "—"}</td>
                  <td className="mono" style={{ textAlign: "right" }}>{naira(g.spend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {selectedId && detail && (
        <Modal title={detail.name}
          blurb={detail.idType !== "None" ? detail.idType + " " + (detail.idNumber || "") : "No ID on file"}
          onClose={() => setSelectedId(null)}
          footer={<button className="btn" onClick={() => setSelectedId(null)}>Close</button>}>

          <div className="contact-line">
            <Phone size={14} style={{ color: "var(--gold-deep)" }} />
            <a href={telUrl(detail.phone)}>{detail.phone}</a>
          </div>
          {detail.email && <div className="contact-line" style={{ paddingLeft: 21 }}>{detail.email}</div>}
          {detail.notes && <div style={{ margin: "14px 0" }}><Note>{detail.notes}</Note></div>}

          <h3 style={{ fontSize: "1.125rem", margin: "18px 0 8px" }}>Stay history</h3>
          {!detail.stays?.length ? (
            <p style={{ fontSize: "0.8125rem", color: "var(--slate-soft)" }}>No stays recorded yet.</p>
          ) : (
            <table className="tbl">
              <tbody>
                {detail.stays.map((b) => (
                  <tr key={b._id}>
                    <td className="mono" style={{ color: "var(--gold-deep)" }}>{b.ref}</td>
                    <td style={{ fontSize: "0.7812rem" }}>{LOCATIONS[b.location].name}</td>
                    <td className="mono" style={{ fontSize: "0.7812rem" }}>{b.checkIn}</td>
                    <td><Chip tone="st-maintenance">{b.status}</Chip></td>
                    <td className="mono" style={{ textAlign: "right" }}>{naira(b.totalCharge)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Modal>
      )}
    </>
  );
}
