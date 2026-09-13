import { useState } from "react";
import { TrendingUp } from "lucide-react";
import api from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { naira, today, addDays, prettyDate } from "../../lib/format";
import { Card, Metric, Loading, ErrorNote, Empty } from "../ui";

/**
 * What this one facility took, for the manager working it.
 *
 * Separate from the hotel-wide record on Records, and answering a different
 * question. That page is the business's month; this is the bar's week — what
 * sold, how it was paid for, and which of four people behind the counter took
 * it. "Is the Tuesday night crowd worth staying open for" is not a question a
 * monthly total can answer.
 */

const RANGES = [
  { key: "today", label: "Today", back: 0 },
  { key: "week", label: "Last 7 days", back: 6 },
  { key: "fortnight", label: "Last 14 days", back: 13 },
  { key: "month", label: "Last 30 days", back: 29 },
];

const METHOD_LABEL = {
  room: "Charged to rooms", cash: "Cash", pos: "Card", card: "Card", transfer: "Transfer",
};

export default function SalesCard({ facility }) {
  const [range, setRange] = useState("week");
  const back = RANGES.find((r) => r.key === range).back;
  const from = addDays(today(), -back);

  const { data, loading, error } = useApi(
    () => api.facilitySales(facility.id, from, today()),
    [facility.id, from]
  );

  const busiest = (data?.days || []).reduce((best, d) => (d.total > (best?.total || 0) ? d : best), null);

  return (
    <Card
      title={facility.name + " takings"}
      sub="This facility only. Voided orders are left out — a sale that was undone did not happen."
      action={
        <div className="quick-range" style={{ marginTop: 0 }}>
          {RANGES.map((r) => (
            <button key={r.key} className={"chip-btn" + (range === r.key ? " on" : "")}
              onClick={() => setRange(r.key)}>{r.label}</button>
          ))}
        </div>
      }
    >
      <div className="card-pad">
        <ErrorNote>{error}</ErrorNote>
        {loading ? <Loading /> : !data ? null : data.orders === 0 ? (
          <Empty heading="Nothing sold in this stretch" text="Settled orders show up here as soon as they are taken." />
        ) : (
          <>
            <div className="grid g4" style={{ marginBottom: 18 }}>
              <Metric accent label="Taken" value={naira(data.total)} note={data.orders + " orders"} />
              <Metric label="Average order" value={naira(data.averageOrder)} />
              <Metric label="Paid at the till" value={naira(data.paidAtTill)} />
              <Metric label="Signed to rooms" value={naira(data.chargedToRooms)} note="Owed on folios" />
            </div>

            <div className="grid g2" style={{ alignItems: "start", gap: 18 }}>
              <div>
                <h4 className="till-h4">How it was paid</h4>
                <table className="tbl">
                  <tbody>
                    {Object.entries(data.byMethod).sort((a, b) => b[1] - a[1]).map(([m, amount]) => (
                      <tr key={m}>
                        <td>{METHOD_LABEL[m] || m}</td>
                        <td className="mono" style={{ textAlign: "right" }}>{naira(amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <h4 className="till-h4" style={{ marginTop: 18 }}>Who took it</h4>
                <table className="tbl">
                  <tbody>
                    {data.byStaff.map((s) => (
                      <tr key={s.name}>
                        <td>{s.name}<div className="tc-meta">{s.orders} orders</div></td>
                        <td className="mono" style={{ textAlign: "right" }}>{naira(s.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <h4 className="till-h4">Day by day</h4>
                <table className="tbl">
                  <tbody>
                    {data.days.map((d) => (
                      <tr key={d.date} style={d.total === 0 ? { opacity: 0.5 } : undefined}>
                        <td>
                          {prettyDate(d.date)}
                          {busiest && d.date === busiest.date && d.total > 0 && (
                            <div className="tc-meta"><TrendingUp size={11} /> busiest</div>
                          )}
                        </td>
                        <td className="tc-meta">{d.orders || "—"}</td>
                        <td className="mono" style={{ textAlign: "right" }}>
                          {d.total ? naira(d.total) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {data.topItems.length > 0 && (
                  <>
                    <h4 className="till-h4" style={{ marginTop: 18 }}>Selling most</h4>
                    <table className="tbl">
                      <tbody>
                        {data.topItems.slice(0, 6).map((i) => (
                          <tr key={i.name}>
                            <td>{i.name}</td>
                            <td className="tc-meta">{i.qty}</td>
                            <td className="mono" style={{ textAlign: "right" }}>{naira(i.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
