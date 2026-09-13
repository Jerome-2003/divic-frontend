import { useEffect, useState } from "react";
import { Printer, X, Share2, Copy, Check } from "lucide-react";
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
 *
 * There is also a plain-text copy, because half the time the guest does not
 * want a piece of paper — they want it on WhatsApp. Text rather than an image
 * or a PDF: it is readable in any app, on any phone, costs nothing to send,
 * and can be searched for six weeks later, which a photo of a receipt cannot.
 */

/**
 * The same receipt as text, laid out to survive being pasted anywhere.
 *
 * Fixed-width alignment is avoided deliberately — a monospace column that
 * looks right here collapses in a chat app's proportional font. Each line
 * stands on its own instead.
 */
function receiptText(receipt, locName) {
  const money = (n) => "NGN " + Number(n || 0).toLocaleString("en-NG");
  const out = [
    "DIVIC EXCLUSIVE HOTELS",
    locName || receipt.location,
    receipt.facility,
    "",
    "Receipt " + receipt.receiptNo,
    receipt.tableName + (receipt.guestName ? " — " + receipt.guestName : ""),
    new Date(receipt.settledAt).toLocaleString("en-NG"),
    "",
  ];
  receipt.lines.forEach((l) => out.push(l.qty + " x " + l.name + " — " + money(l.lineTotal)));
  out.push("", "TOTAL " + money(receipt.total));

  const parts = receipt.parts || [];
  if (parts.length > 1) {
    out.push("", "Split " + parts.length + " ways:");
    parts.forEach((p) => out.push(
      "  " + (p.settlement === "room"
        ? "Room " + p.roomNumber + (p.guestSurname ? " (" + p.guestSurname + ")" : "")
        : methodLabel(p.paymentMethod)) + " — " + money(p.amount)
    ));
  } else {
    out.push(receipt.settlement === "room"
      ? "Charged to room " + receipt.roomNumber
      : "Paid at the bar");
  }

  out.push("", "Served by " + receipt.servedBy, "A query on this bill? Speak to the front desk.");
  return out.join("\n");
}

const methodLabel = (m) =>
  m === "pos" ? "Card" : m ? m[0].toUpperCase() + m.slice(1) : "Paid";
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

          {/* A split bill has to say so. One payment line that does not match
              the total is the guest's first reason to query the bill. */}
          {(receipt.parts || []).length > 1 ? (
            <div className="receipt-settle">
              <div>Split {receipt.parts.length} ways</div>
              {receipt.parts.map((p, i) => (
                <div key={i} className="rs-part">
                  <span>
                    {p.settlement === "room"
                      ? "Room " + p.roomNumber + (p.guestSurname ? " · " + p.guestSurname : "")
                      : methodLabel(p.paymentMethod)}
                  </span>
                  <span className="mono">{naira(p.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="receipt-settle">
              {receipt.settlement === "room"
                ? `Charged to room ${receipt.roomNumber}`
                : "Paid at the bar — " + methodLabel(receipt.parts?.[0]?.paymentMethod)}
            </div>
          )}

          <div className="receipt-rule" />
          <div className="receipt-foot">
            <div>Thank you for staying with us.</div>
            <div className="receipt-sub">A query on this bill? Speak to the front desk.</div>
          </div>
        </div>

        <div className="modal-foot no-print">
          <button className="btn" onClick={onClose}>Close</button>
          <ShareButton receipt={receipt} locName={loc.name} />
          <button className="btn btn-gold" onClick={() => window.print()}>
            <Printer size={15} /> Print
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Sending the receipt rather than printing it.
 *
 * The phone's own share sheet where there is one — that is what puts it in
 * WhatsApp in one tap, which is where guests actually want it. On a laptop
 * there is no share sheet, so it copies instead and says so, rather than
 * offering a button that silently does nothing.
 */
function ShareButton({ receipt, locName }) {
  const [done, setDone] = useState(null);
  const text = () => receiptText(receipt, locName);

  const share = async () => {
    const body = text();
    try {
      if (navigator.share) {
        await navigator.share({ title: "Receipt " + receipt.receiptNo, text: body });
        return;
      }
      await navigator.clipboard.writeText(body);
      setDone("copied");
    } catch (e) {
      // A cancelled share sheet is not a failure worth reporting.
      if (e?.name === "AbortError") return;
      setDone("failed");
    }
    setTimeout(() => setDone(null), 2500);
  };

  return (
    <button className="btn" onClick={share}>
      {done === "copied" ? <><Check size={15} /> Copied</>
        : done === "failed" ? <><Copy size={15} /> Could not copy</>
        : <><Share2 size={15} /> Send</>}
    </button>
  );
}
