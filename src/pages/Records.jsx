import { useState } from "react";
import { Printer, FileText } from "lucide-react";
import api from "../lib/api";
import { useApi } from "../lib/useApi";
import { useAuth } from "../context/AuthContext";
import { naira, today, addDays } from "../lib/format";
import { PageHead, Card, Field, Row, Loading, ErrorNote, Note, Metric } from "../components/ui";
import PerformanceReport from "../components/PerformanceReport";
import ReportDuePrompt from "../components/ReportDuePrompt";

/**
 * The record of a stretch of trading — a month, a year, or any run of days.
 *
 * Kept apart from Analytics deliberately. That page answers "how are we
 * doing", and to do it honestly it has to keep moving: the same screen says
 * something different next week. This one answers "what was the first week of
 * September", which has one answer forever, and can therefore be printed,
 * filed, and read again next year meaning the same thing.
 *
 * A month and a year are named periods; anything else is a range. The
 * distinction is not pedantry — a named period closes, and a closed period is
 * something the business owes itself a copy of, which is what the prompt at
 * the top of this page is for. A range is a question somebody asked once.
 */

const MONTHS = ["January","February","March","April","May","June",
  "July","August","September","October","November","December"];

/** The month that just ended — what somebody opening this usually wants. */
function lastMonth() {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 10).slice(0, 7);
}

export default function Records() {
  const { user } = useAuth();
  const thisYear = new Date().getUTCFullYear();

  const [kind, setKind] = useState("month");
  const [month, setMonth] = useState(lastMonth());
  const [year, setYear] = useState(String(thisYear));
  const [from, setFrom] = useState(addDays(today(), -6));
  const [to, setTo] = useState(today());

  const params =
    kind === "month" ? { period: "month", month }
    : kind === "year" ? { period: "year", year }
    : { period: "range", from, to };

  const { data, loading, error } = useApi(
    () => api.performanceReport(params),
    [kind, month, year, from, to]
  );

  const dueApi = useApi(() => api.reportsDue(), []);
  const due = dueApi.data?.due || [];

  const years = [];
  for (let y = thisYear; y >= thisYear - 5; y--) years.push(String(y));

  /** Print, and — for a named period — record that a copy was taken. */
  const takeCopy = async () => {
    window.print();
    // Recorded after printing, not on opening the page: looking at September
    // on screen is not the same as having a copy of it.
    if (kind === "month" || kind === "year") {
      try {
        await api.markReportTaken(kind, kind === "month" ? month : year);
        await dueApi.reload();
      } catch { /* the report is printed either way; the prompt can wait */ }
    }
  };

  const openDue = (d) => {
    setKind(d.kind);
    if (d.kind === "month") setMonth(d.period); else setYear(d.period);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <PageHead
        title="Records"
        blurb={user.location === "all"
          ? "Sales and performance across both properties — a month, a year, or any run of days."
          : "Sales and performance for this property — a month, a year, or any run of days."}
      >
        <button className="btn btn-gold" disabled={!data} onClick={takeCopy}>
          <Printer size={15} /> Save as PDF or print
        </button>
      </PageHead>

      {due.length > 0 && <ReportDuePrompt due={due} onOpen={openDue} />}

      <Card>
        <Row>
          <Field label="Cover" htmlFor="rk">
            <select id="rk" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="month">One month</option>
              <option value="year">A whole year</option>
              <option value="range">Any dates I choose</option>
            </select>
          </Field>
          {kind === "month" ? (
            <Field label="Which month" htmlFor="rm">
              <input id="rm" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </Field>
          ) : kind === "year" ? (
            <Field label="Which year" htmlFor="ry">
              <select id="ry" value={year} onChange={(e) => setYear(e.target.value)}>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>
          ) : (
            <>
              <Field label="From" htmlFor="rf">
                <input id="rf" type="date" value={from} max={to}
                  onChange={(e) => setFrom(e.target.value)} />
              </Field>
              <Field label="To" htmlFor="rt">
                <input id="rt" type="date" value={to} min={from} max={today()}
                  onChange={(e) => setTo(e.target.value)} />
              </Field>
            </>
          )}
        </Row>

        {kind === "range" && (
          <div className="quick-range">
            {[
              ["Today", 0], ["Last 7 days", 6], ["Last 14 days", 13], ["Last 30 days", 29], ["Last 90 days", 89],
            ].map(([label, back]) => (
              <button
                key={label}
                type="button"
                className={"chip-btn" + (from === addDays(today(), -back) && to === today() ? " on" : "")}
                onClick={() => { setFrom(addDays(today(), -back)); setTo(today()); }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </Card>

      <div style={{ marginTop: 16 }}>
        <ErrorNote>{error}</ErrorNote>
      </div>

      {loading ? <Loading label="Working out the period" /> : data && (
        <>
          <div className="grid g4" style={{ margin: "20px 0" }}>
            <Metric accent label="Total revenue" value={naira(data.totals.revenue.total)} note={data.period.label} />
            <Metric label="Rooms" value={naira(data.totals.revenue.rooms)} note={data.totals.rooms.nightsSold + " nights sold"} />
            <Metric label="Bar, pool and gym" value={naira(data.totals.revenue.facilities)} note="Across every facility" />
            <Metric label="Occupancy" value={data.totals.rooms.occupancyPercent + "%"} note={"ADR " + naira(data.totals.rooms.averageDailyRate)} />
          </div>

          <Card
            title="The report"
            sub="Exactly what prints. The print dialog's destination list includes Save as PDF on every computer, which is how you get the filed copy."
          >
            <div className="report-frame">
              <PerformanceReport report={data} />
            </div>
          </Card>

          <div style={{ marginTop: 16 }}>
            <Note icon={FileText}>
              Revenue is what the period sold; money collected is what actually arrived.
              A stay booked in one month and paid for in the next belongs to both, so the
              two figures rarely match — that is expected, and the report says so on its face.
            </Note>
          </div>
        </>
      )}
    </>
  );
}
