import { Moon } from "lucide-react";
import { Note } from "./ui";

/**
 * The week somebody is meant to work, set on their account.
 *
 * Seven rows, Monday first, because that is how a week is said aloud even
 * though the code numbers it from Sunday. A day is off until it is switched
 * on, which is the right default: most people do not work seven days, and a
 * form that starts with everything filled in is a form people forget to empty.
 *
 * A shift ending at or before it starts runs through midnight — 18:00 to 02:00
 * is a bar's Friday night, worked partly on Saturday. That is not an error and
 * the row says so rather than leaving the manager to wonder.
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

const minutesOf = (t) => {
  const [h, m] = String(t || "0:0").split(":").map(Number);
  return h * 60 + m;
};

export const wrapsMidnight = (s) => minutesOf(s.endsAt) <= minutesOf(s.startsAt);

export const shiftHours = (s) => {
  const start = minutesOf(s.startsAt);
  const end = minutesOf(s.endsAt);
  const mins = end > start ? end - start : 1440 - start + end;
  return (mins / 60).toFixed(mins % 60 ? 1 : 0);
};

export default function RosterEditor({ shifts, onChange }) {
  const byDay = Object.fromEntries((shifts || []).map((s) => [s.day, s]));

  const setDay = (day, patch) => {
    const rest = (shifts || []).filter((s) => s.day !== day);
    if (patch === null) return onChange(rest);
    const current = byDay[day] || { day, startsAt: "08:00", endsAt: "16:00" };
    onChange([...rest, { ...current, ...patch, day }]);
  };

  const working = (shifts || []).length;

  return (
    <div className="roster">
      {WEEK.map(({ day, label }) => {
        const s = byDay[day];
        return (
          <div key={day} className={"roster-row" + (s ? " on" : "")}>
            <label className="roster-day">
              <input
                type="checkbox"
                checked={Boolean(s)}
                onChange={(e) => setDay(day, e.target.checked ? {} : null)}
                aria-label={"Working " + label}
              />
              <span>{label}</span>
            </label>

            {s ? (
              <div className="roster-times">
                <input
                  type="time" value={s.startsAt}
                  onChange={(e) => setDay(day, { startsAt: e.target.value })}
                  aria-label={label + " starts"}
                />
                <span className="roster-dash">to</span>
                <input
                  type="time" value={s.endsAt}
                  onChange={(e) => setDay(day, { endsAt: e.target.value })}
                  aria-label={label + " ends"}
                />
                <span className="roster-len">
                  {shiftHours(s)}h
                  {wrapsMidnight(s) && (
                    <span className="roster-night" title="Ends the next morning">
                      <Moon size={11} /> overnight
                    </span>
                  )}
                </span>
              </div>
            ) : (
              <span className="roster-off">Off</span>
            )}
          </div>
        );
      })}

      <div style={{ marginTop: 10 }}>
        <Note>
          {working === 0
            ? "No shifts set. They can still sign in and work — nothing is locked — but nobody will be told when they are due."
            : working + " day" + (working === 1 ? "" : "s") + " a week. " +
              "A shift ending before it starts runs overnight, which is how a bar's Friday night is entered."}
        </Note>
      </div>
    </div>
  );
}
