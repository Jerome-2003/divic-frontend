import { Sun, Moon } from "lucide-react";
import { Note } from "./ui";

/**
 * The week somebody is meant to work: which of the property's two shifts they
 * are on, per day.
 *
 * Three buttons a day rather than two time fields, because a hotel does not
 * close and the shifts it runs are a fact about the building, not about one
 * person. The times come from the property and are shown here so the choice
 * means something — "Morning" on its own tells a manager nothing at four in
 * the afternoon.
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
  const byDay = Object.fromEntries((shifts || []).map((s) => [s.day, s.shift]));
  const morning = windows?.morning;
  const night = windows?.night;

  const set = (day, shift) => {
    const rest = (shifts || []).filter((s) => s.day !== day);
    onChange(shift ? [...rest, { day, shift }] : rest);
  };

  const working = (shifts || []).length;
  const nights = (shifts || []).filter((s) => s.shift === "night").length;

  return (
    <div className="roster">
      <div className="roster-key">
        <span><Sun size={12} /> Morning {morning ? morning.startsAt + "–" + morning.endsAt : ""}</span>
        <span><Moon size={12} /> Night {night ? night.startsAt + "–" + night.endsAt : ""}</span>
      </div>

      {WEEK.map(({ day, label }) => {
        const on = byDay[day];
        return (
          <div key={day} className={"roster-row" + (on ? " on" : "")}>
            <span className="roster-day">{label}</span>
            <div className="roster-pick">
              <button
                type="button"
                className={"chip-btn" + (on === "morning" ? " on" : "")}
                onClick={() => set(day, on === "morning" ? null : "morning")}
              >
                <Sun size={12} /> Morning
              </button>
              <button
                type="button"
                className={"chip-btn" + (on === "night" ? " on" : "")}
                onClick={() => set(day, on === "night" ? null : "night")}
              >
                <Moon size={12} /> Night
              </button>
              <button
                type="button"
                className={"chip-btn" + (!on ? " on" : "")}
                onClick={() => set(day, null)}
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
              ". The night shift runs through midnight and ends the next morning."}
        </Note>
      </div>
    </div>
  );
}
