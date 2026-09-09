import { useState } from "react";
import { CalendarDays } from "lucide-react";
import api from "../lib/api";
import { Modal, Field, Row, ErrorNote, Note } from "./ui";

export default function BookingDatesModal({ booking, onClose, onSaved }) {
  const [checkIn, setCheckIn] = useState(booking.checkIn);
  const [checkOut, setCheckOut] = useState(booking.checkOut);
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError(null);
    if (!checkIn || !checkOut || checkOut <= checkIn) return setError("Check-out must be after check-in.");
    setSaving(true);
    try {
      const updated = await api.updateBookingDates(booking._id, checkIn, checkOut, reason);
      onSaved?.(updated);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally { setSaving(false); }
  };

  const inHouse = booking.status === "in-house";
  return (
    <Modal
      title={inHouse ? "Extend this guest's stay" : "Change booking dates"}
      blurb={`${booking.guest?.name || "Guest"} · ${booking.ref}`}
      onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-gold" onClick={submit} disabled={saving}>
          {saving ? "Saving" : inHouse ? "Save new departure" : "Save dates"}
        </button>
      </>}
    >
      <ErrorNote>{error}</ErrorNote>
      <Row>
        <Field label="Arrival" htmlFor="booking-checkin">
          <input id="booking-checkin" type="date" value={checkIn} disabled={inHouse || saving}
            onChange={(e) => setCheckIn(e.target.value)} />
        </Field>
        <Field label="Departure" htmlFor="booking-checkout">
          <input id="booking-checkout" type="date" value={checkOut} disabled={saving}
            min={checkIn || undefined} onChange={(e) => setCheckOut(e.target.value)} />
        </Field>
      </Row>
      <Field label="Reason (optional)" htmlFor="booking-date-reason">
        <input id="booking-date-reason" value={reason} maxLength={200}
          placeholder={inHouse ? "Guest requested an extra night" : "Guest changed arrival date"}
          onChange={(e) => setReason(e.target.value)} />
      </Field>
      <Note icon={CalendarDays}>
        {inHouse
          ? "This guest is already checked in, so only the departure date can be changed. The system checks that the room remains available."
          : "Changing dates recalculates the number of nights and room charge and checks the guest's room is available for the full stay."}
      </Note>
    </Modal>
  );
}
