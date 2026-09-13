import { useState } from "react";
import { Plus } from "lucide-react";
import api from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { naira } from "../../lib/format";
import { Field, Empty, ErrorNote, Modal } from "../ui";

/**
 * Manager-only: what this facility sells, and for how much.
 *
 * Pricing is a manager's decision, the same as room rates — a bartender sells
 * from the list, they do not write it. What a bartender *can* do is say an item
 * has run out, and that lives on the order screen where they are standing when
 * they find out, not in here.
 */
export default function MenuManager({ facility, onClose }) {
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
      blurb="What this facility sells and for how much. Taking an item off the list keeps it on past receipts — whoever is working the bar can also mark something unavailable from the order screen when it runs out."
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
