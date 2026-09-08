import { useState } from "react";
import { Waves, Martini, Dumbbell, UtensilsCrossed } from "lucide-react";
import api from "../lib/api";
import { FACILITY_STATUS_META } from "../lib/constants";
import { Card, Chip, Loading, Empty, ErrorNote } from "./ui";

const TYPE_ICON = {
  pool: Waves,
  bar: Martini,
  gym: Dumbbell,
  restaurant: UtensilsCrossed,
};

/**
 * One facility. Managers, owners and the staff who cover it can change its
 * status; everybody else reads it. The note only appears once a facility is
 * off — "why is the pool shut" is the question staff actually get asked, and a
 * note on an open facility has nothing to say.
 */
function FacilityRow({ facility, editable, onChanged }) {
  const Icon = TYPE_ICON[facility.type] || Martini;
  const meta = FACILITY_STATUS_META[facility.status] || FACILITY_STATUS_META.open;
  const [note, setNote] = useState(facility.statusNote || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const save = async (status, noteValue) => {
    setBusy(true);
    setError(null);
    try {
      await api.setFacilityStatus(facility.id, status, noteValue);
      await onChanged?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const noteChanged = note.trim() !== (facility.statusNote || "").trim();

  return (
    <div className="fac-row">
      <Icon size={17} strokeWidth={1.6} aria-hidden="true" />
      <div className="fac-body">
        <div className="fac-name">{facility.name}</div>
        <div className="fac-meta">
          {facility.openingHours || "Hours not set"}
          {facility.sellsItems && " · takes sales"}
        </div>
        {!editable && facility.statusNote && <div className="fac-note">{facility.statusNote}</div>}
        {error && <div style={{ marginTop: 8 }}><ErrorNote>{error}</ErrorNote></div>}

        {editable && facility.status !== "open" && (
          <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
            <input
              aria-label={"Note for " + facility.name}
              value={note}
              disabled={busy}
              placeholder="Why, and when it is back"
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && noteChanged && save(facility.status, note)}
              style={{ fontSize: "0.7812rem", padding: "6px 9px" }}
            />
            <button
              className="btn btn-sm"
              disabled={busy || !noteChanged}
              onClick={() => save(facility.status, note)}
            >
              Save
            </button>
          </div>
        )}
      </div>

      <div className="fac-act">
        {editable ? (
          <select
            aria-label={facility.name + " status"}
            value={facility.status}
            disabled={busy}
            onChange={(e) => save(e.target.value, undefined)}
          >
            {Object.entries(FACILITY_STATUS_META).map(([key, m]) => (
              <option key={key} value={key}>{m.label}</option>
            ))}
          </select>
        ) : (
          <Chip tone={meta.cls}>{meta.label}</Chip>
        )}
      </div>
    </div>
  );
}

/**
 * The facilities at one property. Seven of them across both properties is not
 * enough to justify a screen of its own, so this card sits on the dashboard
 * next to the property's contact details, and again on the till so facility
 * staff — who have no dashboard — can still close their own bar.
 */
export default function FacilitiesCard({
  facilities, loading, error, editable, onChanged, title = "Facilities", sub,
}) {
  return (
    <Card title={title} sub={sub}>
      {loading ? (
        <Loading label="Reading the facilities" />
      ) : error ? (
        <div className="card-pad"><ErrorNote>{error}</ErrorNote></div>
      ) : !facilities?.length ? (
        <Empty heading="No facilities listed" text="Nothing has been set up for this property yet." />
      ) : (
        facilities.map((f) => (
          <FacilityRow key={f.id} facility={f} editable={editable} onChanged={onChanged} />
        ))
      )}
    </Card>
  );
}
