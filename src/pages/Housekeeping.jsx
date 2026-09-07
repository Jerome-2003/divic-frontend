import { useState } from "react";
import api from "../lib/api";
import { useApi } from "../lib/useApi";
import { useAuth } from "../context/AuthContext";
import { LOCATIONS, STATUS_META, FLOOR_NAME } from "../lib/constants";
import { naira, cap } from "../lib/format";
import { PageHead, Metric, Modal, Loading, ErrorNote, Note, Field } from "../components/ui";
import RoomBoard from "../components/RoomBoard";

export default function Housekeeping() {
  const { location, user } = useAuth();
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState(null);

  const { data: rooms, loading, error, reload } = useApi(() => api.rooms(location), [location]);
  const { data: rateDoc } = useApi(() => api.rates(location), [location]);

  // Housekeeping can move a room through the cleaning cycle. Marking a room out
  // of order is a maintenance decision and stays with managers.
  const options = user.role === "cleaner"
    ? ["dirty", "cleaning", "available"]
    : ["available", "dirty", "cleaning", "maintenance"];

  const setStatus = async (status) => {
    setSaving(true); setActionError(null);
    try {
      await api.setRoomStatus(selected._id, status, note || undefined);
      await reload();
      setSelected(null);
      setNote("");
    } catch (e) {
      setActionError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading label="Reading the room board" />;
  if (error) return <ErrorNote>{error}</ErrorNote>;

  const counts = rooms.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});

  return (
    <>
      <PageHead
        title="Housekeeping"
        blurb={"Every room at " + LOCATIONS[location].name + ", floor by floor. Tap a room to change its status."}
      />

      <div className="grid g4" style={{ marginBottom: 20 }}>
        <Metric accent label="Available rooms" value={counts.available || 0} note="Clean and empty" />
        <Metric label="Occupied" value={counts.occupied || 0} note="Guests staying" />
        <Metric label="Needs cleaning" value={(counts.dirty || 0) + (counts.cleaning || 0)} note="Waiting for housekeeping" />
        <Metric label="Out of order" value={counts.maintenance || 0} note="Cannot be used" />
      </div>

      <ErrorNote>{actionError}</ErrorNote>

      <RoomBoard rooms={rooms} rates={rateDoc?.prices} onSelect={(r) => { setSelected(r); setNote(r.statusNote || ""); }} />

      {selected && (
        <Modal
          title={"Room " + selected.number}
          blurb={cap(selected.type) + " · " + FLOOR_NAME[selected.floor] +
                 " · " + naira(rateDoc?.prices?.[selected.type]) + " a night"}
          onClose={() => setSelected(null)}
          footer={<button className="btn" onClick={() => setSelected(null)}>Close</button>}
        >
          {selected.occupant && (
            <div style={{ marginBottom: 18, fontSize: 13.5 }}>
              <div style={{ fontWeight: 500 }}>{selected.occupant.name}</div>
              <div style={{ color: "var(--slate-soft)", fontSize: 12.5, marginTop: 3 }}>
                Checking out {selected.occupant.checkOut} · {selected.occupant.ref}
              </div>
            </div>
          )}

          <div className="field" style={{ marginBottom: 8 }}><label>Set status</label></div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {options.map((s) => (
              <button key={s} disabled={saving}
                className={"btn btn-sm" + (selected.status === s ? " btn-gold" : "")}
                onClick={() => setStatus(s)}>
                {STATUS_META[s].label}
              </button>
            ))}
          </div>

          <Field label="Note (optional)" htmlFor="rn">
            <input id="rn" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Anything the next person should know" />
          </Field>

          {selected.occupant && (
            <Note>
              A guest is checked into this room. Its status returns to needs-cleaning
              automatically when they check out.
            </Note>
          )}
        </Modal>
      )}
    </>
  );
}
