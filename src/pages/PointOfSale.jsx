import { useState } from "react";
import {
  ArrowLeft, BedDouble, Banknote, CheckCircle2, Loader2, Martini,
  Search, UtensilsCrossed, Waves, Dumbbell,
} from "lucide-react";
import api from "../lib/api";
import { useApi } from "../lib/useApi";
import { useAuth } from "../context/AuthContext";
import { LOCATIONS, FACILITY_STATUS_META } from "../lib/constants";
import { naira, today, prettyDateTime, telUrl } from "../lib/format";
import { PageHead, Card, Field, Empty, Loading, ErrorNote, Note, Chip } from "../components/ui";
import FacilitiesCard from "../components/FacilitiesCard";

const TYPE_ICON = { pool: Waves, bar: Martini, gym: Dumbbell, restaurant: UtensilsCrossed };

const METHODS = [
  { key: "cash", label: "Cash" },
  { key: "card", label: "Card" },
  { key: "transfer", label: "Transfer" },
];

/**
 * The till, for bar and restaurant staff.
 *
 * Used one-handed, standing up, often on a phone, so it is one decision per
 * screen with large targets rather than a single long form. The order is
 * fixed: what was sold, then how it is being settled, then a confirmation that
 * shows the room, the surname and the amount together — charging the wrong
 * room is a real and annoying mistake, so posting takes a deliberate press.
 *
 * There is no void control here on purpose. Voiding is a manager decision on
 * the server too, so rather than leave someone hunting for a button that does
 * not exist, the receipt says who to call.
 */
