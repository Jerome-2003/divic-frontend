import { useState } from "react";
import { Plus } from "lucide-react";
import api from "../lib/api";
import { useApi } from "../lib/useApi";
import { useAuth } from "../context/AuthContext";
import { LOCATIONS, ROLE_LABEL } from "../lib/constants";
import { prettyDateTime } from "../lib/format";
import { PageHead, Card, Loading, ErrorNote, Note, Chip, ConfirmModal } from "../components/ui";
import StaffFormModal from "../components/StaffFormModal";

/** 95 -> "1h 35m". */
function hoursSince(mins) {
  const h = Math.floor((mins || 0) / 60);
  const m = (mins || 0) % 60;
  return h ? h + "h " + m + "m" : m + "m";
}

export default function Staff() {
  const { user } = useAuth();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [actionError, setActionError] = useState(null);
  // Deactivating signs somebody out of their shift, so it is confirmed.
  // Reactivating gives access back and goes straight through.
  const [deactivating, setDeactivating] = useState(null);
  const [endingShift, setEndingShift] = useState(null);
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload } = useApi(() => api.staff(), []);

  const toggle = async (s) => {
    setActionError(null); setBusy(true);
    try { await api.updateStaff(s.id, { active: !s.active }); setDeactivating(null); await reload(); }
    catch (e) { setActionError(e.message); setDeactivating(null); }
    finally { setBusy(false); }
  };

  const endTheirShift = async () => {
    setActionError(null); setBusy(true);
    try { await api.endStaffShift(endingShift.id); setEndingShift(null); await reload(); }
    catch (e) { setActionError(e.message); setEndingShift(null); }
    finally { setBusy(false); }
  };

  const onNow = (data || []).filter((s) => s.onShift).length;
  const dueNow = (data || []).filter((s) => s.dueOn).length;
  const missing = (data || []).filter((s) => s.dueOn && !s.onShift);

  return (
    <>
      <PageHead
        title="Staff"
        blurb={"Create sign-in details, set what each person can reach, and the week they work. " +
          onNow + " on shift now, " + dueNow + " due."}
      >
        <button className="btn btn-gold" onClick={() => setAdding(true)}><Plus size={15} /> Add staff</button>
      </PageHead>

      <ErrorNote>{error || actionError}</ErrorNote>

      {/* The gap between the two columns, said once at the top so nobody has
          to read the whole table to find it. */}
      {missing.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Note>
            {missing.map((s) => s.name).join(", ")}{" "}
            {missing.length === 1 ? "is" : "are"} due on shift now and not signed in.
          </Note>
        </div>
      )}

      <Card>
        {loading ? <Loading /> : (
          <table className="tbl">
            <thead>
              <tr><th>Name</th><th>Role</th><th>Property</th>
                  <th>On shift</th><th>Due on</th>
                  <th>Last signed in</th><th>Status</th><th style={{ textAlign: "right" }}>Action</th></tr>
            </thead>
            <tbody>
              {(data || []).map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 500 }}>
                    {s.name}
                    <div className="tc-meta mono">{s.username}</div>
                  </td>
                  <td><Chip>{ROLE_LABEL[s.role]}</Chip></td>
                  <td style={{ fontSize: "0.7812rem" }}>
                    {s.location === "all" ? "Both" : LOCATIONS[s.location].name}
                  </td>
                  {/* Two separate questions. Somebody on shift who is not due
                      is covering; somebody due who is not on has not arrived.
                      Both are worth seeing, and neither is visible from the
                      other. */}
                  <td>
                    {s.onShift ? (
                      <span className={"shift-dot " + (s.dueOn ? "sd-on" : "sd-extra")}>
                        <i /> {hoursSince(s.shiftMinutes)}
                      </span>
                    ) : (
                      <span className="shift-dot sd-off"><i /> Off</span>
                    )}
                  </td>
                  <td>
                    {s.dueOn ? (
                      <span className={"shift-dot " + (s.onShift ? "sd-on" : "sd-late")}>
                        <i /> {s.dueWindow}
                      </span>
                    ) : (
                      <span className="tc-meta">
                        {(s.shifts || []).length ? "Not today" : "No shifts set"}
                      </span>
                    )}
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
                    {/* People forget. Somebody who shut the till at two in the
                        morning and went home reads as on duty all week unless
                        a manager can close it for them. */}
                    {s.onShift && s.id !== user.id && (
                      <button className="btn btn-sm btn-quiet" onClick={() => setEndingShift(s)}>
                        End shift
                      </button>
                    )}
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

      {endingShift && (
        <ConfirmModal
          title={"End " + endingShift.name + "'s shift?"}
          blurb={"On shift " + hoursSince(endingShift.shiftMinutes) + "."}
          confirmLabel="End it"
          cancelLabel="Leave it running"
          busy={busy}
          onConfirm={endTheirShift}
          onClose={() => setEndingShift(null)}
        >
          <p style={{ fontSize: "0.8438rem", color: "var(--slate-soft)", margin: 0, lineHeight: 1.6 }}>
            Use this when somebody has gone home without ending it themselves. It does not
            sign them out or change what they can reach — it closes the record, and the
            activity log will show that you closed it rather than they did.
          </p>
        </ConfirmModal>
      )}

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
