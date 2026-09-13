import { useState } from "react";
import { Plus, Settings2 } from "lucide-react";
import api from "../lib/api";
import { useApi } from "../lib/useApi";
import { useOverride } from "../lib/useOverride";
import { naira, today } from "../lib/format";
import { Card, Field, Empty, ErrorNote, Note, Chip, Modal, Metric } from "../components/ui";
import FacilityScreen from "../components/FacilityScreen";
import VisitLog from "../components/VisitLog";
import SettleDialog from "../components/SettleDialog";

/**
 * The gym: the same day-to-day visitor log the pool keeps, plus the people who
 * pay by the month instead of by the visit.
 *
 * Divic 1 has no gym — FacilityScreen says so plainly there rather than
 * rendering an empty screen that reads as broken.
 */
export default function Gym() {
  const [tab, setTab] = useState("today");

  return (
    <FacilityScreen
      type="gym"
      title="Gym"
      blurb="Day visitors and members."
      emptyText="There is no gym at this property. Divic Urban has one."
    >
      {({ facility, isManager }) => (
        <>
          <div className="tabs">
            <button className={tab === "today" ? "on" : ""} onClick={() => setTab("today")}>Today</button>
            <button className={tab === "members" ? "on" : ""} onClick={() => setTab("members")}>Members</button>
          </div>

          {tab === "today"
            ? <VisitLog facility={facility} isManager={isManager} />
            : <Members facility={facility} isManager={isManager} />}
        </>
      )}
    </FacilityScreen>
  );
}

