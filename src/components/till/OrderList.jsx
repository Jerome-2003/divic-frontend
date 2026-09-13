import { Search, Plus, BedDouble, Ban } from "lucide-react";
import { naira } from "../../lib/format";

/**
 * Today's orders down the side of the till, as cards rather than table rows.
 *
 * A card is the right shape here because the four things that matter — when,
 * which table, whose room, and whether the money is in — are glanced at, not
 * read. Someone mid-shift holding a handheld in one hand is scanning for one
 * order among fifteen, and a row of columns makes them read every field of
 * every row to find it.
 *
 * The filters are the three states the bar actually has: unpaid, paid, and
 * charged to a room. Voided orders stay visible under All rather than
 * disappearing, because an order that vanishes is indistinguishable from one
 * that was never taken.
 */

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unpaid", label: "Open" },
  { key: "room", label: "On a room" },
  { key: "paid", label: "Paid" },
];

const STATE = {
  unpaid: { label: "Unpaid", cls: "os-unpaid" },
  paid: { label: "Paid", cls: "os-paid" },
  room: { label: "On a room", cls: "os-room" },
  voided: { label: "Voided", cls: "os-void" },
};

const timeOf = (iso) =>
  new Date(iso).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", hour12: false });

export default function OrderList({
  orders, filter, onFilter, query, onQuery, selectedId, onSelect, onNew, canOpen,
}) {
  const counts = orders.reduce((a, o) => { a[o.state] = (a[o.state] || 0) + 1; return a; }, {});

  const q = query.trim().toLowerCase();
  const shown = orders.filter((o) => {
    if (filter !== "all" && o.state !== filter) return false;
    if (!q) return true;
    // Searched by the things a person would type: the table, the room, or the
    // surname they have just been given at the counter.
    return [o.tableName, o.roomNumber, o.guestSurname, o.guestName, o.receiptNo]
      .filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
  });

  return (
    <aside className="ol">
      <div className="ol-head">
        <h3>Today&rsquo;s orders</h3>
        <button className="btn btn-sm btn-gold" onClick={onNew} disabled={!canOpen}>
          <Plus size={14} /> New
        </button>
      </div>

      <div className="ol-search">
        <Search size={14} />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Table, room or surname"
          aria-label="Search today's orders"
        />
      </div>

      <div className="ol-tabs">
        {FILTERS.map((f) => {
          const n = f.key === "all" ? orders.length : counts[f.key] || 0;
          return (
            <button
              key={f.key}
              className={filter === f.key ? "on" : ""}
              onClick={() => onFilter(f.key)}
            >
              {f.label} <span className="olt-n">{n}</span>
            </button>
          );
        })}
      </div>

      <div className="ol-cards">
        {shown.length === 0 ? (
          <p className="ol-none">
            {orders.length === 0
              ? "Nothing yet today. Open a table when a guest sits down."
              : q
                ? "Nothing matches “" + query.trim() + "”."
                : "Nothing under this filter."}
          </p>
        ) : shown.map((o) => {
          const st = STATE[o.state] || STATE.unpaid;
          return (
            <button
              key={o.id}
              className={"oc" + (selectedId === o.id ? " on" : "") + (o.state === "voided" ? " voided" : "")}
              onClick={() => onSelect(o.id)}
            >
              <div className="oc-top">
                <span className="oc-time mono">{timeOf(o.openedAt)}</span>
                <span className={"oc-state " + st.cls}>
                  <i /> {st.label}
                </span>
              </div>
              <div className="oc-name">{o.tableName}</div>
              <div className="oc-who">
                {o.roomNumber ? (
                  <>
                    <BedDouble size={12} /> Room {o.roomNumber}
                    {o.guestSurname && <> &middot; {o.guestSurname}</>}
                  </>
                ) : o.guestName ? o.guestName : <span className="oc-walkin">Walk-in</span>}
              </div>
              <div className="oc-foot">
                <span>{o.lines.length} item{o.lines.length === 1 ? "" : "s"}</span>
                <strong className="mono">{naira(o.total)}</strong>
              </div>
              {o.split && <div className="oc-flag">Split {o.parts.length} ways</div>}
              {o.state === "voided" && (
                <div className="oc-flag void"><Ban size={11} /> {o.voidReason}</div>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
