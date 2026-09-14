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
              <input
                id={"m-" + r.location} type="time" value={r.morningStartsAt}
                onChange={(e) => set(r.location, { morningStartsAt: e.target.value })}
              />
            </Field>
            <Field label="Nights start at" htmlFor={"n-" + r.location}>
              <input
                id={"n-" + r.location} type="time" value={r.nightStartsAt}
                onChange={(e) => set(r.location, { nightStartsAt: e.target.value })}
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