/** Subscriptions: who is current, who has lapsed, and signing someone up. */
function Members({ facility, isManager }) {
  const { data: members, error, reload } = useApi(() => api.memberships(facility.id), [facility.id]);
  const { data: plans, reload: reloadPlans } = useApi(() => api.membershipPlans(facility.id), [facility.id]);
  const { runWithOverride, overrideDialog } = useOverride();

  const [signing, setSigning] = useState(false);
  const [editingPlans, setEditingPlans] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [phone, setPhone] = useState("");
  const [planId, setPlanId] = useState("");
  const [settling, setSettling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const plan = (plans || []).find((p) => p.id === planId);
  const current = (members || []).filter((m) => m.current);

  const signUp = async ({ settlement, bookingId, paymentMethod }) => {
    setErr(null);
    setBusy(true);
    try {
      await runWithOverride((extra) => api.addMembership(facility.id, {
        memberName: memberName.trim(),
        phone: phone.trim() || undefined,
        planId,
        startsOn: today(),
        settlement, bookingId, paymentMethod,
        ...extra,
      }));
      setSettling(false);
      setSigning(false);
      setMemberName("");
      setPhone("");
      setPlanId("");
      await reload();
    } catch (e) {
      if (!e.cancelled) setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ErrorNote>{err || error}</ErrorNote>

      {!plans?.length && (
        <div style={{ marginBottom: 16 }}>
          <Note>
            {facility.name} has no membership plans yet.{" "}
            {isManager ? "Add one before signing anybody up." : "Ask a manager to add them."}
          </Note>
        </div>
      )}

      <div className="grid g3" style={{ marginBottom: 20 }}>
        <Metric label="Current members" value={String(current.length)} accent />
        <Metric label="On the books" value={String((members || []).length)} />
        <Metric label="Plans offered" value={String((plans || []).length)} />
      </div>

      <Card
        title="Members"
        sub="Newest term first"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            {isManager && (
              <button className="btn" onClick={() => setEditingPlans(true)}>
                <Settings2 size={15} /> Plans
              </button>
            )}
            <button className="btn btn-gold" onClick={() => setSigning(true)} disabled={!plans?.length}>
              <Plus size={15} /> Sign someone up
            </button>
          </div>
        }
      >
        {(members || []).length === 0 ? (
          <Empty heading="No members yet" text="Sign someone up to a plan and their term will show here." />
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Member</th><th>Plan</th><th>Runs</th><th>Status</th>
                <th style={{ textAlign: "right" }}>Paid</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} style={m.expired ? { opacity: 0.55 } : undefined}>
                  <td style={{ fontWeight: 500 }}>
                    {m.memberName}
                    {m.phone && <div className="tc-meta">{m.phone}</div>}
                  </td>
                  <td>{m.planName}</td>
                  <td className="tc-meta">{m.startsOn} → {m.endsOn}</td>
                  <td>
                    <Chip tone={m.current ? "sage" : "wine"}>
                      {m.current ? "Current" : m.expired ? "Expired" : "Not started"}
                    </Chip>
                  </td>
                  <td style={{ textAlign: "right" }} className="mono">{naira(m.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {signing && (
        <Modal
          title="Sign up a member"
          blurb="The term starts today and runs for the length of the plan."
          onClose={() => setSigning(false)}
          footer={<>
            <button className="btn" onClick={() => setSigning(false)}>Cancel</button>
            <button
              className="btn btn-gold"
              onClick={() => setSettling(true)}
              disabled={memberName.trim().length < 2 || !plan}
            >
              {plan ? "Take " + naira(plan.price) : "Choose a plan"}
            </button>
          </>}
        >
          <Field label="Member's name" htmlFor="m-name">
            <input id="m-name" value={memberName} autoFocus onChange={(e) => setMemberName(e.target.value)} />
          </Field>
          <div className="frow">
            <Field label="Phone (optional)" htmlFor="m-phone">
              <input id="m-phone" value={phone} inputMode="tel" onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field label="Plan" htmlFor="m-plan">
              <select id="m-plan" value={planId} onChange={(e) => setPlanId(e.target.value)}>
                <option value="">Choose…</option>
                {(plans || []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.days} days — {naira(p.price)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Modal>
      )}

      {settling && plan && (
        <SettleDialog
          facility={facility}
          amount={plan.price}
          title={memberName.trim() + " — " + plan.name}
          blurb={"A " + plan.days + "-day term starting today."}
          busy={busy}
          onSettle={signUp}
          onClose={() => setSettling(false)}
        />
      )}

      {editingPlans && (
        <PlanManager
          facility={facility}
          onClose={() => { setEditingPlans(false); reloadPlans(); }}
        />
      )}
      {overrideDialog}
    </>
  );
}

/** Manager-only: the subscriptions this gym offers. */
function PlanManager({ facility, onClose }) {
  const { data: plans, reload } = useApi(() => api.membershipPlans(facility.id), [facility.id]);
  const [name, setName] = useState("");
  const [days, setDays] = useState("");
  const [price, setPrice] = useState("");
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const add = async () => {
    setErr(null);
    setBusy(true);
    try {
      await api.addMembershipPlan(facility.id, {
        name: name.trim(), days: Number(days), price: Number(price),
      });
      setName(""); setDays(""); setPrice("");
      await reload();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const retire = async (p) => {
    setErr(null);
    try {
      await api.updateMembershipPlan(facility.id, p.id, { active: false });
      await reload();
    } catch (e) { setErr(e.message); }
  };

  return (
    <Modal
      title={facility.name + " plans"}
      blurb="Retiring a plan stops new sign-ups. Members already on it keep their term and their record of what they paid."
      onClose={onClose}
      wide
      footer={<button className="btn btn-gold" onClick={onClose}>Done</button>}
    >
      <ErrorNote>{err}</ErrorNote>

      <div className="frow" style={{ gridTemplateColumns: "2fr 1fr 1fr auto", alignItems: "end", gap: 10 }}>
        <Field label="Plan name" htmlFor="p-name">
          <input id="p-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Monthly" />
        </Field>
        <Field label="Days" htmlFor="p-days">
          <input id="p-days" value={days} inputMode="numeric" onChange={(e) => setDays(e.target.value.replace(/[^0-9]/g, ""))} placeholder="30" />
        </Field>
        <Field label="Price" htmlFor="p-price">
          <input id="p-price" value={price} inputMode="numeric" onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))} placeholder="15000" />
        </Field>
        <button className="btn btn-gold" onClick={add} disabled={busy || !name.trim() || !days || !price}>
          <Plus size={15} /> Add
        </button>
      </div>

      {(plans || []).length === 0 ? (
        <Empty heading="No plans yet" text="Add the subscriptions this gym sells — a name, how many days it runs, and the price." />
      ) : (
        <table className="tbl" style={{ marginTop: 12 }}>
          <thead>
            <tr><th>Plan</th><th>Runs</th><th style={{ textAlign: "right" }}>Price</th><th /></tr>
          </thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 500 }}>{p.name}</td>
                <td>{p.days} days</td>
                <td style={{ textAlign: "right" }} className="mono">{naira(p.price)}</td>
                <td style={{ textAlign: "right" }}>
                  <button className="btn btn-sm" onClick={() => retire(p)}>Retire</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  );
}
