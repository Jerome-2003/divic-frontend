import { useState } from "react";
import { BedDouble, Banknote, Search, Loader2, CheckCircle2 } from "lucide-react";
import api from "../lib/api";
import { naira } from "../lib/format";
import { Modal, Field, ErrorNote, Note } from "./ui";

const METHODS = [
  { key: "cash", label: "Cash" },
  { key: "card", label: "Card" },
  { key: "transfer", label: "Transfer" },
];

/**
 * How money is taken anywhere in a facility: a settled bar tab, a pool entry
 * fee, a gym subscription. One dialog for all three, because the decision is
 * identical each time — on the room, or paid now — and three hand-written
 * copies of a room lookup is three places for it to go subtly wrong.
 *
 * Charging the wrong room is the mistake this guards against, so the room step
 * shows the surname the server returned and the amount together, and posting
 * takes a deliberate second press. The surname is all the server will give up:
 * confirming a guest exists is legitimate, browsing guest records is not.
 *
 * Calls back with { settlement, bookingId, paymentMethod } — it never posts
 * anything itself, since what that means differs per caller.
 */
export default function SettleDialog({ facility, amount, title, blurb, busy, onSettle, onClose }) {
  const [settlement, setSettlement] = useState(null);
  const [roomNumber, setRoomNumber] = useState("");
  const [lookup, setLookup] = useState(null);
  const [looking, setLooking] = useState(false);
  const [method, setMethod] = useState(null);
  const [error, setError] = useState(null);

  const findRoom = async () => {
    setLooking(true);
    setError(null);
    setLookup(null);
    try {
      setLookup(await api.facilityGuestLookup(facility.id, roomNumber.trim()));
    } catch (e) {
      setError(e.message);
    } finally {
      setLooking(false);
    }
  };

  const ready = settlement === "room" ? Boolean(lookup) : Boolean(method);

  const confirm = () => {
    if (!ready || busy) return;
    onSettle({
      settlement,
      bookingId: settlement === "room" ? lookup.bookingId : undefined,
      paymentMethod: settlement === "paid" ? method : undefined,
    });
  };

  return (
    <Modal
      title={title}
      blurb={blurb}
      onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn btn-gold" onClick={confirm} disabled={!ready || busy}>
          {busy ? "Posting" : "Confirm " + naira(amount)}
        </button>
      </>}
    >
      <div className="pos-total">
        <span>Amount</span>
        <strong className="mono">{naira(amount)}</strong>
      </div>

      <div className="settle-choice">
        <button
          className={"pos-tile" + (settlement === "room" ? " on" : "")}
          onClick={() => { setSettlement("room"); setMethod(null); }}
        >
          <BedDouble size={18} />
          <span>
            <strong>Charge to a room</strong>
            <em>Goes on the guest&rsquo;s bill</em>
          </span>
        </button>
        <button
          className={"pos-tile" + (settlement === "paid" ? " on" : "")}
          onClick={() => { setSettlement("paid"); setLookup(null); }}
        >
          <Banknote size={18} />
          <span>
            <strong>Paying now</strong>
            <em>Cash, card or transfer</em>
          </span>
        </button>
      </div>

      {settlement === "room" && (
        <div style={{ marginTop: 16 }}>
          <Field label="Room number" htmlFor="settle-room">
            <div style={{ display: "flex", gap: 8 }}>
              <input
                id="settle-room"
                value={roomNumber}
                autoFocus
                inputMode="numeric"
                placeholder="204"
                onChange={(e) => { setRoomNumber(e.target.value); setLookup(null); }}
                onKeyDown={(e) => { if (e.key === "Enter" && roomNumber.trim()) findRoom(); }}
              />
              <button className="btn" onClick={findRoom} disabled={!roomNumber.trim() || looking}>
                {looking ? <Loader2 size={15} className="spin" /> : <Search size={15} />} Find
              </button>
            </div>
          </Field>
          {lookup && (
            <Note icon={CheckCircle2}>
              Room {lookup.roomNumber} — <strong>{lookup.surname}</strong>. Check the surname with
              the guest before confirming.
            </Note>
          )}
        </div>
      )}

      {settlement === "paid" && (
        <div style={{ marginTop: 16 }}>
          <Field label="How are they paying?">
            <div className="settle-choice">
              {METHODS.map((m) => (
                <button
                  key={m.key}
                  className={"pos-tile" + (method === m.key ? " on" : "")}
                  onClick={() => setMethod(m.key)}
                >
                  <Banknote size={16} />
                  <span><strong>{m.label}</strong></span>
                </button>
              ))}
            </div>
          </Field>
        </div>
      )}

      <ErrorNote>{error}</ErrorNote>
    </Modal>
  );
}
