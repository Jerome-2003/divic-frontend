import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, X } from "lucide-react";

/**
 * The nudge at a month end.
 *
 * A month's figures are most useful in the week after it closes and least
 * useful the longer nobody looks. Asking on its own is the difference between
 * a record filed every month and one filed the first month. It stops asking
 * the moment a copy is actually taken — per person, so one manager printing it
 * does not silently answer for the other.
 */
export default function ReportDuePrompt({ due, onOpen }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  const first = due[0];
  const rest = due.slice(1);

  return (
    <div className="due-prompt">
      <CalendarClock size={18} />
      <div className="dp-body">
        <strong>{first.label} has closed. Take a copy for the records.</strong>
        <p>
          Open it, check it reads right, then Save as PDF or print. This stops asking
          once you have a copy.
          {rest.length > 0 && " " + rest.length + " earlier " +
            (rest.length === 1 ? "period is" : "periods are") + " still outstanding too."}
        </p>
        <div className="dp-actions">
          {/* On Records the period is switched in place; anywhere else there
              is nothing to switch, so it is a link to the page that has it. */}
          {due.map((d) => (onOpen ? (
            <button key={d.kind + d.period} className="btn btn-sm" onClick={() => onOpen(d)}>
              Open {d.label}
            </button>
          ) : (
            <Link key={d.kind + d.period} className="btn btn-sm" to="/records">
              Open {d.label}
            </Link>
          )))}
        </div>
      </div>
      <button className="btn btn-sm btn-quiet" onClick={() => setHidden(true)} aria-label="Not now">
        <X size={15} />
      </button>
    </div>
  );
}
