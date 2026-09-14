import { useState } from "react";
import api from "../lib/api";
import { Modal, Field, ErrorNote, Note, PasswordInput } from "./ui";

/**
 * Changing your own password.
 *
 * The endpoint has existed since the accounts did and nothing ever called it,
 * so in practice every account ran forever on the starting password a manager
 * typed and read out. That is the password most likely to be known by someone
 * who should not have it, and the one nobody could replace.
 */
export default function ChangePasswordModal({ onClose }) {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const tooShort = newPassword.length > 0 && newPassword.length < 8;
  const mismatch = confirm.length > 0 && confirm !== newPassword;
  const ready = currentPassword && newPassword.length >= 8 && confirm === newPassword;

  const save = async () => {
    setBusy(true); setError(null);
    try {
      await api.changePassword(currentPassword, newPassword);
      setDone(true);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <Modal
      title="Change your password"
      blurb={done ? undefined : "You will keep working — this does not sign you out."}
      onClose={onClose}
      footer={done
        ? <button className="btn btn-gold" onClick={onClose}>Done</button>
        : <>
            <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
            <button className="btn btn-gold" onClick={save} disabled={!ready || busy}>
              {busy ? "Changing" : "Change it"}
            </button>
          </>}
    >
      {done ? (
        <Note>
          Your password is changed. Use the new one next time you sign in — on every
          device, since it belongs to the account and not to this computer.
        </Note>
      ) : (
        <>
          <ErrorNote>{error}</ErrorNote>

          <Field label="Your current password" htmlFor="cp-now">
            <PasswordInput id="cp-now" value={currentPassword} autoFocus
              onChange={(e) => setCurrent(e.target.value)} />
          </Field>
          <Field label="New password" htmlFor="cp-new">
            <PasswordInput id="cp-new" value={newPassword}
              onChange={(e) => setNext(e.target.value)} />
          </Field>
          <Field label="New password again" htmlFor="cp-again">
            <PasswordInput id="cp-again" value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && ready && !busy) save(); }} />
          </Field>

          {/* Said as they type rather than after they press the button — both
              of these are things you want to know before, not after. */}
          {tooShort && <Note>At least 8 characters.</Note>}
          {mismatch && <Note>The two new passwords do not match yet.</Note>}
        </>
      )}
    </Modal>
  );
}
