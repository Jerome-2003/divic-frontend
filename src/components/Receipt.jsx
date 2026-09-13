import { useEffect } from "react";
import { Printer, X } from "lucide-react";
import { naira, prettyDateTime } from "../lib/format";
import { LOCATIONS } from "../lib/constants";

/**
 * The printed bill for a settled table.
 *
 * Printing goes through the browser's own dialog rather than a driver or a
 * generated file: whatever printer the bar already has attached is the one that
 * works, thermal rolls included, with nothing to install. That dialog also
 * carries "Save as PDF" on every desktop OS, which is the PDF copy without a
 * second code path to keep correct.
 *
 * The layout is narrow on purpose — 80mm is the common thermal roll width, and
 * a receipt that reads correctly at that size also prints fine on A4.
 */
export default function Receipt({ receipt, onClose }) {
  // Escape closes it; the print dialog itself is modal above this.
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  if (!receipt) return null;
  const loc = LOCATIONS[receipt.location] || {};

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal receipt-shell" role="dialog" aria-modal="true" aria-label="Receipt">
        <div className="modal-head no-print">
          <div style={{ flex: 1 }}>
            <h3>Receipt {receipt.receiptNo}</h3>
            <p>{receipt.tableName} · {receipt.facility}</p>
          </div>
          <button className="btn btn-sm btn-quiet" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* The only part that reaches paper — see .receipt-paper in theme.css. */}
        <div className="receipt-paper" id="receipt-paper">
          <div className="receipt-brand">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" width="54" height="54" />
            <div className="receipt-name">Divic Exclusive Hotels</div>
            <div className="receipt-sub">{loc.name || receipt.location}</div>
            {loc.address && <div className="receipt-sub">{loc.address}</div>}
            {loc.phone && <div className="receipt-sub">{loc.phone}</div>}
          </div>

          <div className="receipt-rule" />

          <div className="receipt-meta">
            <span>Receipt</span><span className="mono">{receipt.receiptNo}</span>
            <span>Table</span><span>{receipt.tableName}</span>
            {receipt.guestName && (<><span>Guest</span><span>{receipt.guestName}</span></>)}
            <span>Served by</span><span>{receipt.servedBy}</span>
            <span>When</span><span>{prettyDateTime(receipt.settledAt)}</span>
          </div>

          <div className="receipt-rule" />

          <table className="receipt-lines">
            <tbody>
              {receipt.lines.map((l, i) => (
                <tr key={i}>
                  <td className="ri-qty mono">{l.qty}&times;</td>
                  <td className="ri-name">{l.name}</td>
                  <td className="ri-amt mono">{naira(l.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="receipt-rule" />

          <div className="receipt-total">
            <span>Total</span>
            <strong className="mono">{naira(receipt.total)}</strong>
          </div>

          <div className="receipt-settle">
            {receipt.settlement === "room"
              ? `Charged to room ${receipt.roomNumber}`
              : "Paid at the bar"}
          </div>

          <div className="receipt-rule" />
          <div className="receipt-foot">
            <div>Thank you for staying with us.</div>
            <div className="receipt-sub">A query on this bill? Speak to the front desk.</div>
          </div>
        </div>

        <div className="modal-foot no-print">
          <button className="btn" onClick={onClose}>Close</button>
          <button className="btn btn-gold" onClick={() => window.print()}>
            <Printer size={15} /> Print
          </button>
        </div>
      </div>
    </div>
  );
}
