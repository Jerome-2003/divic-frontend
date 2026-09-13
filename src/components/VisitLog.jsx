import { useState } from "react";
import { LogOut, Plus, Users } from "lucide-react";
import api from "../lib/api";
import { useApi } from "../lib/useApi";
import { useOverride } from "../lib/useOverride";
import { naira, prettyDateTime } from "../lib/format";
import { Card, Field, Empty, ErrorNote, Note, Chip, Metric, Modal } from "./ui";
import SettleDialog from "./SettleDialog";

/**
 * Who is in the pool or the gym right now, and what they paid to be there.
 *
 * Shared by both screens because the job is the same: log someone in, take the
 * entry fee, mark them gone. The fee itself is never typed here — it comes from
 * the facility and is multiplied by the headcount server-side, which is what
 * makes a day's takings reconcilable against the number of people logged.
 */
export default function VisitLog({ facility, isManager }) {
  const { data, loading, error, reload } = useApi(() => api.facilityVisits(facility.id), [facility.id]);
  const { runWithOverride, overrideDialog } = useOverride();
  const [adding, setAdding] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [people, setPeople] = useState("1");
  const [settling, setSettling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const fee = data?.facility?.entryFee ?? facility.entryFee ?? 0;
  const headcount = Math.max(1, Number(people) || 1);
  const due = fee * headcount;

  const log = async ({ settlement, bookingId, paymentMethod }) => {
    setErr(null);
    setBusy(true);
    try {
      await runWithOverride((extra) => api.logFacilityVisit(facility.id, {
        guestName: guestName.trim(),
        phone: phone.trim() || undefined,
        people: headcount,
        settlement, bookingId, paymentMethod,
        ...extra,
      }));
      setSettling(false);
      setAdding(false);
      setGuestName("");
      setPhone("");
      setPeople("1");
      await reload();
    } catch (e) {
      if (!e.cancelled) setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const markLeft = async (visitId) => {
    setErr(null);
    try {
      await api.endFacilityVisit(facility.id, visitId);
      await reload();
    } catch (e) { setErr(e.message); }
  };

  const visits = data?.visits || [];
  const inside = visits.filter((v) => !v.leftAt);

  return (
    <>
      <ErrorNote>{err || error}</ErrorNote>

      {fee < 1 && (
        <div style={{ marginBottom: 16 }}>
          <Note>
            No entry fee is set for {facility.name} yet, so nobody can be logged in.{" "}
            {isManager ? "Set one on the Facilities card." : "Ask a manager to set one."}
          </Note>
        </div>
      )}

      <div className="grid g3" style={{ marginBottom: 20 }}>
        <Metric label="Inside now" value={String(inside.length)} accent />
        <Metric label="Visits today" value={String(visits.length)} />
        <Metric label="Takings today" value={naira(data?.takings || 0)} />
      </div>

      <Card
        title="Today"
        sub={"Entry " + naira(fee) + " per person"}
        action={
          <button className="btn btn-gold" onClick={() => setAdding(true)} disabled={fee < 1 || loading}>
            <Plus size={15} /> Log a guest in
          </button>
        }
      >
        {visits.length === 0 ? (
          <Empty heading="Nobody logged yet today" text={"When someone comes in, log them here and take the " + naira(fee) + " entry."} />
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Guest</th><th>People</th><th>In</th><th>Paid</th>
                <th style={{ textAlign: "right" }}>Amount</th><th />
              </tr>
            </thead>
            <tbody>
              {visits.map((v) => (
                <tr key={v.id} style={v.leftAt ? { opacity: 0.55 } : undefined}>
                  <td style={{ fontWeight: 500 }}>
                    {v.guestName}
                    {v.phone && <div className="tc-meta">{v.phone}</div>}
                  </td>
                  <td><Users size={13} /> {v.people}</td>
                  <td>
                    {prettyDateTime(v.enteredAt)}
                    {v.leftAt && <div className="tc-meta">Left {prettyDateTime(v.leftAt)}</div>}
                  </td>
                  <td>
                    <Chip tone={v.settlement === "room" ? "gold" : "sage"}>
                      {v.settlement === "room" ? "On a room" : "Paid"}
                    </Chip>
                  </td>
                  <td style={{ textAlign: "right" }} className="mono">{naira(v.amount)}</td>
                  <td style={{ textAlign: "right" }}>
                    {!v.leftAt && (
                      <button className="btn btn-sm" onClick={() => markLeft(v.id)}>
                        <LogOut size={14} /> Left
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {adding && (
        <Modal
          title={"Log a guest into " + facility.name}
          blurb={"Entry is " + naira(fee) + " per person."}
          onClose={() => setAdding(false)}
          footer={<>
            <button className="btn" onClick={() => setAdding(false)}>Cancel</button>
            <button
              className="btn btn-gold"
              onClick={() => setSettling(true)}
              disabled={guestName.trim().length < 2}
            >
              Take {naira(due)}
            </button>
          </>}
        >
          <Field label="Guest name" htmlFor="v-name">
            <input id="v-name" value={guestName} autoFocus onChange={(e) => setGuestName(e.target.value)} />
          </Field>
          <div className="frow">
            <Field label="Phone (optional)" htmlFor="v-phone">
              <input id="v-phone" value={phone} inputMode="tel" onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field label="How many people" htmlFor="v-people">
              <input
                id="v-people" value={people} inputMode="numeric"
                onChange={(e) => setPeople(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </Field>
          </div>
          <div className="pos-total">
            <span>{headcount} &times; {naira(fee)}</span>
            <strong className="mono">{naira(due)}</strong>
          </div>
        </Modal>
      )}

      {settling && (
        <SettleDialog
          facility={facility}
          amount={due}
          title={"Entry for " + (guestName.trim() || "guest")}
          blurb={headcount + " person" + (headcount === 1 ? "" : "s") + " at " + facility.name + "."}
          busy={busy}
          onSettle={log}
          onClose={() => setSettling(false)}
        />
      )}
      {overrideDialog}
    </>
  );
}
