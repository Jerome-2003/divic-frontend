import { useState } from "react";
import { Sun, Moon } from "lucide-react";
import api from "../lib/api";
import { LOCATIONS } from "../lib/constants";
import { Modal, Field, Row, ErrorNote, Note } from "./ui";

/**
 * When the two shifts change over at a property.
 *
 * Two times, not four: when the morning comes on and when the night does, each
 * shift running until the other starts. Four free times can be set to leave an
 * hour at dawn covered by nobody, or two hours covered by both, and neither
 * mistake announces itself — it surfaces weeks later as an argument about who
 * was supposed to be there. Two times cannot express a gap, so the form does
 * not need to warn about one.
 *
 * The resulting windows are shown as they are typed, because "mornings start
 * at 07:00" and "the night shift is twelve hours" are the same fact and a
 * manager should not have to do the subtraction.
 */

const minutesOf = (t) => {
  const [h, m] = String(t || "0:0").split(":").map(Number);
  return h * 60 + m;
};

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

/**
 * Hour and minute, as two lists.
 *
 * This was a native time input, which on most browsers is a pair of tiny
 * spinners you have to know to type into: a manager who wanted the night shift
 * to start at 18:59 could not see how to say so, and every minute that was not
 * on the hour felt like it was not on offer. Two plain dropdowns put all
 * fourteen hundred and forty of them a click away, and read the same on a phone
 * at the desk as on the office machine.
 */
function TimePicker({ id, value, onChange }) {
  const [h = "07", m = "00"] = String(value || "07:00").split(":");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <select id={id} value={h} onChange={(e) => onChange(e.target.value + ":" + m)}
        aria-label="Hour" style={{ flex: 1 }}>
        {HOURS.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
      <span style={{ color: "var(--slate-faint)" }}>:</span>
      <select value={m} onChange={(e) => onChange(h + ":" + e.target.value)}
        aria-label="Minute" style={{ flex: 1 }}>
        {MINUTES.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
    </div>
  );
}

const span = (from, to) => {
  const a = minutesOf(from);
  const b = minutesOf(to);
  const mins = b > a ? b - a : 1440 - a + b;
  return (mins / 60).toFixed(mins % 60 ? 1 : 0) + "h";
};

export default function ShiftTimesModal({ times, onClose, onSaved }) {
  const [rows, setRows] = useState(() =>
    (times || []).map((t) => ({ ...t })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const set = (location, patch) =>
    setRows((prev) => prev.map((r) => (r.location === location ? { ...r, ...patch } : r)));

  const save = async () => {
    setBusy(true); setError(null);
    try {
      for (const r of rows) {
        await api.setShiftTimes(r.location, r.morningStartsAt, r.nightStartsAt);
      }
      onSaved?.();
      onClose();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const clash = rows.find((r) => r.morningStartsAt === r.nightStartsAt);

  return (
    <Modal
      wide
      title="Shift times"
      blurb="When the two shifts change over. Each runs until the other starts, so the day is always covered."
      onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn btn-gold" onClick={save} disabled={busy || Boolean(clash)}>
          {busy ? "Saving" : "Save times"}
        </button>
      </>}
    >
      <ErrorNote>{error || (clash
        ? "Both shifts cannot change over at the same moment — one would be the whole day and the other nothing."
        : null)}</ErrorNote>

      {rows.map((r) => (
        <div key={r.location} className="shift-times">
          <h4>{LOCATIONS[r.location]?.name || r.location}</h4>
          <Row>
            <Field label="Mornings start at" htmlFor={"m-" + r.location}>
              <TimePicker
                id={"m-" + r.location} value={r.morningStartsAt}
                onChange={(v) => set(r.location, { morningStartsAt: v })}
              />
            </Field>
            <Field label="Nights start at" htmlFor={"n-" + r.location}>
              <TimePicker
                id={"n-" + r.location} value={r.nightStartsAt}
                onChange={(v) => set(r.location, { nightStartsAt: v })}
              />
            </Field>
          </Row>
          <div className="shift-preview">
            <span>
              <Sun size={13} /> Morning {r.morningStartsAt}–{r.nightStartsAt}
              <em>{span(r.morningStartsAt, r.nightStartsAt)}</em>
            </span>
            <span>
              <Moon size={13} /> Night {r.nightStartsAt}–{r.morningStartsAt}
              <em>{span(r.nightStartsAt, r.morningStartsAt)}</em>
            </span>
          </div>
        </div>
      ))}

      <Note>
        Changing these moves everybody at that property at once — it is the building's
        hours, not one person's. Shifts already worked keep the hours they were worked to.
      </Note>
    </Modal>
  );
}
