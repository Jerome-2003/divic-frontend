import { useEffect, useState } from "react";
import api from "../lib/api";
import { Modal, Field, ErrorNote, Note, Loading } from "./ui";
import { useAuth } from "../context/AuthContext";
import { FLOOR_NAME } from "../lib/constants";
import { cap } from "../lib/format";

/**
 * Moves a booking to a different room, or places a paid booking that arrived
 * with no room because everything was taken during checkout.
 *
 * Availability is fetched fresh rather than filtered from whatever list the
 * receptionist happens to be looking at — that list may be minutes old, and the
 * server re-checks anyway, so a stale option here would only produce a
 * confusing rejection.
 */
export default function MoveRoomModal({ booking, onClose, onMoved }) {
  const { location } = useAuth();
  const [rooms, setRooms] = useState(null);
  const [roomNumber, setRoomNumber] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const placing = !booking.roomNumber;

  useEffect(() => {
    let stale = false;
    api.availability(location, booking.checkIn, booking.checkOut)
      .then((r) => {
        if (stale) return;
        setRooms(r.rooms);
        setRoomNumber(r.rooms[0]?.number || "");
      })
      .catch((e) => { if (!stale) { setError(e.message); setRooms([]); } });
    return () => { stale = true; };
  }, [location, booking.checkIn, booking.checkOut]);

  const submit = async () => {
    if (!roomNumber) return setError("Choose a room.");
    if (!placing && !reason.trim()) {
      return setError("Give a short reason for the move — it goes in the activity log.");
    }
    setSaving(true); setError(null);
    try {
      await api.moveBookingRoom(booking._id, roomNumber, reason.trim() || "Placed by hand");
      onMoved?.();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Same type first — a guest who paid for a crown should be offered a crown.
  const sameType = (rooms || []).filter((r) => r.type === booking.roomType);
  const otherType = (rooms || []).filter((r) => r.type !== booking.roomType);

  return (
    <Modal
      title={placing ? "Place this guest in a room" : "Move to another room"}
      blurb={booking.guest?.name + " · " + booking.checkIn + " → " + booking.checkOut}
      onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-gold" onClick={submit} disabled={saving || !roomNumber}>
          {saving ? "Saving" : placing ? "Place in room" : "Move booking"}
        </button>
      </>}
    >
      <ErrorNote>{error}</ErrorNote>

      {placing && (
        <div style={{ marginBottom: 16 }}>
          <Note>
            This guest paid online but every {booking.roomType} room was taken while
            they were checking out. Place them in a room, or call them on{" "}
            {booking.guest?.phone} to offer a different room type.
          </Note>
        </div>
      )}

      {rooms === null ? <Loading label="Checking what is free" /> : (
        <>
          <Field label="Room" htmlFor="mr">
            <select id="mr" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)}>
              {sameType.length === 0 && otherType.length === 0 && (
                <option value="">Nothing is free for these dates</option>
              )}
              {sameType.length > 0 && (
                <optgroup label={cap(booking.roomType) + " — what they booked"}>
                  {sameType.map((r) => (
                    <option key={r.number} value={r.number}>{r.number} — {FLOOR_NAME[r.floor]}</option>
                  ))}
                </optgroup>
              )}
              {otherType.length > 0 && (
                <optgroup label="Other room types">
                  {otherType.map((r) => (
                    <option key={r.number} value={r.number}>
                      {r.number} — {cap(r.type)}, {FLOOR_NAME[r.floor]}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </Field>

          {roomNumber && otherType.some((r) => r.number === roomNumber) && (
            <Note>
              This is not the room type they paid for. The rate on the booking does
              not change automatically — sort out any difference at the desk.
            </Note>
          )}

          <Field label={placing ? "Note (optional)" : "Reason for the move"} htmlFor="mrr">
            <input
              id="mrr" value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder={placing ? "Anything worth recording" : "Why this booking is moving"}
            />
          </Field>
        </>
      )}
    </Modal>
  );
}
