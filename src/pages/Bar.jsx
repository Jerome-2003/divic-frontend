import { useState } from "react";
import {
  ArrowLeft, Plus, Settings2, TrendingUp, X,
} from "lucide-react";
import api from "../lib/api";
import { useApi } from "../lib/useApi";
import { useOverride } from "../lib/useOverride";
import { useAuth } from "../context/AuthContext";
import { naira } from "../lib/format";
import { PageHead, Field, Empty, Loading, ErrorNote, Note, Modal } from "../components/ui";
import Receipt from "../components/Receipt";
import StaffFacilitiesCard from "../components/StaffFacilitiesCard";
import FacilityPicker from "../components/FacilityPicker";
import OrderList from "../components/till/OrderList";
import OrderWorkspace from "../components/till/OrderWorkspace";
import MenuManager from "../components/till/MenuManager";
import SalesCard from "../components/till/SalesCard";

/**
 * The till at a bar or the restaurant: today's orders down one side, the menu
 * and the running bill on the other.
 *
 * A table is a running tab rather than a single sale, because that is how a bar
 * actually works — drinks arrive over an evening and the guest pays once at the
 * end. Prices come from this facility's own menu and are read server-side when
 * a line is added; nothing here can name its own price.
 *
 * Restaurants use this same screen. The job is identical — tables, orders, one
 * bill — and giving it a second near-identical page would mean fixing every bug
 * twice.
 *
 * Both panels are visible at once on a laptop at the counter. On a handheld,
 * which is what most of a shift is worked on, the list is the screen and
 * choosing an order replaces it — two panes side by side at 400px wide is two
 * panes neither of which can be used.
 */
export default function Bar() {
  const { location, user } = useAuth();
  const isManager = ["manager", "owner"].includes(user.role);

  const { data: facilities, loading, error } = useApi(() => api.facilities(location), [location]);

  // Bars and the restaurant: anything that sells from a list.
  const mine = (facilities || []).filter((f) => f.assignedToMe && f.sellsItems);
  const [pickedId, setPickedId] = useState(null);
  const facility = mine.find((f) => f.id === pickedId) || (mine.length === 1 ? mine[0] : null);

  if (loading) return <Loading />;
  if (error) return <ErrorNote>{error}</ErrorNote>;

  if (!mine.length) {
    return (
      <>
        <PageHead title="Bar" />
        <Empty
          heading="No bar assigned to you"
          text="This account is not assigned to a bar or the restaurant at this property. A manager can change that on the Staff screen."
        />
      </>
    );
  }

  if (!facility) {
    return <FacilityPicker title="Which bar are you working?" facilities={mine} onPick={setPickedId} />;
  }

  return (
    <Till
      key={facility.id}
      facility={facility}
      isManager={isManager}
      user={user}
      onSwitch={mine.length > 1 ? () => setPickedId(null) : null}
    />
  );
}

