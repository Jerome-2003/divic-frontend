import { useState } from "react";
import { Printer, FileText } from "lucide-react";
import api from "../lib/api";
import { useApi } from "../lib/useApi";
import { useAuth } from "../context/AuthContext";
import { naira } from "../lib/format";
import { PageHead, Card, Field, Row, Loading, ErrorNote, Note, Metric } from "../components/ui";
import PerformanceReport from "../components/PerformanceReport";

/**
 * The filed record of a month or a year.
 *
 * Kept apart from Analytics deliberately. That page answers "how are we doing",
 * and to do it honestly it has to keep moving — the same screen says something
 * different next week. This one answers "what was September", which has one
 * answer forever, and is the thing an owner actually needs at a month end: a
 * page that can be printed, filed, and read again next year meaning the same
 * thing.
 */

const MONTHS = ["January","February","March","April","May","June",
  "July","August","September","October","November","December"];

/** The month that just ended, which is what somebody opening this usually wants. */
function lastMonth() {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 7);
}

export default function Records() {
  const { user } = useAuth();
  const thisYear = new Date().getUTCFullYear();

  const [kind, setKind] = useState("month");
  const [month, setMonth] = useState(lastMonth());
  const [year, setYear] = useState(String(thisYear));

  const { data, loading, error } = useApi(
    () => api.performanceReport(kind === "month" ? { period: "month", month } : { period: "year", year }),
    [kind, month, year]
  );

  const years = [];
  for (let y = thisYear; y >= thisYear - 5; y--) years.push(String(y));

  return (
    <>
      <PageHead
        title="Records"
        blurb={user.location === "all"
          ? "Sales and performance across both properties, for a month or a whole year."
          : "Sales and performance for this property, for a month or a whole year."}
      >
        <button className="btn btn-gold" disabled={!data} onClick={() => window.print()}>
          <Printer size={15} /> Save as PDF or print
        </button>
      </PageHead>

      <Card>
        <Row>
          <Field label="Cover" htmlFor="rk">
            <select id="rk" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="month">One month</option>
              <option value="year">A whole year</option>
            </select>
          </Field>
          {kind === "month" ? (
            <Field label="Which month" htmlFor="rm">
              <input id="rm" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </Field>
          ) : (
            <Field label="Which year" htmlFor="ry">
              <select id="ry" value={year} onChange={(e) => setYear(e.target.value)}>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>
          )}
        </Row>
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
            {/* Boxed so what appears here is unmistakably the sheet of paper,
                not a screen that will be reformatted on its way out. */}
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
