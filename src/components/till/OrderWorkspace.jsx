import { useState } from "react";
import {
  Minus, Plus, Trash2, Receipt as ReceiptIcon, BedDouble, Ban, Search, Printer, XCircle,
} from "lucide-react";
import api from "../../lib/api";
import { useOverride } from "../../lib/useOverride";
import { naira, prettyDateTime } from "../../lib/format";
import { Field, ErrorNote, Note, Empty, Modal, ConfirmModal } from "../ui";
import SettleDialog from "../SettleDialog";
import SplitDialog from "./SplitDialog";
import Receipt from "../Receipt";
import receiptFor from "./receiptFor";

const CATEGORIES = [
  { key: "drink", label: "Drinks" },
  { key: "food", label: "Food" },
  { key: "other", label: "Other" },
];

/**
 * Where the order is actually taken: the menu on the left, the bill on the
 * right, and the one button that ends it.
 *
 * The menu is a grid of targets rather than a list, because this is used on a
 * handheld mid-shift with one thumb. Quantity is a stepper on the bill rather
 * than a count of taps on the menu — "they wanted three, not one" is the
 * commonest correction at a bar and tapping a tile three times is a poor way
 * to make it.
 *
 * Nothing here can change the menu. Whoever is working the till sells from the
 * list; what is on it and what it costs is a manager's decision, the same as
 * room rates. An item a manager has taken off stays on screen, greyed and
 * unsellable, rather than disappearing — a tile that vanishes looks like a
 * fault, and staff need to be able to tell a guest it is off rather than
 * hunting for something that is no longer there.
 */
