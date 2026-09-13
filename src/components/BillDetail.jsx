import api from "../lib/api";
import { useApi } from "../lib/useApi";
import { naira, cap, prettyDateTime } from "../lib/format";
import { Modal, Loading, ErrorNote, Empty, Chip } from "./ui";

/**
 * One guest's bill, line by line.
 *
 * This exists to answer one question at the counter: "what is this ₦18,000
 * for?" A total cannot answer it, and a total labelled with the wrong
 * facility's name answers it wrongly, which is worse.
 *
 * The two halves are kept visibly apart because they are two different debts.
 * The room is what the hotel sold them. The facility lines are things they
 * chose to sign for instead of paying at the time — each one a decision the
 * guest made, each one worth being able to point at.
 */
export default function BillDetail({ bookingId, onClose }) {
  const { data, loading, error } = useApi(() => api.folio(bookingId), [bookingId]);

  return (
    <Modal
      wide
      title={data ? "Bill " + data.ref : "Bill"}
      blurb={data ? data.guest + " · room " + data.roomNumber + " · " + data.checkIn + " → " + data.checkOut : undefined}
      onClose={onClose}
      footer={<button className="btn btn-gold" onClick={onClose}>Close</button>}
    >
      <ErrorNote>{error}</ErrorNote>
      {loading ? <Loading /> : data && (
        <>
          <Part title="The room">
            <table className="tbl">
              <tbody>
                <tr>
                  <td>
                    {cap(data.roomType)} room {data.roomNumber}
                    <div className="tc-meta">{data.nights} nights at {naira(data.rate)}</div>
                  </td>
                  <td className="mono" style={{ textAlign: "right" }}>{naira(data.roomCharges)}</td>
                </tr>
              </tbody>
            </table>
          </Part>

          <Part
            title="Signed to the room"
            sub="Charged at a facility instead of paid there. Anything paid at the till is settled with that facility and is not part of this bill."
          >
            {data.facilityLines.length === 0 ? (
              <Empty
                heading="Nothing signed to this room"
                text="This guest has not put anything from the bar, pool or gym on their room."
              />
            ) : (
              <table className="tbl">
                <thead>
                  <tr><th>Where</th><th>What</th><th>When</th><th style={{ textAlign: "right" }}>Amount</th></tr>
                </thead>
                <tbody>
                  {data.facilityLines.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <span style={{ fontWeight: 500 }}>{l.facility}</span>
                        {l.facilityType && <div className="tc-meta">{cap(l.facilityType)}</div>}
                      </td>
                      <td>{l.description}</td>
                      <td className="tc-meta">{prettyDateTime(l.postedAt)}</td>
                      <td className="mono" style={{ textAlign: "right" }}>{naira(l.amount)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={3} style={{ fontWeight: 500 }}>Signed to the room</td>
                    <td className="mono" style={{ textAlign: "right", fontWeight: 500 }}>
                      {naira(data.facilityCharges)}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </Part>

          <Part title="Paid">
            {data.payments.length === 0 ? (
              <Empty heading="Nothing paid yet" text="No payment has been taken against this bill." />
            ) : (
              <table className="tbl">
                <thead>
                  <tr><th>Method</th><th>When</th><th>Taken by</th><th style={{ textAlign: "right" }}>Amount</th></tr>
                </thead>
                <tbody>
                  {data.payments.map((p) => (
                    <tr key={p.id}>
                      <td>
                        {cap(p.method)}
                        {p.note && <div className="tc-meta">{p.note}</div>}
                      </td>
                      <td className="tc-meta">{prettyDateTime(p.at)}</td>
                      <td className="tc-meta">{p.recordedBy || "—"}</td>
                      <td className="mono" style={{ textAlign: "right" }}>{naira(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Part>

          <div className="bill-sum">
            <div><span>The room</span><span className="mono">{naira(data.roomCharges)}</span></div>
            <div>
              <span>Signed to the room</span>
              <span className="mono">{data.facilityCharges ? naira(data.facilityCharges) : "—"}</span>
            </div>
            <div><span>Paid</span><span className="mono">−{naira(data.paid)}</span></div>
            <div className="bs-total">
              <span>{data.balance > 0 ? "Still owing" : "Settled"}</span>
              <span className="mono">{naira(Math.max(0, data.balance))}</span>
            </div>
          </div>

          {data.balance < 0 && (
            <div style={{ marginTop: 12 }}>
              <Chip tone="gold">{naira(-data.balance)} overpaid</Chip>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

function Part({ title, sub, children }) {
  return (
    <section className="bill-part">
      <h4>{title}</h4>
      {sub && <p>{sub}</p>}
      {children}
    </section>
  );
}
