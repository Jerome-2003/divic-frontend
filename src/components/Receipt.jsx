import { useEffect, useRef, useState } from "react";
import { Printer, X, Share2, Copy, Check } from "lucide-react";
import { naira, prettyDateTime } from "../lib/format";
import { LOCATIONS } from "../lib/constants";

/**
 * The hotel's printed bill for a table, on headed paper with the logo.
 *
 * It prints twice in a normal evening, and the two printings are not the same
 * document. Before anyone pays, the guest is handed a BILL: this is what you
 * ordered, this is what it comes to, nothing has been paid. Afterwards they
 * get a RECEIPT: the same order, now with a receipt number and a record of how
 * it was settled. A bar that can only print the second one either makes the
 * guest agree to a figure they have never seen written down, or hands them a
 * "receipt" for money not yet taken — and the second is the kind of paper that
 * gets waved at a manager later.
 *
 * So it is one template with two headings rather than two templates, because
 * the difference between them is exactly four lines and keeping two files in
 * step through every future change to the branding is how they end up
 * disagreeing about the hotel's own address.
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
 * There is also a plain-text copy for a guest who would rather have it on
 * WhatsApp than on paper. That one is text on purpose — readable in any app,
 * on any phone, and searchable six weeks later, which a photo of a receipt is
 * not. It is the sending format only; the printed copy is always the headed
 * one with the logo.
 */

/**
 * The same receipt as text, laid out to survive being pasted anywhere.
 *
 * Fixed-width alignment is avoided deliberately — a monospace column that
 * looks right here collapses in a chat app's proportional font. Each line
 * stands on its own instead.
 */
function receiptText(receipt, locName, isBill) {
  const money = (n) => "NGN " + Number(n || 0).toLocaleString("en-NG");
  const out = [
    "DIVIC EXCLUSIVE HOTELS",
    locName || receipt.location,
    receipt.facility,
    "",
    isBill ? "BILL — not yet paid" : "Receipt " + receipt.receiptNo,
    receipt.tableName + (receipt.guestName ? " — " + receipt.guestName : ""),
    new Date(isBill ? Date.now() : receipt.settledAt).toLocaleString("en-NG"),
    "",
  ];
  receipt.lines.forEach((l) => out.push(l.qty + " x " + l.name + " — " + money(l.lineTotal)));
  out.push("", (isBill ? "DUE " : "TOTAL ") + money(receipt.total));

  if (isBill) {
    out.push("", "Nothing has been paid yet.");
    if (receipt.roomNumber) out.push("Room " + receipt.roomNumber + " if charging to the room.");
  } else {
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
  }

  out.push("", "Served by " + receipt.servedBy, "A query on this bill? Speak to the front desk.");
  return out.join("\n");
}

const methodLabel = (m) =>
  m === "pos" ? "Card" : m ? m[0].toUpperCase() + m.slice(1) : "Paid";
/**
 * @param mode  "receipt" — settled, with a receipt number and how it was paid.
 *              "bill"    — an open table, presented before the guest pays.
 * @param reprint  A second copy of a receipt already given, marked as such so
 *                 two pieces of paper for one order cannot be mistaken for two
 *                 orders when the drawer is counted.
 * @param autoPrint Opens the printer dialog as soon as the paper is ready.
 *                 Every button that leads here says "print", so it prints —
 *                 showing the page and making somebody find a second Print
 *                 button is a promise the label did not make. Cancelling the
 *                 dialog leaves the preview up, so Send and a second attempt
 *                 are both still there.
 */
