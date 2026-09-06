import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import api from "../lib/api";
import { Modal, Field, Row, ErrorNote, Note } from "./ui";
import { naira, cap } from "../lib/format";

export default function PaymentModal({ folio, onClose, onPaid }) {
  const [amount, setAmount] = useState(String(Math.max(0, folio.balance)));
  const [method, setMethod] = useState("paystack");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  /* Paystack flow: the server starts the transaction and returns a checkout
     URL. The payment only lands on the folio after the server verifies the
     reference with Paystack — a browser saying "it worked" is not proof. */
  const startPaystack = async () => {
    setBusy(true); setError(null);
    try {
      const { reference: ref, authorizationUrl } = await api.initPaystack(folio.bookingId, Number(amount));
      setReference(ref);
      window.open(authorizationUrl, "_blank", "noopener");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const record = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return setError("Enter an amount greater than zero.");
    if (method === "paystack" && !reference) {
      return setError("Start the Paystack payment first, then confirm it here once the guest has paid.");
    }
    setBusy(true); setError(null);
    try {
      await api.recordPayment({
        bookingId: folio.bookingId, amount: amt, method,
        paystackReference: method === "paystack" ? reference : undefined,
      });
      onPaid?.();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Take payment"
      blurb={folio.guest + " · " + folio.ref}
      onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
        {method === "paystack" && !reference && (
          <button className="btn" onClick={startPaystack} disabled={busy}>
            {busy ? <Loader2 size={14} className="spin" /> : <CreditCard size={14} />} Open Paystack
          </button>
        )}
        <button className="btn btn-gold" onClick={record} disabled={busy}>
          {busy ? "Recording" : "Record payment"}
        </button>
      </>}
    >
      <ErrorNote>{error}</ErrorNote>

      <table className="tbl" style={{ marginBottom: 18 }}>
        <tbody>
          <tr><td>Room {folio.roomNumber} · {cap(folio.roomType)}</td>
              <td className="mono" style={{ textAlign: "right" }}>{naira(folio.rate)} × {folio.nights}</td></tr>
          <tr><td>Charges</td><td className="mono" style={{ textAlign: "right" }}>{naira(folio.charges)}</td></tr>
          <tr><td>Paid so far</td><td className="mono" style={{ textAlign: "right" }}>{naira(folio.paid)}</td></tr>
          <tr><td style={{ fontWeight: 500 }}>Balance</td>
              <td className="mono" style={{ textAlign: "right", fontWeight: 500 }}>{naira(folio.balance)}</td></tr>
        </tbody>
      </table>

      <Row>
        <Field label="Amount" htmlFor="amt">
          <input id="amt" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Method" htmlFor="mth">
          <select id="mth" value={method} onChange={(e) => { setMethod(e.target.value); setReference(""); }}>
            <option value="paystack">Paystack (card)</option>
            <option value="transfer">Bank transfer</option>
            <option value="cash">Cash</option>
            <option value="pos">POS terminal</option>
          </select>
        </Field>
      </Row>

      {method === "paystack" && reference && (
        <Field label="Paystack reference" htmlFor="pref">
          <input id="pref" value={reference} readOnly className="mono" />
        </Field>
      )}

      {method === "paystack" && (
        <Note icon={CreditCard}>
          Open Paystack, let the guest pay, then record it here. The server checks the
          reference with Paystack before anything touches the folio, so a dropped
          connection cannot create a payment that never happened.
        </Note>
      )}
    </Modal>
  );
}
