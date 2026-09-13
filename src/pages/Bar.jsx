import { useState } from "react";
import {
  ArrowLeft, Martini, Plus, Trash2, UtensilsCrossed, Receipt as ReceiptIcon, Settings2,
} from "lucide-react";
import api from "../lib/api";
import { useApi } from "../lib/useApi";
import { useOverride } from "../lib/useOverride";
import { useAuth } from "../context/AuthContext";
import { naira, prettyDateTime } from "../lib/format";
import { PageHead, Card, Field, Empty, Loading, ErrorNote, Note, Chip, Modal } from "../components/ui";
import SettleDialog from "../components/SettleDialog";
import Receipt from "../components/Receipt";
import StaffFacilitiesCard from "../components/StaffFacilitiesCard";

/**
 * The bar and restaurant screen: open a table, put the order on it, settle it,
 * print the bill.
 *
 * A table is a running tab rather than a single sale, because that is how a bar
 * actually works — drinks arrive over an evening and the guest pays once at the
 * end. Prices come from this facility's own menu and are read server-side when
 * a line is added; nothing here can name its own price.
 *
 * Restaurants use this same screen. The job is identical — tables, orders, one
 * bill — and giving it a second near-identical page would mean fixing every bug
 * twice.
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
    return (
      <>
        <PageHead title="Bar" blurb="Which one are you working?" />
        <div className="menu-pick">
          {mine.map((f) => (
            <button key={f.id} className="pos-tile" onClick={() => setPickedId(f.id)}>
              {f.type === "restaurant" ? <UtensilsCrossed size={18} /> : <Martini size={18} />}
              <span className="pt-name">{f.name}</span>
            </button>
          ))}
        </div>
      </>
    );
  }

  return (
    <BarFloor
      facility={facility}
      isManager={isManager}
      onSwitch={mine.length > 1 ? () => setPickedId(null) : null}
    />
  );
}

/** One facility's floor: its open tables, and whichever one is being worked. */
function BarFloor({ facility, isManager, onSwitch }) {
  const [openTabId, setOpenTabId] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [editingMenu, setEditingMenu] = useState(false);
  const [adding, setAdding] = useState(false);
  const [tableName, setTableName] = useState("");
  const [guestName, setGuestName] = useState("");
  const [err, setErr] = useState(null);

  const { data: tabs, reload: reloadTabs } = useApi(() => api.tabs(facility.id, "open"), [facility.id]);
  const { data: settled, reload: reloadSettled } = useApi(() => api.tabs(facility.id, "settled"), [facility.id]);
  const { data: menu, reload: reloadMenu } = useApi(() => api.menu(facility.id), [facility.id]);
  const { runWithOverride, overrideDialog } = useOverride();

  const current = (tabs || []).find((t) => t.id === openTabId);

  const openTable = async () => {
    setErr(null);
    try {
      const tab = await runWithOverride((extra) => api.openTab(facility.id, {
        tableName: tableName.trim(),
        guestName: guestName.trim() || undefined,
        ...extra,
      }));
      setAdding(false);
      setTableName("");
      setGuestName("");
      await reloadTabs();
      setOpenTabId(tab.id);
    } catch (e) {
      if (!e.cancelled) setErr(e.message);
    }
  };

  const takings = (settled || []).reduce((s, t) => s + t.total, 0);

  if (current) {
    return (
      <>
        <TableOrder
          facility={facility}
          tab={current}
          menu={menu || []}
          onBack={() => { setOpenTabId(null); reloadTabs(); }}
          onChanged={reloadTabs}
          onSettled={(r) => {
            setOpenTabId(null);
            setReceipt(r);
            reloadTabs();
            reloadSettled();
          }}
        />
        {receipt && <Receipt receipt={receipt} onClose={() => setReceipt(null)} />}
      </>
    );
  }

  return (
    <>
      <PageHead title={facility.name} blurb="Open tables. Tap one to add to the order or settle it.">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {onSwitch && <button className="btn" onClick={onSwitch}><ArrowLeft size={15} /> Switch</button>}
          {isManager && (
            <button className="btn" onClick={() => setEditingMenu(true)}>
              <Settings2 size={15} /> Menu
            </button>
          )}
          <button className="btn btn-gold" onClick={() => setAdding(true)}>
            <Plus size={15} /> Open a table
          </button>
        </div>
      </PageHead>

      <ErrorNote>{err}</ErrorNote>

      {facility.status !== "open" && (
        <div style={{ marginBottom: 16 }}>
          <Note>{facility.name} is {facility.status === "maintenance" ? "under maintenance" : "closed"}, so it cannot take a new order.</Note>
        </div>
      )}

      {!menu?.length && (
        <div style={{ marginBottom: 16 }}>
          <Note>
            {facility.name} has no menu yet.{" "}
            {isManager ? "Add items with the Menu button before taking orders." : "Ask a manager to add the items and prices."}
          </Note>
        </div>
      )}

      {(tabs || []).length === 0 ? (
        <Empty heading="No open tables" text="When a guest sits down, open a table for them and add their order to it." />
      ) : (
        <div className="tab-grid">
          {tabs.map((t) => (
            <button key={t.id} className="tab-card" onClick={() => setOpenTabId(t.id)}>
              <span className="tc-name">{t.tableName}</span>
              <span className="tc-meta">
                {t.guestName ? t.guestName + " · " : ""}
                {t.lines.length} item{t.lines.length === 1 ? "" : "s"}
              </span>
              <span className="tc-total mono">{naira(t.total)}</span>
            </button>
          ))}
        </div>
      )}

      <div style={{ marginTop: 26 }}>
        <Card title="Settled today" sub={naira(takings) + " across " + (settled || []).length}>
          {(settled || []).length === 0 ? (
            <div className="card-pad"><span className="tc-meta">Nothing settled yet today.</span></div>
          ) : (
            <table className="tbl">
              <thead>
                <tr><th>Table</th><th>Items</th><th>Settled</th><th style={{ textAlign: "right" }}>Total</th></tr>
              </thead>
              <tbody>
                {settled.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 500 }}>{t.tableName}</td>
                    <td>{t.lines.length}</td>
                    <td>
                      <Chip tone={t.settlement === "room" ? "gold" : "sage"}>
                        {t.settlement === "room" ? "On a room" : "Paid"}
                      </Chip>
                      <span className="tc-meta"> {prettyDateTime(t.settledAt)}</span>
                    </td>
                    <td style={{ textAlign: "right" }} className="mono">{naira(t.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {adding && (
        <Modal
          title="Open a table"
          blurb={"A new running order at " + facility.name + "."}
          onClose={() => setAdding(false)}
          footer={<>
            <button className="btn" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn btn-gold" onClick={openTable} disabled={!tableName.trim()}>Open</button>
          </>}
        >
          <Field label="Table" htmlFor="table-name">
            <input
              id="table-name" value={tableName} autoFocus placeholder="Table 4"
              onChange={(e) => setTableName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && tableName.trim()) openTable(); }}
            />
          </Field>
          <Field label="Guest name (optional)" htmlFor="table-guest">
            <input id="table-guest" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
          </Field>
        </Modal>
      )}

      <StaffFacilitiesCard />

      {editingMenu && (
        <MenuManager
          facility={facility}
          onClose={() => { setEditingMenu(false); reloadMenu(); }}
        />
      )}

      {receipt && <Receipt receipt={receipt} onClose={() => setReceipt(null)} />}
      {overrideDialog}
    </>
  );
}

/** One table's order: tap from the menu on the left, the running bill on the right. */
function TableOrder({ facility, tab, menu, onBack, onChanged, onSettled }) {
  const { runWithOverride, overrideDialog } = useOverride();
  const [busy, setBusy] = useState(false);
  const [settling, setSettling] = useState(false);
  const [err, setErr] = useState(null);

  const add = async (item) => {
    setErr(null);
    setBusy(true);
    try {
      await runWithOverride((extra) => api.addTabLine(facility.id, tab.id, { menuItemId: item.id, qty: 1, ...extra }));
      await onChanged();
    } catch (e) { if (!e.cancelled) setErr(e.message); } finally { setBusy(false); }
  };

  const remove = async (lineId) => {
    setErr(null);
    setBusy(true);
    try {
      await runWithOverride(() => api.removeTabLine(facility.id, tab.id, lineId));
      await onChanged();
    } catch (e) { if (!e.cancelled) setErr(e.message); } finally { setBusy(false); }
  };

  const settle = async ({ settlement, bookingId, paymentMethod }) => {
    setErr(null);
    setBusy(true);
    try {
      const res = await runWithOverride((extra) =>
        api.settleTab(facility.id, tab.id, { settlement, bookingId, paymentMethod, ...extra }));
      setSettling(false);
      onSettled(res.receipt);
    } catch (e) {
      if (!e.cancelled) setErr(e.message);
      setBusy(false);
    }
  };

  const byCategory = ["drink", "food", "other"]
    .map((c) => ({ category: c, items: menu.filter((i) => i.category === c) }))
    .filter((g) => g.items.length);

  return (
    <>
      <PageHead title={tab.tableName} blurb={tab.guestName ? tab.guestName + " · " + facility.name : facility.name}>
        <button className="btn" onClick={onBack}><ArrowLeft size={15} /> All tables</button>
      </PageHead>

      <ErrorNote>{err}</ErrorNote>

      <div className="grid g2" style={{ alignItems: "start" }}>
        <Card title="Add to the order">
          <div className="card-pad">
            {byCategory.length === 0 ? (
              <span className="tc-meta">No items on this menu yet.</span>
            ) : byCategory.map((g) => (
              <div key={g.category} style={{ marginBottom: 16 }}>
                <div className="ask-group" style={{ marginTop: 0 }}>
                  {g.category === "drink" ? "Drinks" : g.category === "food" ? "Food" : "Other"}
                </div>
                <div className="menu-pick">
                  {g.items.map((i) => (
                    <button key={i.id} onClick={() => add(i)} disabled={busy}>
                      <span className="mp-name">{i.name}</span>
                      <span className="mp-price mono">{naira(i.price)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="This table" sub={tab.lines.length + " item" + (tab.lines.length === 1 ? "" : "s")}>
          <div className="card-pad">
            {tab.lines.length === 0 ? (
              <span className="tc-meta">Nothing ordered yet. Tap an item to add it.</span>
            ) : (
              <>
                {tab.lines.map((l) => (
                  <div key={l.id} className="order-line">
                    <span className="ol-qty mono">{l.qty}&times;</span>
                    <span className="ol-name">{l.name}</span>
                    <span className="mono">{naira(l.lineTotal)}</span>
                    <button
                      className="btn btn-sm btn-quiet"
                      onClick={() => remove(l.id)}
                      disabled={busy}
                      aria-label={"Remove " + l.name}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <div className="pos-total" style={{ marginTop: 14 }}>
                  <span>Total</span>
                  <strong className="mono">{naira(tab.total)}</strong>
                </div>
                <button
                  className="btn btn-gold btn-big"
                  style={{ width: "100%", marginTop: 14 }}
                  onClick={() => setSettling(true)}
                  disabled={busy}
                >
                  <ReceiptIcon size={16} /> Settle &amp; print
                </button>
              </>
            )}
          </div>
        </Card>
      </div>

      {settling && (
        <SettleDialog
          facility={facility}
          amount={tab.total}
          title={"Settle " + tab.tableName}
          blurb="Once settled the table closes and the receipt prints. A charge can only be voided by a manager afterwards."
          busy={busy}
          onSettle={settle}
          onClose={() => setSettling(false)}
        />
      )}
      {overrideDialog}
    </>
  );
}

/** Manager-only: what this facility sells, and for how much. */
function MenuManager({ facility, onClose }) {
  const { data: items, reload } = useApi(() => api.menu(facility.id, true), [facility.id]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("drink");
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const add = async () => {
    setErr(null);
    setBusy(true);
    try {
      await api.addMenuItem(facility.id, { name: name.trim(), price: Number(price), category });
      setName("");
      setPrice("");
      await reload();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const toggle = async (item) => {
    setErr(null);
    try {
      await api.updateMenuItem(facility.id, item.id, { active: !item.active });
      await reload();
    } catch (e) { setErr(e.message); }
  };

  return (
    <Modal
      title={facility.name + " menu"}
      blurb="What this facility sells and for how much. Taking an item off the list keeps it on past receipts."
      onClose={onClose}
      wide
      footer={<button className="btn btn-gold" onClick={onClose}>Done</button>}
    >
      <ErrorNote>{err}</ErrorNote>

      <div className="frow" style={{ gridTemplateColumns: "2fr 1fr 1fr auto", alignItems: "end", gap: 10 }}>
        <Field label="Item" htmlFor="mi-name">
          <input id="mi-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Star lager" />
        </Field>
        <Field label="Price" htmlFor="mi-price">
          <input id="mi-price" value={price} inputMode="numeric" onChange={(e) => setPrice(e.target.value)} placeholder="2500" />
        </Field>
        <Field label="Kind" htmlFor="mi-cat">
          <select id="mi-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="drink">Drink</option>
            <option value="food">Food</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <button className="btn btn-gold" onClick={add} disabled={busy || !name.trim() || !price}>
          <Plus size={15} /> Add
        </button>
      </div>

      {(items || []).length === 0 ? (
        <Empty heading="Nothing on the menu yet" text="Add the drinks and food this facility sells, with the price for each." />
      ) : (
        <table className="tbl" style={{ marginTop: 12 }}>
          <thead>
            <tr><th>Item</th><th>Kind</th><th style={{ textAlign: "right" }}>Price</th><th /></tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} style={i.active ? undefined : { opacity: 0.5 }}>
                <td style={{ fontWeight: 500 }}>{i.name}</td>
                <td>{i.category}</td>
                <td style={{ textAlign: "right" }} className="mono">{naira(i.price)}</td>
                <td style={{ textAlign: "right" }}>
                  <button className="btn btn-sm" onClick={() => toggle(i)}>
                    {i.active ? "Take off" : "Put back"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  );
}
