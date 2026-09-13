import { useState } from "react";
import { BedDouble, Banknote, Plus, Trash2, Search, Loader2, CheckCircle2, Divide } from "lucide-react";
import api from "../../lib/api";
import { naira } from "../../lib/format";
import { Modal, Field, ErrorNote, Note } from "../ui";

const METHODS = [
  { key: "cash", label: "Cash" },
  { key: "card", label: "Card" },
  { key: "transfer", label: "Transfer" },
];

/**
 * Splitting one table's bill.
 *
 * Two things a bar is asked for constantly and a single settlement cannot do:
 * four friends where two pay cash and two sign it to their rooms, and one
 * guest paying half now and half on the room. Both are the same shape — some
 * number of parts, each with its own way of paying and its own amount.
 *
 * Each part becomes its own charge on the server, which is the only way the
 * front desk can later answer a question about any one of those four people.
 * A single charge for the table would put all of it on whichever room was
 * named, and the guest in that room would be the one asking.
 *
 * The parts must add up to the bill exactly, and this says so continuously
 * rather than only when Confirm is pressed — a total that is ₦500 out is
 * something to notice while typing, not after.
 */
export default function SplitDialog({ facility, tab, busy, onSettle, onClose }) {
  const [parts, setParts] = useState([
    { id: 1, settlement: null, amount: "", method: null, lookup: null, room: "" },
    { id: 2, settlement: null, amount: "", method: null, lookup: null, room: "" },
  ]);
  const [error, setError] = useState(null);

  const setPart = (id, patch) =>
    setParts((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const allocated = parts.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const left = tab.total - allocated;

  /** Even shares, rounded so the parts still add up to the bill exactly. */
  const splitEvenly = () => {
    const n = parts.length;
    const base = Math.floor(tab.total / n);
    setParts((ps) => ps.map((p, i) => ({
      ...p,
      // The last part carries the remainder; three ways of ₦10,000 is
      // 3,333 + 3,333 + 3,334, not three times 3,333 and a naira lost.
      amount: String(i === n - 1 ? tab.total - base * (n - 1) : base),
    })));
  };

  const addPart = () =>
    setParts((ps) => ps.length >= 8 ? ps
      : [...ps, { id: Math.max(...ps.map((p) => p.id)) + 1, settlement: null, amount: "", method: null, lookup: null, room: "" }]);

  const findRoom = async (p) => {
    setPart(p.id, { looking: true });
    setError(null);
    try {
      const found = await api.facilityGuestLookup(facility.id, p.room.trim());
      setPart(p.id, { lookup: found, looking: false });
    } catch (e) {
      setError(e.message);
      setPart(p.id, { looking: false, lookup: null });
    }
  };

  const partReady = (p) =>
    Number(p.amount) >= 1 &&
    (p.settlement === "room" ? Boolean(p.lookup) : p.settlement === "paid" ? Boolean(p.method) : false);

  const ready = left === 0 && parts.every(partReady);

  const confirm = () => {
    if (!ready || busy) return;
    onSettle(parts.map((p) => ({
      settlement: p.settlement,
      amount: Number(p.amount),
      bookingId: p.settlement === "room" ? p.lookup.bookingId : undefined,
      paymentMethod: p.settlement === "paid" ? p.method : undefined,
    })));
  };

  return (
    <Modal
      wide
      title={"Split " + tab.tableName}
      blurb={"The bill is " + naira(tab.total) + ". Every part needs its own way of paying, and the parts have to add up."}
      onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn btn-gold" onClick={confirm} disabled={!ready || busy}>
          {busy ? "Posting" : "Settle " + naira(tab.total)}
        </button>
      </>}
    >
      <ErrorNote>{error}</ErrorNote>

      <div className={"split-bar" + (left === 0 ? " done" : left < 0 ? " over" : "")}>
        <span>
          {left === 0 ? "The parts add up." : left > 0
            ? naira(left) + " still to allocate"
            : naira(-left) + " more than the bill"}
        </span>
        <div>
          <button className="btn btn-sm" onClick={splitEvenly}>
            <Divide size={13} /> Even shares
          </button>
          <button className="btn btn-sm" onClick={addPart} disabled={parts.length >= 8}>
            <Plus size={13} /> Another
          </button>
        </div>
      </div>

      {parts.map((p, i) => (
        <div key={p.id} className="split-part">
          <div className="sp-head">
            <strong>Part {i + 1}</strong>
            {parts.length > 2 && (
              <button className="btn btn-sm btn-quiet" aria-label={"Remove part " + (i + 1)}
                onClick={() => setParts((ps) => ps.filter((x) => x.id !== p.id))}>
                <Trash2 size={13} />
              </button>
            )}
          </div>

          <div className="frow" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Amount" htmlFor={"sp-amt-" + p.id}>
              <input
                id={"sp-amt-" + p.id} className="mono" inputMode="numeric" value={p.amount}
                placeholder="0"
                onChange={(e) => setPart(p.id, { amount: e.target.value.replace(/[^0-9]/g, "") })}
              />
            </Field>
            <Field label="How">
              <div className="settle-choice sc-tight">
                <button
                  className={"pos-tile" + (p.settlement === "room" ? " on" : "")}
                  onClick={() => setPart(p.id, { settlement: "room", method: null })}
                >
                  <BedDouble size={15} /><span><strong>On a room</strong></span>
                </button>
                <button
                  className={"pos-tile" + (p.settlement === "paid" ? " on" : "")}
                  onClick={() => setPart(p.id, { settlement: "paid", lookup: null })}
                >
                  <Banknote size={15} /><span><strong>Paying now</strong></span>
                </button>
              </div>
            </Field>
          </div>

          {p.settlement === "room" && (
            <Field label="Room number" htmlFor={"sp-room-" + p.id}>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  id={"sp-room-" + p.id} value={p.room} inputMode="numeric" placeholder="204"
                  onChange={(e) => setPart(p.id, { room: e.target.value, lookup: null })}
                  onKeyDown={(e) => { if (e.key === "Enter" && p.room.trim()) findRoom(p); }}
                />
                <button className="btn" onClick={() => findRoom(p)} disabled={!p.room.trim() || p.looking}>
                  {p.looking ? <Loader2 size={15} className="spin" /> : <Search size={15} />} Find
                </button>
              </div>
              {p.lookup && (
                <div style={{ marginTop: 8 }}>
                  <Note icon={CheckCircle2}>
                    Room {p.lookup.roomNumber} — <strong>{p.lookup.surname}</strong>. Check the
                    surname before confirming.
                  </Note>
                </div>
              )}
            </Field>
          )}

          {p.settlement === "paid" && (
            <Field label="How are they paying?">
              <div className="settle-choice sc-tight">
                {METHODS.map((m) => (
                  <button
                    key={m.key}
                    className={"pos-tile" + (p.method === m.key ? " on" : "")}
                    onClick={() => setPart(p.id, { method: m.key })}
                  >
                    <Banknote size={14} /><span><strong>{m.label}</strong></span>
                  </button>
                ))}
              </div>
            </Field>
          )}
        </div>
      ))}

      <Note>
        Each part is posted as its own charge, so a guest querying their bill later sees
        only their share — not the whole table under their room number.
      </Note>
    </Modal>
  );
}
