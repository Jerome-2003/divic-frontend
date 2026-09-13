import { Martini, UtensilsCrossed, Waves, Dumbbell, Building2 } from "lucide-react";

/**
 * "Which one are you working?" — the screen someone assigned to more than one
 * facility sees before anything else.
 *
 * It is a whole screen rather than a row of buttons in a corner. This is the
 * only thing on the page and the only decision to make, so it sits in the
 * middle where the eye already is; two small tiles tucked into the top-left of
 * an otherwise empty page read as a stray control rather than as the question
 * being asked.
 *
 * Shared by the bar and by the pool and gym screens because it is the same
 * question in all three, and two copies of it would drift.
 */

const ICONS = {
  bar: Martini,
  restaurant: UtensilsCrossed,
  pool: Waves,
  gym: Dumbbell,
};

export default function FacilityPicker({ title, facilities, onPick }) {
  return (
    <div className="picker">
      <h2 className="picker-h">{title}</h2>
      <p className="picker-sub">
        You are assigned to {facilities.length}. Choose the one you are working now —
        you can switch at any time.
      </p>
      <div className="picker-grid">
        {facilities.map((f) => {
          const Icon = ICONS[f.type] || Building2;
          return (
            <button key={f.id} className="picker-tile" onClick={() => onPick(f.id)}>
              <Icon size={26} strokeWidth={1.4} />
              <span className="pk-name">{f.name}</span>
              {f.status && f.status !== "open" && (
                <span className="pk-closed">
                  {f.status === "maintenance" ? "Under maintenance" : "Closed"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
