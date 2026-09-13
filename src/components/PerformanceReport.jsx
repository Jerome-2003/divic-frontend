import { naira, cap, prettyDateTime } from "../lib/format";

/**
 * The month-end or year-end record, laid out to be printed and filed.
 *
 * This is a document, not a dashboard. Everything on the Analytics screen is a
 * rolling view of the last so-many days, which is right for running the hotel
 * and useless for answering what September was — by October it says something
 * different. A report over a fixed window will read the same next March as it
 * does today, which is the only reason it is worth putting on paper.
 *
 * Printing goes through the browser, as the bar receipt does: every desktop
 * print dialog carries "Save as PDF", so the PDF and the printed page come from
 * one layout that cannot drift out of step with itself.
 *
 * Two revenue figures sit side by side here and they are not the same number.
 * Charged is what the period sold; collected is what arrived. A guest who books
 * in September and pays in October puts them out of step — which is normal, and
 * said on the page rather than quietly reconciled away.
 */
export default function PerformanceReport({ report }) {
  const { period, properties, totals, months, collective } = report;

  return (
    <div className="report-paper" id="report-paper">
      <header className="rp-head">
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" width="58" height="58" />
        <div className="rp-titles">
          <div className="rp-house">Divic Exclusive Hotels</div>
          <h1 className="rp-title">
            {collective ? "Sales and performance" : properties[0]?.name}
          </h1>
          <div className="rp-period">{period.label}</div>
        </div>
        <div className="rp-stamp">
          <div>{period.kind === "year" ? "Annual record" : "Monthly record"}</div>
          <div>{period.from} to {period.to}</div>
          <div>Prepared {prettyDateTime(report.generatedAt)}</div>
        </div>
      </header>

      <div className="rp-rule" />

      <Section title={collective ? "Both properties together" : "The period"}>
        <div className="rp-figures">
          <Figure label="Total revenue" value={naira(totals.revenue.total)} lead />
          <Figure label="Rooms" value={naira(totals.revenue.rooms)} />
          <Figure label="Bar, pool and gym" value={naira(totals.revenue.facilities)} />
          <Figure label="Occupancy" value={totals.rooms.occupancyPercent + "%"} />
          <Figure label="Average daily rate" value={naira(totals.rooms.averageDailyRate)} />
          <Figure label="RevPAR" value={naira(totals.rooms.revPAR)} />
        </div>
        <p className="rp-foot">
          {totals.rooms.bookings} bookings, {totals.rooms.nightsSold} room nights sold of{" "}
          {totals.rooms.nightsAvailable} available.
          {totals.rooms.discountsGiven > 0 &&
            " " + naira(totals.rooms.discountsGiven) + " was given away in offers."}
        </p>
      </Section>

      {collective && (
        <Section title="By property">
          <table className="rp-table">
            <thead>
              <tr>
                <th>Property</th><th>Rooms</th><th>Facilities</th><th>Total</th>
                <th>Occupancy</th><th>ADR</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td className="num">{naira(p.revenue.rooms)}</td>
                  <td className="num">{naira(p.revenue.facilities)}</td>
                  <td className="num strong">{naira(p.revenue.total)}</td>
                  <td className="num">{p.rooms.occupancyPercent}%</td>
                  <td className="num">{naira(p.rooms.averageDailyRate)}</td>
                </tr>
              ))}
              <tr className="rp-total">
                <td>Together</td>
                <td className="num">{naira(totals.revenue.rooms)}</td>
                <td className="num">{naira(totals.revenue.facilities)}</td>
                <td className="num strong">{naira(totals.revenue.total)}</td>
                <td className="num">{totals.rooms.occupancyPercent}%</td>
                <td className="num">{naira(totals.rooms.averageDailyRate)}</td>
              </tr>
            </tbody>
          </table>
          {/* Said plainly because averaging the two branch figures is the
              obvious thing to do and gives a number true of neither. */}
          <p className="rp-foot">
            Occupancy and the average rate on the Together line are worked out from the
            combined totals, not averaged between the two properties.
          </p>
        </Section>
      )}

      <Section title="Rooms sold">
        <table className="rp-table">
          <thead>
            <tr><th>Room type</th><th>Bookings</th><th>Nights</th><th>Revenue</th></tr>
          </thead>
          <tbody>
            {Object.entries(totals.rooms.byRoomType).length === 0 ? (
              <tr><td colSpan={4} className="rp-none">No rooms were sold in this period.</td></tr>
            ) : Object.entries(totals.rooms.byRoomType)
              .sort((a, b) => b[1].revenue - a[1].revenue)
              .map(([type, v]) => (
                <tr key={type}>
                  <td>{cap(type)}</td>
                  <td className="num">{v.bookings}</td>
                  <td className="num">{v.nights}</td>
                  <td className="num">{naira(v.revenue)}</td>
                </tr>
              ))}
          </tbody>
        </table>
        <p className="rp-foot">
          Where the bookings came from:{" "}
          {Object.entries(totals.rooms.bySource).length
            ? Object.entries(totals.rooms.bySource)
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => v + " " + k)
                .join(", ")
            : "nothing to report"}
          .
        </p>
      </Section>

      <Section title="Bar, pool and gym">
        <table className="rp-table">
          <thead>
            <tr>
              <th>Facility</th>{collective && <th>Property</th>}
              <th>Signed to rooms</th><th>Paid at the till</th><th>Total</th>
            </tr>
          </thead>
          <tbody>
            {totals.facilities.byFacility.filter((f) => f.revenue > 0).length === 0 ? (
              <tr><td colSpan={collective ? 5 : 4} className="rp-none">Nothing was taken at a facility in this period.</td></tr>
            ) : totals.facilities.byFacility.filter((f) => f.revenue > 0).map((f) => (
              <tr key={String(f.facilityId)}>
                <td>{f.name}</td>
                {collective && <td>{f.property}</td>}
                <td className="num">{naira(f.chargedToRooms)}</td>
                <td className="num">{naira(f.paidAtTill)}</td>
                <td className="num strong">{naira(f.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Money collected">
        <table className="rp-table">
          <thead><tr><th>How it was paid</th><th>Amount</th></tr></thead>
          <tbody>
            {Object.entries(totals.collected.byMethod).length === 0 ? (
              <tr><td colSpan={2} className="rp-none">No payments were recorded in this period.</td></tr>
            ) : Object.entries(totals.collected.byMethod)
              .sort((a, b) => b[1] - a[1])
              .map(([method, amount]) => (
                <tr key={method}><td>{cap(method)}</td><td className="num">{naira(amount)}</td></tr>
              ))}
            <tr className="rp-total">
              <td>Collected in the period</td>
              <td className="num strong">{naira(totals.collected.total)}</td>
            </tr>
          </tbody>
        </table>
        <p className="rp-foot">
          {totals.collected.payments} payments taken.
          {totals.collected.cardFees > 0 &&
            " " + naira(totals.collected.cardFees) + " of that was card processing fees, which pass straight to the payment provider and are not the hotel's money."}
          {" "}This is what arrived in the period. The revenue above is what the period
          sold — a stay booked in one month and paid for in the next sits in both, which
          is why the two figures rarely match.
        </p>
      </Section>

      {months?.length > 0 && (
        <Section title="Month by month">
          <table className="rp-table">
            <thead>
              <tr><th>Month</th><th>Rooms</th><th>Facilities</th><th>Total</th><th>Nights sold</th><th>Occupancy</th></tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.month}>
                  <td>{m.label}</td>
                  <td className="num">{naira(m.roomRevenue)}</td>
                  <td className="num">{naira(m.facilityRevenue)}</td>
                  <td className="num strong">{naira(m.total)}</td>
                  <td className="num">{m.nightsSold}</td>
                  <td className="num">{m.occupancyPercent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      <footer className="rp-sign">
        <div className="rp-rule" />
        <p>
          Divic Exclusive Hotels · {collective ? "Both properties, Festac" : properties[0]?.name} ·
          {" "}{period.label} · all figures in naira
        </p>
      </footer>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="rp-section">
      <h2 className="rp-h2">{title}</h2>
      {children}
    </section>
  );
}

function Figure({ label, value, lead }) {
  return (
    <div className={"rp-fig" + (lead ? " lead" : "")}>
      <div className="rp-fig-label">{label}</div>
      <div className="rp-fig-value">{value}</div>
    </div>
  );
}
