import { useState } from "react";
import { Moon, UserCheck } from "lucide-react";
import api from "../lib/api";
import { useApi } from "../lib/useApi";
import { LOCATIONS, ROLE_LABEL } from "../lib/constants";
import { prettyDateTime, today, addDays } from "../lib/format";
import { Card, Empty, Loading, ErrorNote, Chip, Note } from "./ui";

/**
 * Shifts actually worked, beside the record of what people did.
 *
 * Two things are worth seeing here that a list of changes cannot show. A shift
 * still open long after it should have ended is somebody who went home without
 * saying so, and until it is closed they read as on duty. And a shift worked
 * with nobody rostered for it is either cover, which is fine and worth
 * recording, or somebody working hours nobody agreed, which is the reason to
 * keep the record at all.
 */

const RANGES = [
  { key: "today", label: "Today", back: 0 },
  { key: "week", label: "Last 7 days", back: 6 },
  { key: "month", label: "Last 30 days", back: 29 },
];

const hours = (mins) => {
  const h = Math.floor((mins || 0) / 60);
  const m = (mins || 0) % 60;
  return h ? h + "h " + String(m).padStart(2, "0") + "m" : m + "m";
};

export default function ShiftsWorked() {
  const [range, setRange] = useState("week");
  const back = RANGES.find((r) => r.key === range).back;
  const { data, loading, error } = useApi(
    () => api.shiftsWorked(addDays(today(), -back), today()),
    [back]
  );

  const rows = data || [];
  const open = rows.filter((r) => r.open);
  // A shift running past twelve hours is almost always one somebody forgot.
  const forgotten = open.filter((r) => r.minutes > 12 * 60);

  return (
    <>
      <ErrorNote>{error}</ErrorNote>

      {forgotten.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Note>
            {forgotten.map((r) => r.name).join(", ")}{" "}
            {forgotten.length === 1 ? "has" : "have"} been on shift over twelve hours.
            Likely gone home without ending it — a manager can close it on the Staff page.
          </Note>
        </div>
      )}

      <Card
        title="Shifts worked"
        sub={open.length + " still open"}
        action={
          <div className="quick-range" style={{ marginTop: 0 }}>
            {RANGES.map((r) => (
              <button key={r.key} className={"chip-btn" + (range === r.key ? " on" : "")}
                onClick={() => setRange(r.key)}>{r.label}</button>
            ))}
          </div>
        }
      >
        {loading ? <Loading /> : rows.length === 0 ? (
          <Empty heading="No shifts in this stretch" text="A shift opens when somebody signs in." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Who</th><th>Property</th><th>Started</th><th>Ended</th>
                  <th>Worked</th><th>Rostered</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{r.name}</div>
                      {r.role && <div className="tc-meta">{ROLE_LABEL[r.role] || r.role}</div>}
                    </td>
                    <td style={{ fontSize: "0.7812rem" }}>
                      {r.location === "all" ? "Both" : LOCATIONS[r.location]?.name || r.location}
                    </td>
                    <td className="tc-meta">{prettyDateTime(r.startedAt)}</td>
                    <td className="tc-meta">
                      {r.open
                        ? <Chip tone="sage">Still on</Chip>
                        : <>
                            {prettyDateTime(r.endedAt)}
                            {r.endedByOther && (
                              <div className="tc-meta">
                                <UserCheck size={11} /> closed by {r.endedByOther}
                              </div>
                            )}
                          </>}
                    </td>
                    <td className="mono" style={{ fontSize: "0.7812rem" }}>{hours(r.minutes)}</td>
                    <td>
                      {r.wasRostered ? (
                        <span className="shift-dot sd-on"><i /> {r.rosteredWindow}</span>
                      ) : (
                        <span className="shift-dot sd-extra"><i /> Not rostered</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div style={{ marginTop: 16 }}>
        <Note icon={Moon}>
          A shift opens when somebody signs in and closes when they say they are finished —
          signing out is not the same as going home, so the app asks which.
        </Note>
      </div>
    </>
  );
}