export default function OrderWorkspace({ facility, tab, menu, isManager, user, onChanged, onSettled, onDiscarded }) {
  const { runWithOverride, overrideDialog } = useOverride();
  const [busy, setBusy] = useState(false);
  const [settling, setSettling] = useState(false);
  const [splitting, setSplitting] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  // A printed copy on screen: the bill before payment, or a second receipt after.
  const [printing, setPrinting] = useState(null);
  const [err, setErr] = useState(null);

  const settled = tab.status === "settled";

  const guard = async (run) => {
    setErr(null);
    setBusy(true);
    try { await run(); await onChanged(); }
    catch (e) { if (!e.cancelled) setErr(e.message); }
    finally { setBusy(false); }
  };

  const add = (item) =>
    guard(() => runWithOverride((extra) =>
      api.addTabLine(facility.id, tab.id, { menuItemId: item.id, qty: 1, ...extra })));

  const setQty = (line, qty) =>
    guard(() => runWithOverride((extra) => api.setTabLineQty(facility.id, tab.id, line.id, qty, extra)));

  // Removing a line is setting its quantity to zero — which is already what
  // the minus button does at one, and goes through a route that carries the
  // manager's override in its body. The plain DELETE could not: it sends no
  // body, so there was nowhere for the override to ride and an owner pressing
  // the bin got the same refusal twice.
  const removeLine = (line) =>
    guard(() => runWithOverride((extra) => api.setTabLineQty(facility.id, tab.id, line.id, 0, extra)));

  const settle = async (parts) => {
    setErr(null);
    setBusy(true);
    try {
      const body = Array.isArray(parts) ? { parts } : parts;
      const res = await runWithOverride((extra) => api.settleTab(facility.id, tab.id, { ...body, ...extra }));
      setSettling(false);
      setSplitting(false);
      onSettled(res.receipt);
    } catch (e) {
      if (!e.cancelled) setErr(e.message);
      setBusy(false);
    }
  };

  // Closing a table that should never have been open — a name typed wrong, a
  // party that left before ordering. Nothing has been paid, so there is no
  // money to reverse; the table simply goes.
  const discard = async (reason) => {
    setErr(null);
    setBusy(true);
    try {
      await runWithOverride((extra) => api.discardTab(facility.id, tab.id, reason, extra));
      setDiscarding(false);
      onDiscarded();
    } catch (e) {
      if (!e.cancelled) setErr(e.message);
      setBusy(false);
    }
  };

  const voidOrder = async (reason) => {
    setErr(null);
    setBusy(true);
    try {
      await api.voidTab(facility.id, tab.id, reason);
      setVoiding(false);
      await onChanged();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const groups = CATEGORIES
    .map((c) => ({ ...c, items: menu.filter((i) => i.category === c.key) }))
    .filter((g) => g.items.length);

  return (
    <div className="ws">
      <header className="ws-head">
        <div>
          <h2>{tab.tableName}</h2>
          <p>
            {tab.roomNumber
              ? <><BedDouble size={13} /> Room {tab.roomNumber}{tab.guestSurname ? " · " + tab.guestSurname : ""}</>
              : tab.guestName || "Walk-in"}
            {tab.openedBy && <> &middot; opened by {tab.openedBy}</>}
          </p>
        </div>
        {!settled && (
          <button data-tour="bar-room" className="btn btn-sm" onClick={() => setAttaching(true)} disabled={busy}>
            <BedDouble size={14} /> {tab.roomNumber ? "Change room" : "Attach a room"}
          </button>
        )}
      </header>

      <ErrorNote>{err}</ErrorNote>

      {settled ? (
        <SettledOrder
          tab={tab} isManager={isManager} busy={busy}
          onVoid={() => setVoiding(true)}
          onReprint={() => setPrinting("reprint")}
        />
      ) : (
        <div className="ws-body">
          <section className="ws-menu" data-tour="bar-menu-grid">
            {groups.length === 0 ? (
              <Empty
                heading="Nothing on the menu"
                text={isManager
                  ? "Add what this facility sells with the Menu button before taking orders."
                  : "Ask a manager to add the items and prices."}
              />
            ) : groups.map((g) => (
              <div key={g.key} className="wsm-group">
                <h4>{g.label}</h4>
                <div className="wsm-grid">
                  {g.items.map((i) => (
                    <button
                      key={i.id}
                      className={"mtile" + (i.active ? "" : " off")}
                      onClick={() => add(i)}
                      disabled={busy || !i.active}
                      title={i.active ? "Add " + i.name : i.name + " is off the menu — a manager can put it back"}
                    >
                      <span className="mt-name">{i.name}</span>
                      <span className="mt-price mono">{naira(i.price)}</span>
                      {!i.active && <span className="mt-off">Off the menu</span>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>

          <section className="ws-cart" data-tour="bar-cart">
            <h4>The bill</h4>
            {tab.lines.length === 0 ? (
              <p className="ol-none">Nothing ordered yet. Tap an item to add it.</p>
            ) : (
              <>
                <div className="cart-lines">
                  {tab.lines.map((l) => (
                    <div key={l.id} className="cl">
                      <div className="cl-name">
                        {l.name}
                        <span className="tc-meta">{naira(l.unitPrice)} each</span>
                      </div>
                      <div className="cl-qty" data-tour="bar-qty">
                        <button onClick={() => setQty(l, l.qty - 1)} disabled={busy}
                          aria-label={"One fewer " + l.name}><Minus size={13} /></button>
                        <span className="mono">{l.qty}</span>
                        <button onClick={() => setQty(l, l.qty + 1)} disabled={busy || l.qty >= 99}
                          aria-label={"One more " + l.name}><Plus size={13} /></button>
                      </div>
                      <span className="cl-amt mono">{naira(l.lineTotal)}</span>
                      <button className="cl-x" onClick={() => removeLine(l)} disabled={busy}
                        aria-label={"Remove " + l.name}><Trash2 size={13} /></button>
                    </div>
                  ))}
                </div>

                <div className="pos-total" style={{ marginTop: 14 }}>
                  <span>Total</span>
                  <strong className="mono">{naira(tab.total)}</strong>
                </div>

                <button data-tour="bar-settle" className="btn btn-gold btn-big" style={{ width: "100%", marginTop: 12 }}
                  onClick={() => setSettling(true)} disabled={busy}>
                  <ReceiptIcon size={16} /> Settle &amp; print
                </button>
                <button data-tour="bar-split" className="btn" style={{ width: "100%", marginTop: 8 }}
                  onClick={() => setSplitting(true)} disabled={busy}>
                  Split this bill
                </button>
                {/* The bill goes out before the money comes in. A guest asked
                    to pay a figure they have never seen written down is a
                    guest who queries it, and a "receipt" printed for money not
                    yet taken is the paper that gets waved at a manager later. */}
                <button data-tour="bar-printbill" className="btn" style={{ width: "100%", marginTop: 8 }}
                  onClick={() => setPrinting("bill")} disabled={busy}>
                  <Printer size={15} /> Print the bill first
                </button>
              </>
            )}
            <button data-tour="bar-discard" className="btn btn-quiet" style={{ width: "100%", marginTop: 14 }}
              onClick={() => setDiscarding(true)} disabled={busy}>
              <XCircle size={15} /> Close this table without settling
            </button>
          </section>
        </div>
      )}

      {settling && (
        <SettleDialog
          facility={facility}
          amount={tab.total}
          title={"Settle " + tab.tableName}
          blurb="Once settled the table closes and the receipt prints. Only a manager can undo it afterwards."
          busy={busy}
          onSettle={settle}
          onClose={() => setSettling(false)}
        />
      )}

      {splitting && (
        <SplitDialog
          facility={facility}
          tab={tab}
          busy={busy}
          onSettle={settle}
          onClose={() => setSplitting(false)}
        />
      )}

      {attaching && (
        <AttachRoom
          facility={facility}
          tab={tab}
          onClose={() => setAttaching(false)}
          onDone={async () => { setAttaching(false); await onChanged(); }}
        />
      )}

      {voiding && (
        <ConfirmModal
          title="Void this order?"
          blurb={tab.tableName + " · " + naira(tab.total)}
          destructive
          confirmLabel="Void it"
          cancelLabel="Keep it"
          busy={busy}
          requireReason
          reasonLabel="Why is this being voided?"
          reasonPlaceholder="Charged to the wrong room"
          onConfirm={voidOrder}
          onClose={() => setVoiding(false)}
        >
          <p style={{ fontSize: "0.8438rem", color: "var(--slate-soft)", margin: "0 0 14px", lineHeight: 1.6 }}>
            The order and its items stay on record — what was ordered really was ordered.
            What this undoes is the money: the charge comes off the guest&rsquo;s bill, the
            till payment is reversed, and the month&rsquo;s figures stop counting it. Your
            name and this reason go in the activity log.
          </p>
        </ConfirmModal>
      )}

      {discarding && (
        <ConfirmModal
          title={tab.lines.length ? "Discard " + tab.tableName + "?" : "Close " + tab.tableName + "?"}
          blurb={tab.lines.length
            ? tab.lines.length + " item" + (tab.lines.length === 1 ? "" : "s") + " · " + naira(tab.total)
            : "Nothing has been ordered on it."}
          destructive
          confirmLabel={tab.lines.length ? "Discard it" : "Close it"}
          cancelLabel="Keep it open"
          busy={busy}
          // A table with something on it has to say why; an empty one is just
          // tidying up and asking would only train people to type "x".
          requireReason={tab.lines.length > 0}
          reasonLabel="Why is this being discarded?"
          reasonPlaceholder="Opened on the wrong table"
          onConfirm={discard}
          onClose={() => setDiscarding(false)}
        >
          <p style={{ fontSize: "0.8438rem", color: "var(--slate-soft)", margin: 0, lineHeight: 1.6 }}>
            {tab.lines.length
              ? "Nothing has been paid, so there is no money to reverse — the table and everything on it go. Your name, what was on it and this reason go in the activity log."
              : "The table is removed. Nothing was ordered on it, so nothing else changes."}
          </p>
        </ConfirmModal>
      )}

      {printing && (
        <Receipt
          receipt={receiptFor(tab, facility, user?.name)}
          mode={printing === "bill" ? "bill" : "receipt"}
          reprint={printing === "reprint"}
          // Both buttons that open this say "print", so it prints.
          autoPrint
          onClose={() => setPrinting(null)}
        />
      )}

      {overrideDialog}
    </div>
  );
}

/** A closed order: what it was, how it was settled, and the manager's undo. */
function SettledOrder({ tab, isManager, onVoid, onReprint, busy }) {
  return (
    <div className="ws-settled">
      {tab.voided && (
        <div style={{ marginBottom: 14 }}>
          <Note icon={Ban}>
            Voided by {tab.voidedBy || "a manager"} on {prettyDateTime(tab.voidedAt)} — {tab.voidReason}.
            The charge and any payment have been reversed.
          </Note>
        </div>
      )}

      <div className="cart-lines">
        {tab.lines.map((l) => (
          <div key={l.id} className="cl static">
            <div className="cl-name">{l.name}<span className="tc-meta">{l.qty} &times; {naira(l.unitPrice)}</span></div>
            <span className="cl-amt mono">{naira(l.lineTotal)}</span>
          </div>
        ))}
      </div>

      <div className="pos-total" style={{ marginTop: 14 }}>
        <span>Total</span>
        <strong className="mono">{naira(tab.total)}</strong>
      </div>

      <div className="ws-parts">
        {tab.parts.map((p, i) => (
          <div key={i}>
            <span>
              {p.settlement === "room"
                ? "Room " + p.roomNumber + (p.guestSurname ? " · " + p.guestSurname : "")
                : p.paymentMethod === "pos" ? "Card" : p.paymentMethod
                  ? p.paymentMethod[0].toUpperCase() + p.paymentMethod.slice(1)
                  : "Paid"}
            </span>
            <span className="mono">{naira(p.amount)}</span>
          </div>
        ))}
      </div>

      <p className="tc-meta" style={{ marginTop: 12 }}>
        Receipt {tab.receiptNo} · settled by {tab.settledBy || "—"} at {prettyDateTime(tab.settledAt)}
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
        {/* The receipt used to exist only in the moment the table closed. A
            guest who comes back for it an hour later is the ordinary case. */}
        {!tab.voided && (
          <button className="btn" onClick={onReprint} disabled={busy}>
            <Printer size={14} /> Print the receipt again
          </button>
        )}
        {isManager && !tab.voided && (
          <button className="btn" onClick={onVoid} disabled={busy}>
            <Ban size={14} /> Void this order
          </button>
        )}
      </div>
    </div>
  );
}

/** Putting an open table against a guest's room, or correcting it. */
function AttachRoom({ facility, tab, onClose, onDone }) {
  const { runWithOverride, overrideDialog } = useOverride();
  const [room, setRoom] = useState(tab.roomNumber || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const save = async (value) => {
    setBusy(true); setErr(null);
    try {
      // Attaching a room is a bartender's routine job, so a manager or the
      // owner doing it needs to say why. This had no override path at all and
      // simply refused them.
      await runWithOverride((extra) =>
        api.updateTab(facility.id, tab.id, { roomNumber: value, ...extra }));
      await onDone();
    } catch (e) { if (!e.cancelled) setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Modal
      title={tab.roomNumber ? "Change the room" : "Attach a room"}
      blurb="The surname is checked against the room before anything is charged to it."
      onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
        {tab.roomNumber && (
          <button className="btn" onClick={() => save("")} disabled={busy}>Detach</button>
        )}
        <button className="btn btn-gold" onClick={() => save(room.trim())} disabled={busy || !room.trim()}>
          {busy ? "Checking" : "Attach"}
        </button>
      </>}
    >
      <ErrorNote>{err}</ErrorNote>
      <Field label="Room number" htmlFor="at-room">
        <input
          id="at-room" value={room} autoFocus inputMode="numeric" placeholder="204"
          onChange={(e) => setRoom(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && room.trim()) save(room.trim()); }}
        />
      </Field>
      <Note icon={Search}>
        Only a guest who is checked in can be attached. Attaching a room does not charge
        anything to it — that still happens when the bill is settled.
      </Note>
      {overrideDialog}
    </Modal>
  );
}
