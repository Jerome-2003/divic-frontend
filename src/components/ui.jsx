import { useEffect } from "react";
import { X, AlertCircle, Loader2 } from "lucide-react";

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

export function Modal({ title, blurb, onClose, children, footer, wide }) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={wide ? { maxWidth: 760 } : undefined} role="dialog" aria-modal="true">
        <div className="modal-head">
          <div style={{ flex: 1 }}>
            <h3>{title}</h3>
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
    <div className="note">
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

export function Chip({ tone = "gold", children }) {
  const cls = tone.startsWith("st-") ? tone : "chip-" + tone;
  return <span className={"chip " + cls}>{children}</span>;
}

export function Bar({ percent }) {
  return <div className="bar"><i style={{ width: Math.min(100, Math.max(0, percent)) + "%" }} /></div>;
}
