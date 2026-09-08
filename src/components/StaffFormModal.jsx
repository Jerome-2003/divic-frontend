import { useState } from "react";
import api from "../lib/api";
import { useApi } from "../lib/useApi";
import { Modal, Field, Row, ErrorNote, Note, PasswordInput } from "./ui";
import { useAuth } from "../context/AuthContext";
import { ROLE_LABEL } from "../lib/constants";

const ROLE_HELP = {
  cleaner: "Housekeeping staff see only the room board for their property.",
  receptionist: "Receptionists get bookings, front desk, housekeeping, guests and billing — but never revenue or analytics.",
  facility: "Bar and restaurant staff get the till and the facilities they cover, and nothing else — no bookings, no guest records, no billing. They cannot void a charge; that stays with managers.",
  manager: "Managers see everything including revenue, analytics and the activity log.",
  owner: "Owners see everything and can create manager and owner accounts.",
};

export default function StaffFormModal({ editing, onClose, onSaved }) {
  const { user } = useAuth();
  const [f, setF] = useState(editing || {
    name: "", username: "", password: "", role: "receptionist", location: "exclusive", phone: "",
  });
  const [assigned, setAssigned] = useState(() => (editing?.assignedFacilities || []).map(String));
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const isFacility = f.role === "facility";

  // Only fetched once the role actually needs it, and re-fetched when the
  // property changes — a Divic Urban bartender must not be offered a bar at
  // Divic Exclusive, which the server enforces as well.
  const { data: facilities, loading: loadingFacilities } = useApi(
    () => api.facilities(f.location),
    [f.location, isFacility],
    { skip: !isFacility || f.location === "all" }
  );

  // Only an owner can create managers or other owners. Facility staff are a
  // manager's to create.
  const roles = user.role === "owner"
    ? ["receptionist", "cleaner", "facility", "manager", "owner"]
    : ["receptionist", "cleaner", "facility"];

  /* Switching to the facility role drops "both properties" with it — a
     facility user always works at one address. */
  const setRole = (role) => {
    setF((prev) => ({
      ...prev,
      role,
      location: role === "facility" && prev.location === "all" ? "exclusive" : prev.location,
    }));
    if (role !== "facility") setAssigned([]);
  };

  const setLocation = (location) => {
    setF((prev) => ({ ...prev, location }));
    // The old picks belong to the old property, so they cannot carry over.
    setAssigned([]);
  };

  const toggleFacility = (id) =>
    setAssigned((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = async () => {
    if (!f.name.trim()) return setError("Enter the staff member's name.");
    if (!f.username.trim()) return setError("Choose a username for them to sign in with.");
    if (!editing && (f.password || "").length < 8) {
      return setError("Set a starting password of at least 8 characters. They can change it after signing in.");
    }
    setSaving(true); setError(null);
    try {
      if (editing) {
        const body = { name: f.name, role: f.role, location: f.location, phone: f.phone };
        // The server rejects an assignment on any other role, so it is only
        // ever sent for facility staff.
        if (isFacility) body.assignedFacilities = assigned;
        if (f.password) body.password = f.password;
        await api.updateStaff(editing._id || editing.id, body);
      } else {
        await api.createStaff({ ...f, assignedFacilities: isFacility ? assigned : undefined });
      }
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={editing ? "Edit " + editing.name : "Add staff"}
      blurb="The role you choose decides what they can open once they sign in."
      onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-gold" onClick={submit} disabled={saving}>
          {saving ? "Saving" : editing ? "Save changes" : "Create account"}
        </button>
      </>}
    >
      <ErrorNote>{error}</ErrorNote>

      <Field label="Full name" htmlFor="sn">
        <input id="sn" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      </Field>

      <Row>
        <Field label="Username" htmlFor="su">
          <input id="su" value={f.username} disabled={!!editing}
            onChange={(e) => setF({ ...f, username: e.target.value })} />
        </Field>
        <Field label={editing ? "New password (blank keeps it)" : "Starting password"} htmlFor="sp">
          <PasswordInput id="sp" value={f.password || ""}
            onChange={(e) => setF({ ...f, password: e.target.value })} />
        </Field>
      </Row>

      <Row>
        <Field label="Role" htmlFor="sr">
          <select id="sr" value={f.role} onChange={(e) => setRole(e.target.value)}>
            {roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
        </Field>
        <Field label="Property" htmlFor="sl">
          <select id="sl" value={f.location} onChange={(e) => setLocation(e.target.value)}>
            <option value="exclusive">Divic Exclusive</option>
            <option value="urban">Divic Urban</option>
            {["manager", "owner"].includes(f.role) && <option value="all">Both properties</option>}
          </select>
        </Field>
      </Row>

      {/* One person can cover several — a bartender at Divic Exclusive may work
          both the indoor and the outdoor bar. */}
      {isFacility && (
        <Field label="Facilities they cover">
          {loadingFacilities ? (
            <div style={{ fontSize: "0.7812rem", color: "var(--slate-faint)" }}>Reading the facilities…</div>
          ) : !facilities?.length ? (
            <div style={{ fontSize: "0.7812rem", color: "var(--slate-faint)" }}>
              No facilities are set up at this property yet.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 2 }}>
              {facilities.map((fac) => (
                <label
                  key={fac.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 9, padding: "7px 2px",
                    fontSize: "0.8438rem", color: "var(--slate)", cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={assigned.includes(fac.id)}
                    onChange={() => toggleFacility(fac.id)}
                    style={{ width: "auto", margin: 0, flexShrink: 0 }}
                  />
                  <span>{fac.name}</span>
                  <span style={{ fontSize: "0.7188rem", color: "var(--slate-faint)" }}>
                    {fac.sellsItems ? "takes sales" : "no till"}
                  </span>
                </label>
              ))}
            </div>
          )}
        </Field>
      )}

      <Field label="Phone" htmlFor="sph">
        <input id="sph" value={f.phone || ""} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      </Field>

      <Note>{ROLE_HELP[f.role]}</Note>

      {isFacility && !assigned.length && (
        <div style={{ marginTop: 10 }}>
          <Note>
            Nothing is ticked yet, so this account can sign in but will have no till
            to work. You can come back and tick their facilities later.
          </Note>
        </div>
      )}
    </Modal>
  );
}
