import { useState } from "react";
import { Plus } from "lucide-react";
import api from "../lib/api";
import { useApi } from "../lib/useApi";
import { useAuth } from "../context/AuthContext";
import { LOCATIONS, ROLE_LABEL } from "../lib/constants";
import { prettyDateTime } from "../lib/format";
import { PageHead, Card, Loading, ErrorNote, Chip, ConfirmModal } from "../components/ui";
import StaffFormModal from "../components/StaffFormModal";

export default function Staff() {
  const { user } = useAuth();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [actionError, setActionError] = useState(null);
  // Deactivating signs somebody out of their shift, so it is confirmed.
  // Reactivating gives access back and goes straight through.
  const [deactivating, setDeactivating] = useState(null);
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload } = useApi(() => api.staff(), []);

  const toggle = async (s) => {
    setActionError(null); setBusy(true);
    try { await api.updateStaff(s.id, { active: !s.active }); setDeactivating(null); await reload(); }
    catch (e) { setActionError(e.message); setDeactivating(null); }
    finally { setBusy(false); }
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
                  <td className="mono" style={{ fontSize: "0.7812rem" }}>{s.username}</td>
                  <td><Chip>{ROLE_LABEL[s.role]}</Chip></td>
                  <td style={{ fontSize: "0.7812rem" }}>
                    {s.location === "all" ? "Both" : LOCATIONS[s.location].name}
                  </td>
                  <td style={{ fontSize: "0.7812rem", color: "var(--slate-faint)" }}>
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
                      <button className="btn btn-sm btn-quiet"
                        onClick={() => (s.active ? setDeactivating(s) : toggle(s))}>
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

      {deactivating && (
        <ConfirmModal
          title={"Deactivate " + deactivating.name + "?"}
          blurb={ROLE_LABEL[deactivating.role] + " · " + deactivating.username}
          destructive
          confirmLabel="Deactivate the account"
          cancelLabel="Leave it active"
          busy={busy}
          onConfirm={() => toggle(deactivating)}
          onClose={() => setDeactivating(null)}
        >
          <p style={{ fontSize: "0.8438rem", color: "var(--slate-soft)", margin: 0, lineHeight: 1.6 }}>
            They are signed out at once and cannot sign back in — if they are on
            shift now, they lose the screen in front of them. Their record and
            everything they have done stay in place, and you can reactivate the
            account here at any time.
          </p>
        </ConfirmModal>
      )}

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
