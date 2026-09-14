import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { useOverride } from "../lib/useOverride";
import { Modal, Field, Row, ErrorNote } from "./ui";
import { useAuth } from "../context/AuthContext";
import { LOCATIONS, FLOOR_NAME } from "../lib/constants";
import { naira, cap, today, addDays, nights } from "../lib/format";

export default function NewBookingModal({ onClose, onCreated }) {
  const { location } = useAuth();
  const loc = LOCATIONS[location];

  const [checkIn, setCheckIn] = useState(today());
  const [checkOut, setCheckOut] = useState(addDays(today(), 1));
  const [roomType, setRoomType] = useState(loc.typeOrder[0]);
  const [roomNumber, setRoomNumber] = useState("");
  const [free, setFree] = useState([]);
  const [rates, setRates] = useState({});
  const [guestId, setGuestId] = useState("");
  const [picked, setPicked] = useState(null);
  const [gq, setGq] = useState("");
  const [hits, setHits] = useState([]);
  const [searching, setSearching] = useState(false);
  const [guest, setGuest] = useState({ name: "", phone: "", email: "", idType: "NIN", idNumber: "" });
  const [source, setSource] = useState("walk-in");
  const [requests, setRequests] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const { runWithOverride, overrideDialog } = useOverride();

  useEffect(() => {
    api.rates(location).then((r) => setRates(r.prices)).catch(() => {});
  }, [location]);

  /* A returning guest is looked up, not scrolled to.
     This was a dropdown of every guest on file, which quietly stopped working
     once there were more than a hundred of them: the list is a page, so a
     returning guest past the end of it simply was not in it, and the only way
     forward was to type them in again — a second record for the same person,
     splitting their history in two. */
  useEffect(() => {
    const term = gq.trim();
    if (term.length < 2) { setHits([]); setSearching(false); return; }
    setSearching(true);
    let stale = false;
    const t = setTimeout(() => {
      api.guests({ q: term, limit: 8 })
        .then((r) => { if (!stale) { setHits(r.guests); setSearching(false); } })
        .catch(() => { if (!stale) { setHits([]); setSearching(false); } });
    }, 250);
    return () => { stale = true; clearTimeout(t); };
  }, [gq]);

  // Availability is asked of the server, never guessed on the client — the
  // server is the only place that knows about a booking made a second ago at
  // the other terminal.
  useEffect(() => {
    if (checkOut <= checkIn) { setFree([]); return; }
    let stale = false;
    api.availability(location, checkIn, checkOut, roomType)
      .then((r) => { if (!stale) { setFree(r.rooms); setRoomNumber(r.rooms[0]?.number || ""); } })
      .catch(() => { if (!stale) setFree([]); });
    return () => { stale = true; };
  }, [location, checkIn, checkOut, roomType]);

  const n = checkOut > checkIn ? nights(checkIn, checkOut) : 0;
  const rate = rates[roomType] || 0;

  const submit = async () => {
    if (checkOut <= checkIn) return setError("Check-out has to be after check-in.");
    if (!roomNumber) return setError("No " + roomType + " room is free for those dates. Try another type or shift the dates.");
    if (!guestId && (!guest.name.trim() || !guest.phone.trim())) {
      return setError("A new guest needs a name and a phone number.");
    }
    setSaving(true);
    setError(null);
    try {
      // Taking a booking is a receptionist's routine work, so a manager or the
      // owner is asked why they are doing it themselves.
      const created = await runWithOverride((extra) => api.createBooking({
        location, roomNumber, roomType, checkIn, checkOut, source,
        specialRequests: requests || undefined,
        ...(guestId ? { guestId } : { guest }),
        ...extra,
      }));
      onCreated?.(created);
      onClose();
    } catch (e) {
      if (!e.cancelled) setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="New booking"
      blurb={loc.name + " · rates are per night"}
      onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-gold" onClick={submit} disabled={saving}>
          {saving ? "Creating" : "Create booking"}
        </button>
      </>}
    >
      <ErrorNote>{error}</ErrorNote>

      <Row>
        <Field label="Check in" htmlFor="ci">
          <input id="ci" type="date" value={checkIn} min={today()} onChange={(e) => setCheckIn(e.target.value)} />
        </Field>
        <Field label="Check out" htmlFor="co">
          <input id="co" type="date" value={checkOut} min={addDays(checkIn, 1)} onChange={(e) => setCheckOut(e.target.value)} />
        </Field>
      </Row>

      <Row>
        <Field label="Room type" htmlFor="rt">
          <select id="rt" value={roomType} onChange={(e) => setRoomType(e.target.value)}>
            {loc.typeOrder.map((t) => (
              <option key={t} value={t}>{cap(t)} — {naira(rates[t])} a night</option>
            ))}
          </select>
        </Field>
        <Field label="Room" htmlFor="rm">
          <select id="rm" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)}>
            {free.length === 0 && <option value="">None free for these dates</option>}
            {free.map((r) => (
              <option key={r.number} value={r.number}>{r.number} — {FLOOR_NAME[r.floor]}</option>
            ))}
          </select>
        </Field>
      </Row>

      <div style={{ background: "var(--gold-wash)", border: "1px solid #EADFBF", borderRadius: 2,
                    padding: "11px 14px", marginBottom: 16, fontSize: "0.8125rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--slate-soft)" }}>{n} night{n === 1 ? "" : "s"} at {naira(rate)}</span>
          <strong className="mono">{naira(n * rate)}</strong>
        </div>
        <div style={{ fontSize: "0.7188rem", color: "var(--slate-soft)", marginTop: 4 }}>
          {free.length} {roomType} room{free.length === 1 ? "" : "s"} free for these dates
        </div>
      </div>

      <Field label="Guest" htmlFor="gs">
        {picked ? (
          <div className="guest-picked">
            <div>
              <strong>{picked.name}</strong>
              <div className="tc-meta">
                {picked.phone}
                {picked.stays ? " · " + picked.stays + " previous stay" + (picked.stays === 1 ? "" : "s") : " · first stay"}
              </div>
            </div>
            <button className="btn btn-sm btn-quiet"
              onClick={() => { setGuestId(""); setPicked(null); setGq(""); }}>
              Change
            </button>
          </div>
        ) : (
          <>
            <input id="gs" value={gq} onChange={(e) => setGq(e.target.value)}
              placeholder="Search a returning guest by name, phone or email" />
            {gq.trim().length >= 2 && (
              <div className="guest-hits">
                {searching ? (
                  <div className="guest-hit-note">Looking…</div>
                ) : !hits.length ? (
                  <div className="guest-hit-note">
                    Nobody on file matches. Fill in the details below and a new record is made.
                  </div>
                ) : hits.map((g) => (
                  <button key={g._id} type="button" className="guest-hit"
                    onClick={() => { setGuestId(g._id); setPicked(g); }}>
                    <span>{g.name}</span>
                    <span className="tc-meta">
                      {g.phone}{g.lastStay ? " · last stay " + g.lastStay : ""}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </Field>

      {!guestId && (
        <>
          <Row>
            <Field label="Full name" htmlFor="gn">
              <input id="gn" value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} />
            </Field>
            <Field label="Phone" htmlFor="gp">
              <input id="gp" value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} />
            </Field>
          </Row>
          <Field label="Email" htmlFor="ge">
            <input id="ge" type="email" value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} />
          </Field>
          <Row>
            <Field label="ID type" htmlFor="it">
              <select id="it" value={guest.idType} onChange={(e) => setGuest({ ...guest, idType: e.target.value })}>
                <option>NIN</option><option>Passport</option><option>Driver's licence</option><option>Voter's card</option><option>None</option>
              </select>
            </Field>
            <Field label="ID number" htmlFor="idn">
              <input id="idn" value={guest.idNumber} onChange={(e) => setGuest({ ...guest, idNumber: e.target.value })} />
            </Field>
          </Row>
        </>
      )}

      <Row>
        <Field label="Booked through" htmlFor="src">
          <select id="src" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="walk-in">Walk-in</option>
            <option value="phone">Phone</option>
            <option value="website">Hotel website</option>
            <option value="corporate">Corporate account</option>
          </select>
        </Field>
        <Field label="Special requests" htmlFor="sr">
          <input id="sr" value={requests} onChange={(e) => setRequests(e.target.value)} placeholder="Optional" />
        </Field>
      </Row>
      {overrideDialog}
    </Modal>
  );
}
