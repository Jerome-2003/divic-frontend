import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import api from "../lib/api";
import { useApi } from "../lib/useApi";
import { useAuth } from "../context/AuthContext";
import { LOCATIONS } from "../lib/constants";
import { PageHead, Card, Empty, Loading, ErrorNote } from "../components/ui";

export default function Todos() {
  const { location } = useAuth();
  const [text, setText] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const { data, loading, reload } = useApi(() => api.todos(location), [location]);

  const add = async () => {
    if (!text.trim()) return;
    setBusy(true); setError(null);
    try { await api.createTodo(location, text.trim()); setText(""); await reload(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const toggle = async (item) => {
    setError(null);
    try { await api.updateTodo(item._id, { completed: !item.completed }); await reload(); }
    catch (e) { setError(e.message); }
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete “${item.text}”?`)) return;
    setError(null);
    try { await api.deleteTodo(item._id); await reload(); }
    catch (e) { setError(e.message); }
  };

  return (
    <>
      <PageHead title="To-do list" blurb={`Shared tasks for ${LOCATIONS[location].name}. Everyone with access to this property can update them.`} />
      <ErrorNote>{error}</ErrorNote>
      <Card>
        <div style={{ display: "flex", gap: 8, padding: 14, borderBottom: "1px solid var(--line)" }}>
          <input value={text} placeholder="Add a task…" onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()} style={{ flex: 1 }} />
          <button className="btn btn-gold" onClick={add} disabled={busy || !text.trim()}><Plus size={15} /> Add</button>
        </div>
        {loading ? <Loading /> : !data?.length ? (
          <Empty heading="Nothing on the list" text="Add a task for the team to work through." />
        ) : (
          <div style={{ display: "grid" }}>
            {data.map((item) => (
              <div key={item._id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid var(--line)" }}>
                <button className="notif-btn" onClick={() => toggle(item)} aria-label={item.completed ? "Mark incomplete" : "Mark complete"}
                  title={item.completed ? "Mark incomplete" : "Mark complete"} style={{ border: "1px solid var(--line)", borderRadius: 999 }}>
                  {item.completed ? <Check size={15} /> : null}
                </button>
                <div style={{ flex: 1, textDecoration: item.completed ? "line-through" : "none", color: item.completed ? "var(--slate-faint)" : "var(--slate)" }}>
                  <div>{item.text}</div>
                  <div style={{ fontSize: "0.6875rem", color: "var(--slate-faint)", marginTop: 3 }}>
                    Added by {item.createdBy?.name || "staff"}{item.completedBy?.name ? ` · completed by ${item.completedBy.name}` : ""}
                  </div>
                </div>
                <button className="btn btn-sm btn-quiet" onClick={() => remove(item)} aria-label="Delete task"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
