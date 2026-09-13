import { useState } from "react";
import { Plus, Trash2, Percent, BadgePercent } from "lucide-react";
import api from "../lib/api";
import { useApi } from "../lib/useApi";
import { naira, cap } from "../lib/format";
import { Card, Field, Row, Modal, Empty, Chip, Note, ErrorNote, ConfirmModal } from "./ui";

/**
 * Offers against the published rates.
 *
 * They live beside the rate table rather than inside it because that is what
 * they are to everyone who touches them: a separate thing the manager turns on
 * and off, shown to guests in its own right on the website, that happens to
 * come off the price at the moment somebody books.
 *
 * Whether an offer is a percentage or a flat amount is the manager's call, one
 * offer at a time — "20% off in the low season" and "₦20,000 off a week" are
 * both things hotels sell, and making one of them wear the other's shape would
 * mean doing arithmetic in your head before typing it in.
 *
 * Nothing here does the sums. The server prices every booking through one
 * shared path, so what the website advertises and what the desk charges cannot
 * come apart.
 */
export default function DiscountsCard({ location, typeOrder, editable }) {
  const { data, loading, error, reload } = useApi(() => api.discounts(location), [location]);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const rows = data || [];
  const live = rows.filter((d) => d.active);

  const toggle = async (d) => {
    setErr(null);
    try { await api.updateDiscount(location, d.id, { active: !d.active }); await reload(); }
    catch (e) { setErr(e.message); }
  };

  const remove = async () => {
    setBusy(true); setErr(null);
    try { await api.deleteDiscount(location, removing.id); setRemoving(null); await reload(); }
    catch (e) { setErr(e.message); setRemoving(null); }
    finally { setBusy(false); }
  };

  return (
    <>
      <Card
        title="Discounts"
        sub="Shown on the website as offers in their own right. Anything switched on here comes off the price automatically when a guest books — at the desk as well as online."
        action={editable && (
          <button className="btn btn-gold" onClick={() => setAdding(true)}>
            <Plus size={15} /> New offer
          </button>
        )}
      >
        <ErrorNote>{err || error}</ErrorNote>

        {loading ? null : rows.length === 0 ? (
          <Empty
            heading="No offers running"
            text={editable
              ? "Guests pay the rates above. Add an offer and it appears on the website and comes off the price by itself."
              : "Offers are set by a manager or the owner."}
          />
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Offer</th><th>Takes off</th><th>Applies to</th><th>When</th>
                <th>Showing</th>{editable && <th />}
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} style={d.active ? undefined : { opacity: 0.55 }}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{d.name}</div>
                    {d.blurb && <div className="tc-meta">{d.blurb}</div>}
                  </td>
                  <td className="mono" style={{ whiteSpace: "nowrap" }}>{d.label}</td>
                  <td style={{ fontSize: "0.7812rem" }}>
                    {d.roomTypes.length ? d.roomTypes.map(cap).join(", ") : "Every room"}
                    {d.minNights > 1 && (
                      <div className="tc-meta">{d.minNights} nights or more</div>
                    )}
                  </td>
                  <td style={{ fontSize: "0.75rem", color: "var(--slate-soft)" }}>
                    {d.startsOn || d.endsOn
                      ? (d.startsOn || "now") + " → " + (d.endsOn || "no end")
                      : "Always"}
                  </td>
                  <td>
                    {editable ? (
                      <button className="btn btn-sm" onClick={() => toggle(d)}>
                        {d.active ? "Turn off" : "Turn on"}
                      </button>
                    ) : (
                      <Chip tone={d.active ? "sage" : "wine"}>{d.active ? "On the website" : "Off"}</Chip>
                    )}
                  </td>
                  {editable && (
                    <td style={{ textAlign: "right" }}>
                      <button className="btn btn-sm btn-quiet" aria-label={"Delete " + d.name}
                        onClick={() => setRemoving(d)}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {live.length > 1 && (
        <div style={{ marginTop: 12 }}>
          <Note icon={BadgePercent}>
            {live.length} offers are running. A stay that qualifies for more than one gets
            all of them — percentages first, then any flat amounts.
          </Note>
        </div>
      )}

      {adding && (
        <OfferForm
          location={location}
          typeOrder={typeOrder}
          onClose={() => setAdding(false)}
          onSaved={reload}
        />
      )}

      {removing && (
        <ConfirmModal
          title={"Delete " + removing.name + "?"}
          blurb="It stops showing on the website straight away."
          destructive
          confirmLabel="Delete it"
          cancelLabel="Keep it"
          busy={busy}
          onConfirm={remove}
          onClose={() => setRemoving(null)}
        >
          <p style={{ fontSize: "0.8438rem", color: "var(--slate-soft)", margin: 0, lineHeight: 1.6 }}>
            Bookings already taken keep the price they were given — this changes nothing
            about a bill that already exists. To stop an offer without losing the record
            of it, turn it off instead.
          </p>
        </ConfirmModal>
      )}
    </>
  );
}

function OfferForm({ location, typeOrder, onClose, onSaved }) {
  const [d, setD] = useState({
    name: "", blurb: "", kind: "percent", value: "",
    roomTypes: [], minNights: 1, startsOn: "", endsOn: "", active: true,
  });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setD({ ...d, [k]: v });

  const toggleType = (t) => set("roomTypes",
    d.roomTypes.includes(t) ? d.roomTypes.filter((x) => x !== t) : [...d.roomTypes, t]);

  const save = async () => {
    setBusy(true); setErr(null);
    try {
      await api.createDiscount(location, {
        ...d,
        value: Number(d.value),
        minNights: Number(d.minNights) || 1,
        startsOn: d.startsOn || undefined,
        endsOn: d.endsOn || undefined,
      });
      onSaved(); onClose();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <Modal
      title="New offer"
      blurb="Guests read the name and the line under it on the website, so write both as you would say them."
      onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn btn-gold" onClick={save} disabled={busy || !d.name.trim() || !Number(d.value)}>
          {busy ? "Saving" : d.active ? "Save and show it" : "Save it off"}
        </button>
      </>}
    >
      <ErrorNote>{err}</ErrorNote>

      <Field label="Name" htmlFor="of-name">
        <input id="of-name" value={d.name} maxLength={80} autoFocus
          placeholder="December escape" onChange={(e) => set("name", e.target.value)} />
      </Field>
      <Field label="One line about it" htmlFor="of-blurb">
        <input id="of-blurb" value={d.blurb} maxLength={240}
          placeholder="Stay with us over the holidays and save."
          onChange={(e) => set("blurb", e.target.value)} />
      </Field>

      <Row>
        <Field label="Kind of discount" htmlFor="of-kind">
          <select id="of-kind" value={d.kind} onChange={(e) => set("kind", e.target.value)}>
            <option value="percent">A percentage off</option>
            <option value="fixed">An amount off</option>
          </select>
        </Field>
        <Field
          label={d.kind === "percent" ? "Per cent off the stay" : "Naira off the stay"}
          htmlFor="of-value"
        >
          <input id="of-value" value={d.value} inputMode="numeric" className="mono"
            placeholder={d.kind === "percent" ? "15" : "20000"}
            onChange={(e) => set("value", e.target.value.replace(/[^0-9]/g, ""))} />
        </Field>
      </Row>

      {/* Said out loud, because "₦20,000 off" reads as per night to plenty of
          people and the difference on a week's stay is enormous. */}
      <div style={{ marginBottom: 14 }}>
        <Note icon={Percent}>
          {d.kind === "percent"
            ? "Taken off the whole stay — " + (Number(d.value) || 0) + "% of the room total, however many nights it runs."
            : "Taken off the whole stay once, not off each night" +
              (Number(d.value) ? " — " + naira(Number(d.value)) + " off the room total." : ".")}
        </Note>
      </div>

      <Field label="Which rooms" htmlFor="of-types">
        <div className="chip-pick" id="of-types">
          {typeOrder.map((t) => (
            <button
              key={t} type="button"
              className={"chip-btn" + (d.roomTypes.includes(t) ? " on" : "")}
              onClick={() => toggleType(t)}
            >
              {cap(t)}
            </button>
          ))}
        </div>
        <div className="tc-meta" style={{ marginTop: 6 }}>
          {d.roomTypes.length ? "Only these types." : "None picked, so it applies to every room type."}
        </div>
      </Field>

      <Row>
        <Field label="Shortest stay it applies to" htmlFor="of-min">
          <input id="of-min" value={d.minNights} inputMode="numeric" className="mono"
            onChange={(e) => set("minNights", e.target.value.replace(/[^0-9]/g, ""))} />
        </Field>
        <Field label="Show it straight away" htmlFor="of-active">
          <select id="of-active" value={d.active ? "yes" : "no"}
            onChange={(e) => set("active", e.target.value === "yes")}>
            <option value="yes">Yes, put it on the website</option>
            <option value="no">No, save it for later</option>
          </select>
        </Field>
      </Row>

      <Row>
        <Field label="Arrivals from" htmlFor="of-from">
          <input id="of-from" type="date" value={d.startsOn} onChange={(e) => set("startsOn", e.target.value)} />
        </Field>
        <Field label="Arrivals until" htmlFor="of-to">
          <input id="of-to" type="date" value={d.endsOn} onChange={(e) => set("endsOn", e.target.value)} />
        </Field>
      </Row>
      <Note>
        Judged on the night the guest arrives, not every night of the stay — so a
        guest arriving on the last day of the offer keeps it for their whole stay.
        Leave both blank and it runs until you turn it off.
      </Note>
    </Modal>
  );
}