export default function PointOfSale() {
  const { location, can } = useAuth();
  const loc = LOCATIONS[location];

  const { data: facilities, loading, error, reload: reloadFacilities } =
    useApi(() => api.facilities(location), [location]);

  const mine = (facilities || []).filter((f) => f.assignedToMe);
  const tills = mine.filter((f) => f.sellsItems);

  // Never make a bartender choose from a list of one. The id is held rather
  // than the object so that closing or reopening a facility from the card
  // below is reflected here straight away.
  const [pickedId, setPickedId] = useState(null);
  const facility = tills.find((f) => f.id === pickedId)
    || (tills.length === 1 ? tills[0] : null);
  const canGoBackToPicker = tills.length > 1;

  const [step, setStep] = useState("sale");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [settlement, setSettlement] = useState(null);
  const [roomNumber, setRoomNumber] = useState("");
  const [lookup, setLookup] = useState(null);
  const [method, setMethod] = useState(null);
  const [posted, setPosted] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  const { data: shift, reload: reloadShift } = useApi(
    () => api.facilityCharges(facility.id, today()),
    [facility?.id],
    { skip: !facility }
  );

  const amountValue = Number(amount);
  const amountOk = Number.isFinite(amountValue) && amountValue >= 1;
  const descriptionOk = description.trim().length >= 2;

  const startOver = () => {
    setStep("sale");
    setDescription("");
    setAmount("");
    setSettlement(null);
    setRoomNumber("");
    setLookup(null);
    setMethod(null);
    setPosted(null);
    setActionError(null);
  };

  const findRoom = async () => {
    if (!roomNumber.trim()) return setActionError("Enter the room number.");
    setBusy(true); setActionError(null);
    try {
      // The server sends back the room number and the surname. That is all it
      // will send, and all that is needed to be sure of the right guest.
      setLookup(await api.facilityGuestLookup(facility.id, roomNumber.trim()));
      setStep("confirm");
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const post = async () => {
    setBusy(true); setActionError(null);
    try {
      const charge = await api.postFacilityCharge(facility.id, {
        description: description.trim(),
        amount: amountValue,
        settlement,
        bookingId: settlement === "room" ? lookup?.bookingId : undefined,
        paymentMethod: settlement === "paid" ? method : undefined,
      });
      setPosted(charge);
      setStep("done");
      await reloadShift();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loading label="Reading your facilities" />;
  if (error) return <ErrorNote>{error}</ErrorNote>;

  /* Nothing to sell from. Say which of the two reasons it is, so the person
     knows whether to ask for an assignment or is simply on a poolside shift. */
  if (!tills.length) {
    return (
      <>
        <PageHead title="Point of sale" blurb={loc.name} />
        <Card>
          <Empty
            heading={mine.length ? "No till on your facilities" : "Nothing assigned to you yet"}
            text={mine.length
              ? "You cover " + mine.map((f) => f.name).join(" and ") +
                ", and neither takes sales. Ask a manager if that is wrong."
              : "A manager needs to tick which facilities you cover before you can take a sale."}
          />
        </Card>
        {!can("dashboard") && mine.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <FacilitiesCard
              facilities={mine}
              editable={can("facilities")}
              onChanged={reloadFacilities}
              title="Your facilities"
            />
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <PageHead
        title="Point of sale"
        blurb={facility
          ? facility.name + " · " + loc.name
          : "Choose which till you are working, then enter the sale."}
      />

      <div className="pos">
        {/* 1 — which till. Skipped entirely when there is only one. */}
        {!facility ? (
          <>
            <div className="pos-step">WHICH TILL</div>
            <div className="pos-pick">
              {tills.map((f) => {
                const Icon = TYPE_ICON[f.type] || Martini;
                return (
                  <button key={f.id} className="pos-tile" onClick={() => setPickedId(f.id)}>
                    <Icon size={22} strokeWidth={1.6} aria-hidden="true" />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="pt-name" style={{ display: "block" }}>{f.name}</span>
                      <span className="pt-sub">{f.openingHours || "Hours not set"}</span>
                    </span>
                    {f.status !== "open" && (
                      <Chip tone={FACILITY_STATUS_META[f.status].cls}>
                        {FACILITY_STATUS_META[f.status].label}
                      </Chip>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        ) : step === "done" ? (
          /* Receipt. A bartender needs to see it went through without
             squinting at a toast that has already faded. */
          <>
            <div className="receipt">
              <CheckCircle2 className="rc-tick" size={34} strokeWidth={1.5} aria-hidden="true" />
              <div className="rc-h">Charge posted</div>
              <div className="rc-sub">
                {facility.name}
                {posted.createdAt && " · " + prettyDateTime(posted.createdAt)}
              </div>

              <div className="rc-amt mono">{naira(posted.amount ?? amountValue)}</div>
              <div className="rc-sub">{posted.description || description.trim()}</div>

              <div className="rc-lines">
                <div className="pc-row">
                  <span className="pc-k">Settled by</span>
                  <span className="pc-v">
                    {posted.settlement === "room"
                      ? "Charged to room " + lookup.roomNumber
                      : METHODS.find((m) => m.key === method)?.label + " at the till"}
                  </span>
                </div>
                {posted.settlement === "room" && (
                  <div className="pc-row">
                    <span className="pc-k">Guest</span>
                    <span className="pc-v">{lookup.surname}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pos-foot">
              <button className="btn btn-gold btn-big" onClick={startOver}>Next sale</button>
            </div>

            <div style={{ marginTop: 14 }}>
              <Note>
                Wrong room or wrong amount? Only a manager can void a charge, so
                there is nothing to undo here — call the desk on{" "}
                <a href={telUrl(loc.phone)} style={{ borderBottom: "1px solid var(--gold)" }}>{loc.phone}</a>{" "}
                and give them the amount and the time above.
              </Note>
            </div>
          </>
        ) : (
          <>
            {facility.status !== "open" && (
              <div style={{ marginBottom: 16 }}>
                <Note>
                  {facility.name} is marked {facility.status === "maintenance" ? "under maintenance" : "closed"},
                  so a sale will be refused. Set it back to open below before you take money.
                </Note>
              </div>
            )}

            <ErrorNote>{actionError}</ErrorNote>

            {/* 2 — what was sold. Free text and an amount, deliberately not a menu. */}
            {step === "sale" && (
              <>
                <div className="pos-step">WHAT WAS SOLD</div>
                <div className="pos-big">
                  <Field label="Description" htmlFor="pd">
                    <input id="pd" value={description} autoFocus
                      placeholder="2 Star, 1 suya"
                      onChange={(e) => setDescription(e.target.value)} />
                  </Field>
                </div>
                <div className="pos-amount">
                  <Field label="Amount (₦)" htmlFor="pa">
                    <input id="pa" type="number" inputMode="numeric" min="1" step="1"
                      value={amount} placeholder="0"
                      onChange={(e) => setAmount(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && descriptionOk && amountOk) setStep("settle");
                      }} />
                  </Field>
                </div>

                <div className="pos-foot">
                  {canGoBackToPicker && (
                    <button className="btn btn-big" style={{ flex: "0 0 auto" }}
                      onClick={() => { setPickedId(null); startOver(); }} aria-label="Choose a different till">
                      <ArrowLeft size={17} />
                    </button>
                  )}
                  <button className="btn btn-gold btn-big"
                    disabled={!descriptionOk || !amountOk}
                    onClick={() => setStep("settle")}>
                    Continue
                  </button>
                </div>
              </>
            )}

            {/* 3 — how it is being settled. */}
            {step === "settle" && (
              <>
                <div className="pos-step">HOW IS IT BEING SETTLED</div>
                <div className="pos-pick">
                  <button className="pos-tile" onClick={() => { setSettlement("room"); setStep("room"); }}>
                    <BedDouble size={22} strokeWidth={1.6} aria-hidden="true" />
                    <span>
                      <span className="pt-name" style={{ display: "block" }}>Charge to a room</span>
                      <span className="pt-sub">Goes on the guest's bill</span>
                    </span>
                  </button>
                  <button className="pos-tile" onClick={() => { setSettlement("paid"); setStep("method"); }}>
                    <Banknote size={22} strokeWidth={1.6} aria-hidden="true" />
                    <span>
                      <span className="pt-name" style={{ display: "block" }}>Paying now</span>
                      <span className="pt-sub">Cash, card or transfer</span>
                    </span>
                  </button>
                </div>

                <SaleSoFar description={description} amount={amountValue} />

                <div className="pos-foot">
                  <button className="btn btn-big" onClick={() => setStep("sale")}>
                    <ArrowLeft size={16} /> Back
                  </button>
                </div>
              </>
            )}

            {/* 4 — the room number. No guest picker, and no list of who is in
                house: the endpoint behind this will not serve one. */}
            {step === "room" && (
              <>
                <div className="pos-step">WHICH ROOM</div>
                <div className="pos-big">
                  <Field label="Room number" htmlFor="prm">
                    <input id="prm" value={roomNumber} autoFocus
                      inputMode="numeric" placeholder="204"
                      onChange={(e) => setRoomNumber(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !busy && findRoom()} />
                  </Field>
                </div>

                <SaleSoFar description={description} amount={amountValue} />

                <div className="pos-foot">
                  <button className="btn btn-big" onClick={() => { setStep("settle"); setActionError(null); }}>
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button className="btn btn-gold btn-big" onClick={findRoom} disabled={busy || !roomNumber.trim()}>
                    {busy ? <Loader2 size={17} className="spin" /> : <Search size={17} />} Find the guest
                  </button>
                </div>
              </>
            )}

            {/* 5 — cash, card or transfer. */}
            {step === "method" && (
              <>
                <div className="pos-step">TAKING PAYMENT BY</div>
                <div className="pos-pick">
                  {METHODS.map((m) => (
                    <button key={m.key}
                      className={"pos-tile" + (method === m.key ? " on" : "")}
                      onClick={() => { setMethod(m.key); setStep("confirm"); }}>
                      <Banknote size={22} strokeWidth={1.6} aria-hidden="true" />
                      <span className="pt-name">{m.label}</span>
                    </button>
                  ))}
                </div>

                <SaleSoFar description={description} amount={amountValue} />

                <div className="pos-foot">
                  <button className="btn btn-big" onClick={() => setStep("settle")}>
                    <ArrowLeft size={16} /> Back
                  </button>
                </div>
              </>
            )}

            {/* 6 — the room, the surname and the amount, together, before
                anything is posted. */}
            {step === "confirm" && (
              <>
                <div className="pos-step">CHECK THIS IS RIGHT</div>
                <div className="pos-confirm">
                  {settlement === "room" ? (
                    <>
                      <div className="pc-row">
                        <span className="pc-k">Room</span>
                        <span className="pc-v mono">{lookup.roomNumber}</span>
                      </div>
                      <div className="pc-row">
                        <span className="pc-k">Guest surname</span>
                        <span className="pc-v">{lookup.surname}</span>
                      </div>
                    </>
                  ) : (
                    <div className="pc-row">
                      <span className="pc-k">Paying by</span>
                      <span className="pc-v">{METHODS.find((m) => m.key === method)?.label}</span>
                    </div>
                  )}
                  <div className="pc-row">
                    <span className="pc-k">For</span>
                    <span className="pc-v">{description.trim()}</span>
                  </div>
                  <div className="pc-row">
                    <span className="pc-k">Amount</span>
                    <span className="pc-v big mono">{naira(amountValue)}</span>
                  </div>
                </div>

                {settlement === "room" && (
                  <Note>
                    Read the surname back to the guest before you post it. Once it is
                    on their bill only a manager can take it off.
                  </Note>
                )}

                <div className="pos-foot">
                  <button className="btn btn-big" disabled={busy}
                    onClick={() => { setStep(settlement === "room" ? "room" : "method"); setActionError(null); }}>
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button className="btn btn-gold btn-big" onClick={post} disabled={busy}>
                    {busy ? <Loader2 size={17} className="spin" /> : null}
                    {busy ? "Posting" : settlement === "room"
                      ? "Charge room " + lookup.roomNumber
                      : "Post " + naira(amountValue)}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* The shift's own takings, so somebody can check their till at the end
          of the night without asking a manager. */}
      {facility && shift && (
        <div style={{ marginTop: 28, maxWidth: 760 }}>
          <Card
            title="This shift"
            sub={shift.totals.count + (shift.totals.count === 1 ? " sale" : " sales") + " today"}
          >
            <div className="pos-totals">
              <div>
                <div className="pt-k">On rooms</div>
                <div className="pt-n mono">{naira(shift.totals.chargedToRooms)}</div>
              </div>
              <div>
                <div className="pt-k">Taken at the till</div>
                <div className="pt-n mono">{naira(shift.totals.paidAtTill)}</div>
              </div>
              <div>
                <div className="pt-k">Together</div>
                <div className="pt-n mono">{naira(shift.totals.total)}</div>
              </div>
            </div>

            {!shift.charges.length ? (
              <Empty heading="Nothing yet today" text="Sales you post will be listed here." />
            ) : (
              <table className="tbl">
                <thead>
                  <tr><th>Time</th><th>What</th><th>Settled</th>
                      <th style={{ textAlign: "right" }}>Amount</th></tr>
                </thead>
                <tbody>
                  {shift.charges.map((c) => (
                    <tr key={c.id} style={c.voided ? { opacity: 0.55 } : undefined}>
                      <td className="mono" style={{ fontSize: 12.5, whiteSpace: "nowrap" }}>
                        {prettyDateTime(c.createdAt)}
                      </td>
                      <td>
                        {c.description}
                        {c.voided && (
                          <div style={{ fontSize: 11.5, color: "var(--wine)", marginTop: 2 }}>
                            Voided by a manager{c.voidReason ? " — " + c.voidReason : ""}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: 12.5, color: "var(--slate-soft)" }}>
                        {c.settlement === "room" ? "On a room" : "At the till"}
                      </td>
                      <td className="mono" style={{ textAlign: "right",
                        textDecoration: c.voided ? "line-through" : undefined }}>
                        {naira(c.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}

      {/* Facility staff have no dashboard, so this is where they close their
          own bar. Managers already have the same card there. */}
      {!can("dashboard") && mine.length > 0 && (
        <div style={{ marginTop: 16, maxWidth: 760 }}>
          <FacilitiesCard
            facilities={mine}
            editable={can("facilities")}
            onChanged={reloadFacilities}
            title="Your facilities"
            sub={can("facilities") ? "You can change these" : undefined}
          />
        </div>
      )}
    </>
  );
}

/* A quiet reminder of the sale being built, so nobody has to press Back to
   check what they typed two screens ago. */
function SaleSoFar({ description, amount }) {
  return (
    <div style={{
      marginTop: 16, fontSize: 12.5, color: "var(--slate-soft)",
      borderTop: "1px solid var(--line-soft)", paddingTop: 12,
    }}>
      {description.trim()} · <span className="mono" style={{ color: "var(--slate)", fontWeight: 500 }}>{naira(amount)}</span>
    </div>
  );
}
