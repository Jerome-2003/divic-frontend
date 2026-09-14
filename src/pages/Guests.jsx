import { useEffect, useState } from "react";
import { Search, Phone } from "lucide-react";
import api from "../lib/api";
import { useApi } from "../lib/useApi";
import { LOCATIONS } from "../lib/constants";
import { naira, telUrl } from "../lib/format";
import { PageHead, Card, Modal, Empty, Loading, ErrorNote, Note, Chip } from "../components/ui";

/* A page at a time. Fifty rows is about a screen and a half — enough that the
   person you want is usually already there, small enough that the request is
   quick on a phone at the desk. */
const PAGE = 50;

export default function Guests() {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent");
  const [skip, setSkip] = useState(0);
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  // A different search, or a different order, is a different list.
  useEffect(() => { setSkip(0); setRows([]); }, [q, sort]);

  const { data, loading, error } = useApi(
    () => api.guests({ q: q || undefined, sort, skip, limit: PAGE }),
    [q, sort, skip]
  );

  /* Pages accumulate rather than replace, so Show more adds to what is on
     screen instead of moving it. Deduplicated by id: a guest added at the desk
     between two pages would otherwise shift the window and appear twice. */
  useEffect(() => {
    if (!data) return;
    setRows((prev) => {
      const page = data.guests || [];
      const next = skip === 0 ? page : [...prev, ...page];
      const seen = new Set();
      return next.filter((g) => !seen.has(g._id) && seen.add(g._id));
    });
  }, [data]);   // eslint-disable-line react-hooks/exhaustive-deps

  const { data: detail } = useApi(() => api.guest(selectedId), [selectedId], { skip: !selectedId });

  const total = data?.total ?? 0;
  const first = loading && !rows.length;

  return (
    <>
      <PageHead title="Guests"
        blurb={"Guest records are shared across both properties, so a returning guest is recognised at either address. " +
          "They are kept for good — nothing here is cleared at the end of a day."} />

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 240, maxWidth: 380 }}>
          <Search size={15} style={{ position: "absolute", left: 11, top: 11, color: "var(--slate-faint)" }} />
          <input placeholder="Search by name, phone or email" value={q}
            onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 34 }} />
        </div>
        {/* Most recent first by default. The desk is nearly always looking for
            somebody it dealt with in the last day or two, and A–Z buries them
            in the middle of the alphabet. */}
        <div style={{ display: "flex", gap: 5 }}>
          <button className={"chip-btn" + (sort === "recent" ? " on" : "")}
            onClick={() => setSort("recent")}>Recent</button>
          <button className={"chip-btn" + (sort === "name" ? " on" : "")}
            onClick={() => setSort("name")}>A–Z</button>
        </div>
      </div>

      <ErrorNote>{error}</ErrorNote>

      <Card>
        {first ? <Loading /> : !rows.length ? (
          q
            ? <Empty heading="No guests match" text="Try a different name or number." />
            : <Empty heading="No guest records yet" text="A record is created the first time somebody books or checks in." />
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Guest</th><th>Contact</th><th>Stays</th><th>Last stay</th>
                  <th style={{ textAlign: "right" }}>Lifetime value</th></tr>
            </thead>
            <tbody>
              {rows.map((g) => (
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

      {/* The list is a window on a longer one, and it says so. Without this a
          guest past the end of the page reads as a record that is gone. */}
      {rows.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12, flexWrap: "wrap", marginTop: 12,
        }}>
          <span style={{ fontSize: "0.7812rem", color: "var(--slate-faint)" }}>
            Showing {rows.length} of {total}{q ? " matching" : ""} guest{total === 1 ? "" : "s"}
          </span>
          {data?.hasMore && (
            <button className="btn btn-sm" disabled={loading} onClick={() => setSkip(rows.length)}>
              {loading ? "Loading" : "Show more"}
            </button>
          )}
        </div>
      )}

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