function Till({ facility, isManager, user, onSwitch }) {
  // One fetch for the whole day, open and settled alike. Two lists meant two
  // things that could disagree about the same order.
  const { data: orders, reload } = useApi(() => api.tabs(facility.id, "all"), [facility.id]);
  const { data: menu, reload: reloadMenu } = useApi(() => api.menu(facility.id, true), [facility.id]);
  const { runWithOverride, overrideDialog } = useOverride();

  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [opening, setOpening] = useState(false);
  const [editingMenu, setEditingMenu] = useState(false);
  const [showSales, setShowSales] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [err, setErr] = useState(null);

  const list = orders || [];
  const selected = list.find((o) => o.id === selectedId) || null;
  const takings = list
    .filter((o) => o.status === "settled" && !o.voided)
    .reduce((s, o) => s + o.total, 0);

  const openTable = async ({ tableName, guestName, roomNumber }) => {
    setErr(null);
    try {
      const tab = await runWithOverride((extra) => api.openTab(facility.id, {
        tableName, guestName: guestName || undefined, roomNumber: roomNumber || undefined, ...extra,
      }));
      setOpening(false);
      await reload();
      setSelectedId(tab.id);
    } catch (e) {
      if (!e.cancelled) setErr(e.message);
      throw e;
    }
  };

  const canOpen = facility.status === "open";

  return (
    <>
      <PageHead
        title={facility.name}
        blurb={list.length
          ? list.filter((o) => o.state === "unpaid").length + " open · " + naira(takings) + " taken today"
          : "Open a table when a guest sits down."}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {onSwitch && <button className="btn" onClick={onSwitch}><ArrowLeft size={15} /> Switch</button>}
          {isManager && (
            <>
              <button className={"btn" + (showSales ? " btn-gold" : "")} onClick={() => setShowSales(!showSales)}>
                <TrendingUp size={15} /> Takings
              </button>
              <button className="btn" onClick={() => setEditingMenu(true)}>
                <Settings2 size={15} /> Menu
              </button>
            </>
          )}
          <button className="btn btn-gold" onClick={() => setOpening(true)} disabled={!canOpen}>
            <Plus size={15} /> Open a table
          </button>
        </div>
      </PageHead>

      <ErrorNote>{err}</ErrorNote>

      {!canOpen && (
        <div style={{ marginBottom: 16 }}>
          <Note>
            {facility.name} is {facility.status === "maintenance" ? "under maintenance" : "closed"},
            so it cannot take a new order. Tables already open can still be settled.
          </Note>
        </div>
      )}

      {isManager && !menu?.length && (
        <div style={{ marginBottom: 16 }}>
          <Note>
            {facility.name} has no menu yet. Add items with the Menu button before taking orders.
          </Note>
        </div>
      )}

      {showSales && isManager && (
        <div style={{ marginBottom: 18 }}>
          <SalesCard facility={facility} />
        </div>
      )}

      <div className={"till" + (selected ? " has-open" : "")}>
        <OrderList
          orders={list}
          filter={filter}
          onFilter={setFilter}
          query={query}
          onQuery={setQuery}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onNew={() => setOpening(true)}
          canOpen={canOpen}
        />

        <div className="till-main">
          {selected ? (
            <>
              {/* On a handheld the list is the screen, so there has to be a
                  way back to it that is not the browser's. */}
              <button className="till-back" onClick={() => setSelectedId(null)}>
                <X size={15} /> Back to today&rsquo;s orders
              </button>
              <OrderWorkspace
                facility={facility}
                tab={selected}
                menu={menu || []}
                isManager={isManager}
                user={user}
                onChanged={reload}
                onSettled={async (r) => { setReceipt(r); await reload(); }}
              />
            </>
          ) : (
            <div className="till-idle">
              <Empty
                heading={list.length ? "Pick an order" : "Nothing open yet"}
                text={list.length
                  ? "Choose one from today's orders to add to it, settle it, or look at what was on it."
                  : "When a guest sits down, open a table for them and add their order to it."}
              />
            </div>
          )}
        </div>
      </div>

      <StaffFacilitiesCard />

      {opening && (
        <OpenTable facility={facility} onOpen={openTable} onClose={() => setOpening(false)} />
      )}

      {editingMenu && (
        <MenuManager facility={facility} onClose={() => { setEditingMenu(false); reloadMenu(); }} />
      )}

      {/* "Settle & print" is what was pressed, so the dialog opens by itself. */}
      {receipt && <Receipt receipt={receipt} autoPrint onClose={() => setReceipt(null)} />}
      {overrideDialog}
    </>
  );
}

/** Opening a table, optionally against a guest's room from the outset. */
function OpenTable({ facility, onOpen, onClose }) {
  const [tableName, setTableName] = useState("");
  const [guestName, setGuestName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [busy, setBusy] = useState(false);

  const go = async () => {
    if (!tableName.trim() || busy) return;
    setBusy(true);
    try {
      await onOpen({
        tableName: tableName.trim(),
        guestName: guestName.trim(),
        roomNumber: roomNumber.trim(),
      });
    } catch { /* the page shows it */ } finally { setBusy(false); }
  };

  return (
    <Modal
      title="Open a table"
      blurb={"A new running order at " + facility.name + "."}
      onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn btn-gold" onClick={go} disabled={busy || !tableName.trim()}>
          {busy ? "Opening" : "Open"}
        </button>
      </>}
    >
      <Field label="Table" htmlFor="table-name">
        <input
          id="table-name" value={tableName} autoFocus placeholder="Table 4"
          onChange={(e) => setTableName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && tableName.trim()) go(); }}
        />
      </Field>
      <div className="frow">
        <Field label="Guest name (optional)" htmlFor="table-guest">
          <input id="table-guest" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
        </Field>
        <Field label="Room (optional)" htmlFor="table-room">
          <input
            id="table-room" value={roomNumber} inputMode="numeric" placeholder="204"
            onChange={(e) => setRoomNumber(e.target.value)}
          />
        </Field>
      </div>
      <Note>
        A room attached now shows on the order card all evening, so anyone picking the
        table up knows whose it is. Nothing is charged to it until the bill is settled,
        and a table can be opened without one — plenty of people at the bar are not
        staying here.
      </Note>
    </Modal>
  );
}
