import { useState } from "react";
import { ConfirmModal } from "../components/ui";

/**
 * The manager's and owner's way through a job that is normally somebody else's.
 *
 * The server lets a receptionist check a guest in freely, and a bartender post
 * a charge freely, because that is their routine work many times a day. A
 * manager doing it instead is allowed but not routine, so the server asks for a
 * reason first (see requireOperational in the backend's middleware/auth.js) and
 * records it distinctly in the activity log — an owner's once-a-month emergency
 * check-in and a receptionist's tenth of the day should not read identically
 * afterwards.
 *
 * Until now there was no way to answer that from the UI at all: the request
 * simply failed with a 403 nobody could get past. This closes that gap. The
 * first attempt goes out plain; only if the server asks for an override does
 * this surface a confirmation — are you sure, and why — and retry with it.
 *
 * Usage:
 *   const { runWithOverride, overrideDialog } = useOverride();
 *   await runWithOverride((extra) => api.settleTab(id, tabId, { ...body, ...extra }));
 *   ...and render {overrideDialog} somewhere in the tree.
 *
 * The `extra` argument is the whole mechanism and it is easy to forget: a
 * callback written `() => api.doThing(id)` compiles, runs, shows the dialog,
 * and then retries the identical request that was just refused — so the
 * override appears to do nothing at all. There is no way to make JavaScript
 * insist on the parameter, so instead the second refusal is caught below and
 * reported as the mistake it is rather than looping.
 */
export function useOverride() {
  const [ask, setAsk] = useState(null);
  const [busy, setBusy] = useState(false);

  const runWithOverride = async (run) => {
    try {
      return await run({});
    } catch (e) {
      if (!e?.payload?.requiresOverride) throw e;
      // Hand control to the dialog and resolve once the person answers, so the
      // caller can keep awaiting a single call and stay unaware any of this
      // happened.
      return new Promise((resolve, reject) => {
        setAsk({ message: e.message, run, resolve, reject });
      });
    }
  };

  const close = () => { setAsk(null); setBusy(false); };

  const confirm = async (reason) => {
    setBusy(true);
    try {
      const out = await ask.run({ override: true, overrideReason: reason });
      ask.resolve(out);
      close();
    } catch (e) {
      // The server asking for an override a second time can only mean the
      // caller dropped the argument this hook handed it — `run(extra)` has to
      // spread `extra` into the request body or the retry is byte for byte the
      // request that was just refused. It looked to the user like the override
      // silently doing nothing, which is the worst way for it to fail, so it
      // now says exactly what is wrong instead of re-opening the same dialog.
      if (e?.payload?.requiresOverride) {
        const bug = new Error(
          "This action could not be overridden — the app did not send the override with the retry. " +
          "Please report it; it needs a fix rather than another attempt."
        );
        bug.overrideNotSent = true;
        ask.reject(bug);
      } else {
        ask.reject(e);
      }
      close();
    }
  };

  const cancel = () => {
    // A cancellation is not a failure worth showing as an error banner, so it
    // is flagged for the caller to swallow.
    const err = new Error("Cancelled.");
    err.cancelled = true;
    ask.reject(err);
    close();
  };

  const overrideDialog = ask ? (
    <ConfirmModal
      title="Are you sure you want to make this change?"
      blurb={ask.message}
      confirmLabel="Yes, do it"
      cancelLabel="No, go back"
      busy={busy}
      requireReason
      reasonLabel="Why are you doing this yourself?"
      reasonPlaceholder="Desk unattended, guest waiting"
      onConfirm={confirm}
      onClose={cancel}
    />
  ) : null;

  return { runWithOverride, overrideDialog };
}
