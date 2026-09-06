import { useState } from "react";
import { Plus } from "lucide-react";
import api from "../lib/api";
import { useApi } from "../lib/useApi";
import { useAuth } from "../context/AuthContext";
import { LOCATIONS, ROLE_LABEL } from "../lib/constants";
import { prettyDateTime } from "../lib/format";
import { PageHead, Card, Loading, ErrorNote, Chip } from "../components/ui";
import StaffFormModal from "../components/StaffFormModal";

export default function Staff() {
  const { user } = useAuth();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [actionError, setActionError] = useState(null);

  const { data, loading, error, reload } = useApi(() => api.staff(), []);

  const toggle = async (s) => {
    setActionError(null);
    try { await api.updateStaff(s.id, { active: !s.active }); await reload(); }
    catch (e) { setActionError(e.message); }
  };

  return (
    <>
      <PageHead title="Staff" blurb="Create sign-in details and set what each person can reach.">
        <button className="btn btn-gold" onClick={() => setAdding(true)}><Plus size={15} /> Add staff</button>
      </PageHead>

      <ErrorNote>{error || actionError}</ErrorNote>

      <Card>
        {loading ? <Loading /> : (
          <table className="tbl">
            <thead>
              <tr><th>Name</th><th>Username</th><th>Role</th><th>Property</th>
                  <th>Last signed in</th><th>Status</th><th style={{ textAlign: "right" }}>Action</th></tr>
            </thead>
            <tbody>
              {(data || []).map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 500 }}>{s.name}</td>
                  <td className="mono" style={{ fontSize: 12.5 }}>{s.username}</td>
                  <td><Chip>{ROLE_LABEL[s.role]}</Chip></td>
                  <td style={{ fontSize: 12.5 }}>
                    {s.location === "all" ? "Both" : LOCATIONS[s.location].name}
                  </td>
                  <td style={{ fontSize: 12.5, color: "var(--slate-faint)" }}>
                    {s.lastLoginAt ? prettyDateTime(s.lastLoginAt) : "Never"}
                  </td>
                  <td>
                    <Chip tone={s.active ? "st-available" : "st-maintenance"}>
                      {s.active ? "Active" : "Deactivated"}
                    </Chip>
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button className="btn btn-sm btn-quiet" onClick={() => setEditing({ ...s, _id: s.id })}>
                      Edit
                    </button>
                    {s.id !== user.id && (
                      <button className="btn btn-sm btn-quiet" onClick={() => toggle(s)}>
                        {s.active ? "Deactivate" : "Reactivate"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {(adding || editing) && (
        <StaffFormModal
          editing={editing}
          onClose={() => { setAdding(false); setEditing(null); }}
          onSaved={reload}
        />
      )}
    </>
  );
}
