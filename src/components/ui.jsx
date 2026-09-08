import { useEffect, useId, useRef, useState } from "react";
import { X, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";

/* Shared primitives. Everything visual in the app is built from these so the
   look stays consistent when new screens are added. */

export function PageHead({ title, blurb, children }) {
  return (
    <div className="ph" style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 240 }}>
        <h1>{title}</h1>
        {blurb && <p>{blurb}</p>}
      </div>
      {children}
    </div>
  );
}

export function Metric({ label, value, note, accent }) {
  return (
    <div className={"metric" + (accent ? " accent" : "")}>
      <div className="lbl">{label}</div>
      <div className="val mono">{value}</div>
      {note && <div className="note">{note}</div>}
    </div>
  );
}

export function Card({ title, sub, action, children, pad }) {
  return (
    <div className="card">
      {(title || action) && (
        <div className="card-head">
          {title && <h3>{title}</h3>}
          {sub && <span className="sub">{sub}</span>}
          {action}
        </div>
      )}
      {pad ? <div className="card-pad">{children}</div> : children}
    </div>
  );
}

/* Open modals, innermost last. Escape belongs to the top one only — with a
   plain window listener every modal in the stack closed on one press. */
const stack = [];
const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),' +
  'textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * `aria-modal` tells a screen reader the rest of the page is inert, so focus
 * has to actually behave that way: it moves in on open, Tab cycles within, and
 * on close it returns to whatever opened the modal — otherwise the caret is
 * left at the top of a page the reader has just been told to ignore.
 */
export function Modal({ title, blurb, onClose, children, footer, wide }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const token = {};
    stack.push(token);
    const opener = document.activeElement;

    const first = ref.current?.querySelector(FOCUSABLE);
    (first || ref.current)?.focus();

    const onKey = (e) => {
      if (stack[stack.length - 1] !== token) return;   // not the top modal
      if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
      if (e.key !== "Tab") return;

      const items = [...(ref.current?.querySelectorAll(FOCUSABLE) || [])]
        .filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (!items.length) return;
      const edge = e.shiftKey ? items[0] : items[items.length - 1];
      if (document.activeElement === edge || !ref.current.contains(document.activeElement)) {
        e.preventDefault();
        (e.shiftKey ? items[items.length - 1] : items[0]).focus();
      }
    };

    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      stack.splice(stack.indexOf(token), 1);
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus();
    };
  }, [onClose]);

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="modal"
        style={wide ? { maxWidth: 760 } : undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={ref}
      >
        <div className="modal-head">
          <div style={{ flex: 1 }}>
            <h3 id={titleId}>{title}</h3>
            {blurb && <p>{blurb}</p>}
          </div>
          <button className="btn btn-sm btn-quiet" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/**
 * The one confirmation dialog.
 *
 * Replaces window.confirm and window.prompt, which were the only two places the
 * app dropped out of its own surface — and they were doing it for a checkout
 * with money owing and for the reason a guest gets told they were turned away.
 * A browser dialog cannot be styled, cannot show the figures alongside the
 * question, and is suppressed outright in some embedded webviews.
 *
 * With `requireReason` it takes the place of a prompt: the action stays
 * disabled until something is typed, which window.prompt never enforced.
 */
export function ConfirmModal({
  title, blurb, children, confirmLabel = "Confirm", cancelLabel = "Cancel",
  destructive, busy, requireReason, reasonLabel = "Reason", reasonPlaceholder,
  onConfirm, onClose,
}) {
  const [reason, setReason] = useState("");
  const ready = !requireReason || reason.trim().length > 0;

  return (
    <Modal
      title={title}
      blurb={blurb}
      onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose} disabled={busy}>{cancelLabel}</button>
        <button
          className={"btn " + (destructive ? "btn-danger" : "btn-gold")}
          onClick={() => onConfirm(reason.trim())}
          disabled={busy || !ready}
        >
          {busy ? "Working" : confirmLabel}
        </button>
      </>}
    >
      {children}
      {requireReason && (
        <Field label={reasonLabel} htmlFor="confirm-reason">
          <input
            id="confirm-reason"
            value={reason}
            autoFocus
            placeholder={reasonPlaceholder}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && ready && !busy) onConfirm(reason.trim()); }}
          />
        </Field>
      )}
    </Modal>
  );
}

export function Empty({ heading, text, action }) {
  return (
    <div className="empty">
      <div className="eh">{heading}</div>
      <p>{text}</p>
      {action}
    </div>
  );
}

/* Errors say what went wrong and what to do about it. */
export function ErrorNote({ children }) {
  if (!children) return null;
  return (
    <div className="err">
      <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
      <span>{children}</span>
    </div>
  );
}

export function Note({ children, icon: Icon = AlertCircle }) {
  return (
    <div className="callout">
      <Icon size={15} style={{ flexShrink: 0, color: "var(--gold-deep)" }} />
      <span>{children}</span>
    </div>
  );
}

export function Loading({ label = "Loading" }) {
  return (
    <div className="empty">
      <Loader2 size={20} className="spin" style={{ color: "var(--gold)" }} />
      <p style={{ marginTop: 10 }}>{label}</p>
    </div>
  );
}

export function Field({ label, htmlFor, children }) {
  return (
    <div className="field">
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {children}
    </div>
  );
}

export const Row = ({ children }) => <div className="frow">{children}</div>;

/**
 * A password box with a reveal control. The toggle is a real button so it is
 * keyboard reachable and takes the shared focus ring, and it is type="button"
 * so pressing it never submits the form it sits in. The input carries extra
 * padding on the right in theme.css, so the eye never sits over typed text.
 */
export function PasswordInput({ id, value, onChange, onKeyDown, autoComplete, placeholder, autoFocus }) {
  const [shown, setShown] = useState(false);
  const Icon = shown ? EyeOff : Eye;
  return (
    <div className="pw">
      <input
        id={id}
        type={shown ? "text" : "password"}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        autoComplete={autoComplete}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
      <button
        type="button"
        className="pw-toggle"
        aria-label={shown ? "Hide password" : "Show password"}
        aria-pressed={shown}
        onClick={() => setShown((s) => !s)}
      >
        <Icon size={16} strokeWidth={1.7} aria-hidden="true" />
      </button>
    </div>
  );
}

export function Chip({ tone = "gold", children }) {
  const cls = tone.startsWith("st-") ? tone : "chip-" + tone;
  return <span className={"chip " + cls}>{children}</span>;
}

export function Bar({ percent }) {
  return <div className="bar"><i style={{ width: Math.min(100, Math.max(0, percent)) + "%" }} /></div>;
}
