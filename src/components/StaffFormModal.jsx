import { useState } from "react";
import api from "../lib/api";
import { Modal, Field, Row, ErrorNote, Note } from "./ui";
import { useAuth } from "../context/AuthContext";
import { ROLE_LABEL } from "../lib/constants";

const ROLE_HELP = {
  cleaner: "Housekeeping staff see only the room board for their property.",
  receptionist: "Receptionists get bookings, front desk, housekeeping, guests and billing — but never revenue or analytics.",
  manager: "Managers see everything including revenue, analytics and the activity log.",
  owner: "Owners see everything and can create manager and owner accounts.",
};

export default function StaffFormModal({ editing, onClose, onSaved }) {
  const { user } = useAuth();
  const [f, setF] = useState(editing || {
    name: "", username: "", password: "", role: "receptionist", location: "exclusive", phone: "",
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Only an owner can create managers or other owners.
  const roles = user.role === "owner"
    ? ["receptionist", "cleaner", "manager", "owner"]
    : ["receptionist", "cleaner"];

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
        if (f.password) body.password = f.password;
        await api.updateStaff(editing._id || editing.id, body);
      } else {
        await api.createStaff(f);
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
          <input id="sp" type="password" value={f.password || ""}
            onChange={(e) => setF({ ...f, password: e.target.value })} />
        </Field>
      </Row>

      <Row>
        <Field label="Role" htmlFor="sr">
          <select id="sr" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
            {roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
        </Field>
        <Field label="Property" htmlFor="sl">
          <select id="sl" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })}>
            <option value="exclusive">Divic Exclusive</option>
            <option value="urban">Divic Urban</option>
            {["manager", "owner"].includes(f.role) && <option value="all">Both properties</option>}
          </select>
        </Field>
      </Row>

      <Field label="Phone" htmlFor="sph">
        <input id="sph" value={f.phone || ""} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      </Field>

      <Note>{ROLE_HELP[f.role]}</Note>
    </Modal>
  );
}
