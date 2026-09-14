import { Sun, Moon } from "lucide-react";
import { Note } from "./ui";

/**
 * The week somebody is meant to work: which of the property's two shifts they
 * are on, per day.
 *
 * Two toggles and an Off rather than two time fields, because a hotel does not
 * close and the shifts it runs are a fact about the building, not about one
 * person. The times come from the property and are shown here so the choice
 * means something — "Morning" on its own tells a manager nothing at four in
 * the afternoon.
 *
 * Morning and Night are independent, so both can be on: that is a double, and
 * short-staffed weeks are ordinary. A roster that cannot say "she is covering
 * Tuesday on her own" gets worked around by not writing the week down at all.
 *
 * Off is the default. Most people do not work seven days, and a form that
 * starts full is one people forget to empty.
 */

const WEEK = [
  { day: 1, label: "Monday" },
  { day: 2, label: "Tuesday" },
  { day: 3, label: "Wednesday" },
  { day: 4, label: "Thursday" },
  { day: 5, label: "Friday" },
  { day: 6, label: "Saturday" },
  { day: 0, label: "Sunday" },
];

export default function RosterEditor({ shifts, windows, onChange }) {
  const list = shifts || [];
  const has = (day, shift) => list.some((s) => s.day === day && s.shift === shift);
  const morning = windows?.morning;
  const night = windows?.night;

  /** Turns one shift of one day on or off, leaving the other shift alone. */
  const toggle = (day, shift) => {
    onChange(has(day, shift)
      ? list.filter((s) => !(s.day === day && s.shift === shift))
      : [...list, { day, shift }]);
  };

  const clear = (day) => onChange(list.filter((s) => s.day !== day));

  const days = new Set(list.map((s) => s.day));
  const working = days.size;
  const nights = list.filter((s) => s.shift === "night").length;
  const doubles = [...days].filter((d) => has(d, "morning") && has(d, "night")).length;

  return (
    <div className="roster">
      <div className="roster-key">
        <span><Sun size={12} /> Morning {morning ? morning.startsAt + "–" + morning.endsAt : ""}</span>
        <span><Moon size={12} /> Night {night ? night.startsAt + "–" + night.endsAt : ""}</span>
      </div>

      {WEEK.map(({ day, label }) => {
        const am = has(day, "morning");
        const pm = has(day, "night");
        return (
          <div key={day} className={"roster-row" + (am || pm ? " on" : "")}>
            <span className="roster-day">
              {label}
              {am && pm && <span className="roster-double">Double</span>}
            </span>
            <div className="roster-pick">
              <button
                type="button"
                className={"chip-btn" + (am ? " on" : "")}
                onClick={() => toggle(day, "morning")}
              >
                <Sun size={12} /> Morning
              </button>
              <button
                type="button"
                className={"chip-btn" + (pm ? " on" : "")}
                onClick={() => toggle(day, "night")}
              >
                <Moon size={12} /> Night
              </button>
              <button
                type="button"
                className={"chip-btn" + (!am && !pm ? " on" : "")}
                onClick={() => clear(day)}
              >
                Off
              </button>
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: 10 }}>
        <Note>
          {working === 0
            ? "No shifts set. They can still sign in and work — nothing is locked — but nobody will be told when they are due."
            : working + " day" + (working === 1 ? "" : "s") + " a week" +
              (nights ? ", " + nights + " of them nights" : "") +
              (doubles ? ", " + doubles + " of them a double round the clock" : "") +
              ". The night shift runs through midnight and ends the next morning."}
        </Note>
      </div>
    </div>
  );
}