export default function Receipt({ receipt, mode = "receipt", reprint = false, autoPrint = false, onClose }) {
  const logoRef = useRef(null);
  const printed = useRef(false);

  // Escape closes it; the print dialog itself is modal above this.
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  useEffect(() => {
    if (!autoPrint || !receipt || printed.current) return undefined;
    let cancelled = false;

    /**
     * The logo has to be decoded before the dialog opens or the printed page
     * goes out without it — the browser renders the print view from what is on
     * screen at that instant, and a half-loaded image is simply missing. Two
     * animation frames after that let the layout settle.
     */
    const go = async () => {
      const img = logoRef.current;
      try {
        if (img && !img.complete) await img.decode();
      } catch {
        // A logo that will not load is not a reason to withhold the bill.
      }
      if (cancelled) return;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (cancelled || printed.current) return;
        printed.current = true;
        window.print();
      }));
    };
    go();

    return () => { cancelled = true; };
  }, [autoPrint, receipt]);

  if (!receipt) return null;
  const loc = LOCATIONS[receipt.location] || {};
  const isBill = mode === "bill";

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal receipt-shell" role="dialog" aria-modal="true" aria-label="Receipt">
        <div className="modal-head no-print">
          <div style={{ flex: 1 }}>
            <h3>{isBill ? "Bill for " + receipt.tableName : "Receipt " + receipt.receiptNo}</h3>
            <p>
              {isBill
                ? "Nothing has been paid yet. Hand this to the guest, then take the payment."
                : receipt.tableName + " · " + receipt.facility}
            </p>
          </div>
          <button className="btn btn-sm btn-quiet" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* The only part that reaches paper — see .receipt-paper in theme.css. */}
        <div className="receipt-paper" id="receipt-paper">
          <div className="receipt-brand">
            <img ref={logoRef} src={`${import.meta.env.BASE_URL}logo.png`} alt="" width="54" height="54" />
            <div className="receipt-name">Divic Exclusive Hotels</div>
            <div className="receipt-sub">{loc.name || receipt.location}</div>
            {loc.address && <div className="receipt-sub">{loc.address}</div>}
            {loc.phone && <div className="receipt-sub">{loc.phone}</div>}
          </div>

          <div className="receipt-rule" />

          {/* Which document this is, said once and unmissably. A guest handed
              a piece of paper has to be able to tell at a glance whether it is
              a demand or a record. */}
          <div className={"receipt-kind" + (isBill ? " bill" : "")}>
            {isBill ? "Bill — not yet paid" : reprint ? "Receipt (copy)" : "Receipt"}
          </div>

          <div className="receipt-meta">
            {isBill
              ? <><span>Printed</span><span>{prettyDateTime(new Date())}</span></>
              : <><span>Receipt</span><span className="mono">{receipt.receiptNo}</span></>}
            <span>Table</span><span>{receipt.tableName}</span>
            {receipt.guestName && (<><span>Guest</span><span>{receipt.guestName}</span></>)}
            {receipt.roomNumber && (<><span>Room</span><span className="mono">{receipt.roomNumber}</span></>)}
            <span>Served by</span><span>{receipt.servedBy}</span>
            {!isBill && (<><span>When</span><span>{prettyDateTime(receipt.settledAt)}</span></>)}
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
            <span>{isBill ? "Due" : "Total"}</span>
            <strong className="mono">{naira(receipt.total)}</strong>
          </div>

          {/* A bill states plainly that no money has changed hands. Leaving the
              line off would make it read as a receipt with the payment method
              missing, which is the reading that causes trouble later. */}
          {isBill ? (
            <div className="receipt-settle unpaid">
              Nothing has been paid yet.
              {receipt.roomNumber
                ? " This can be charged to room " + receipt.roomNumber + " or paid at the bar."
                : " Payable at the bar."}
            </div>
          ) : (receipt.parts || []).length > 1 ? (
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
            <div>{isBill ? "Please check the order before paying." : "Thank you for staying with us."}</div>
            <div className="receipt-sub">A query on this bill? Speak to the front desk.</div>
          </div>
        </div>

        <div className="modal-foot no-print">
          <button className="btn" onClick={onClose}>Close</button>
          <ShareButton receipt={receipt} locName={loc.name} isBill={isBill} />
          <button className="btn btn-gold" onClick={() => window.print()}>
            <Printer size={15} /> {autoPrint ? "Print again" : isBill ? "Print the bill" : "Print"}
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
function ShareButton({ receipt, locName, isBill }) {
  const [done, setDone] = useState(null);
  const text = () => receiptText(receipt, locName, isBill);

  const share = async () => {
    const body = text();
    try {
      if (navigator.share) {
        await navigator.share({
          title: isBill ? "Bill — " + receipt.tableName : "Receipt " + receipt.receiptNo,
          text: body,
        });
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
