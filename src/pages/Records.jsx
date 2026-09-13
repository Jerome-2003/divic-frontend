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

  const [kind, setKind] = useState("range");
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
          ? "Sales and performance across both properties. Pick any two dates — the 9th to the 22nd of September, a single Saturday, a whole month — or take a named month or year."
          : "Sales and performance for this property. Pick any two dates — the 9th to the 22nd of September, a single Saturday, a whole month — or take a named month or year."}
      >
        <button className="btn btn-gold" disabled={!data} onClick={takeCopy}>
          <Printer size={15} /> Save as PDF or print
        </button>
      </PageHead>

      {due.length > 0 && <ReportDuePrompt due={due} onOpen={openDue} />}

      <Card>
        <div className="card-pad">
          {/* Three buttons rather than a dropdown. Choosing your own dates is
              the everyday use of this page, and it was one option down a select
              that opened on "One month" — which is to say invisible. */}
          <div className="tabs tabs-sub" style={{ marginBottom: 14 }}>
            <button className={kind === "range" ? "on" : ""} onClick={() => setKind("range")}>
              Choose the dates
            </button>
            <button className={kind === "month" ? "on" : ""} onClick={() => setKind("month")}>
              A whole month
            </button>
            <button className={kind === "year" ? "on" : ""} onClick={() => setKind("year")}>
              A whole year
            </button>
          </div>

          {kind === "month" ? (
            <Row>
              <Field label="Which month" htmlFor="rm">
                <input id="rm" type="month" value={month} max={today().slice(0, 7)}
                  onChange={(e) => setMonth(e.target.value)} />
              </Field>
              <div />
            </Row>
          ) : kind === "year" ? (
            <Row>
              <Field label="Which year" htmlFor="ry">
                <select id="ry" value={year} onChange={(e) => setYear(e.target.value)}>
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </Field>
              <div />
            </Row>
          ) : (
            <>
              <Row>
                <Field label="First day" htmlFor="rf">
                  <input id="rf" type="date" value={from} max={to}
                    onChange={(e) => setFrom(e.target.value)} />
                </Field>
                <Field label="Last day" htmlFor="rt">
                  <input id="rt" type="date" value={to} min={from} max={today()}
                    onChange={(e) => setTo(e.target.value)} />
                </Field>
              </Row>
              {/* Said out loud, because an end date that is or is not counted is
                  the thing everyone assumes differently. */}
              <p className="tc-meta" style={{ margin: "2px 0 12px" }}>
                Both days are counted — the 9th to the 22nd is fourteen days, not thirteen.
              </p>
              <div className="quick-range">
                {[
                  ["Today", 0], ["Last 7 days", 6], ["Last 14 days", 13],
                  ["Last 30 days", 29], ["Last 90 days", 89],
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
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() => { setFrom(today().slice(0, 8) + "01"); setTo(today()); }}
                >
                  This month so far
                </button>
              </div>
            </>
          )}
        </div>
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
