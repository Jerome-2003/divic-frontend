import { useEffect, useState } from "react";
import { X, ArrowLeft, ArrowRight, SkipForward } from "lucide-react";
import { useTutorial } from "../context/TutorialContext";

/**
 * The tour's only UI: a spotlight ring around whatever the current step is
 * about, and a card explaining it beside that.
 *
 * The step decides what gets the ring. A step with a `target` points at a real
 * control on the page — the Settle button, the menu grid, the filter tabs —
 * because "this page is for taking orders" tells somebody what a screen is and
 * not one thing about how to work it. A step without one falls back to the
 * page's entry in the sidebar, which is right for the handful of steps that
 * really are about a whole page.
 *
 * The dimmed backdrop is pointer-events:none on purpose. Trapping the user
 * behind a modal for the length of a long tour is exactly the kind of thing
 * that makes someone want to escape it — Skip does that instantly, but so does
 * just clicking around the real app; the tour keeps up rather than standing in
 * the way.
 */
export default function TutorialOverlay() {
  const {
    active, step, skip, next, back, first, last,
    sectionLabel, sectionIndex, sectionCount, skipSection, missing, setMissing,
  } = useTutorial();

  const [rect, setRect] = useState(null);

  useEffect(() => {
    if (!active || !step) return undefined;

    // Cleared before anything is measured. It is read by the tour to decide
    // whether to skip this step, and carrying the previous step's answer for
    // the 60ms below would skip a whole run of steps without ever looking for
    // any of them.
    setMissing(false);

    const find = () => document.querySelector(
      step.target ? `[data-tour="${step.target}"]` : `[data-tour="nav-${step.anchor || step.path}"]`
    );

    const measure = () => {
      const el = find();
      setRect(el ? el.getBoundingClientRect() : null);
      // A step whose control is not on screen — a manager-only button for a
      // bartender, the order pad before an order is chosen — is reported up so
      // the tour can skip past it or say what to do to see it, rather than
      // ringing empty space.
      setMissing(!el);
    };

    // One frame for the page to render after navigation, then measure.
    const t = setTimeout(() => {
      const el = find();
      el?.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
      measure();
    }, 60);

    // The sidebar becomes a horizontal top bar below the layout's mobile
    // breakpoint, and the whole page can scroll — either changes the target's
    // position without changing the step, so both are watched.
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, step, setMissing]);

  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => { if (e.key === "Escape") skip(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, skip]);

  if (!active || !step) return null;

  // Keep the card off whatever it is pointing at. A fixed corner is enough —
  // a card that covers the button it is describing is worse than one a little
  // further away than a popover would be.
  const side = rect && rect.left + rect.width / 2 > window.innerWidth / 2 ? "left" : "right";
  const low = rect && rect.top < window.innerHeight / 2 ? "bottom" : "top";

  return (
    <>
      {rect && (
        <div
          aria-hidden="true"
          className="tour-spot"
          style={{
            top: rect.top - 4, left: rect.left - 4,
            width: rect.width + 8, height: rect.height + 8,
          }}
        />
      )}
      <div
        className={`tour-card tc-${side} tc-${low}`}
        role="dialog"
        aria-modal="false"
        aria-label={`Guided tour: ${step.label}`}
      >
        <div className="tour-head">
          <span className="tour-step">
            {sectionLabel} · {sectionIndex + 1} of {sectionCount}
          </span>
          <button type="button" className="btn btn-sm btn-quiet" onClick={skip} aria-label="Skip tour">
            <X size={15} />
          </button>
        </div>

        <h3>{step.label}</h3>
        <p className="tour-blurb">{step.blurb}</p>

        {step.features?.length > 0 && (
          <ul className="tour-features">
            {step.features.map((f) => <li key={f}>{f}</li>)}
          </ul>
        )}

        {/* Shown only when the thing this step is about is not on screen. It
            says what to do to see it rather than leaving a description of an
            invisible button. */}
        {missing && step.hint && <p className="tour-hint">{step.hint}</p>}

        {step.note && <p className="tour-note">{step.note}</p>}

        <div className="tour-foot">
          <div className="tour-skips">
            <button type="button" className="btn btn-sm btn-quiet" onClick={skip}>
              Skip tour
            </button>
            {sectionCount > 1 && !last && (
              <button type="button" className="btn btn-sm btn-quiet" onClick={skipSection}
                title={"Skip the rest of " + sectionLabel}>
                <SkipForward size={13} /> Rest of this page
              </button>
            )}
          </div>
          <div className="tour-nav">
            <button type="button" className="btn btn-sm" onClick={back} disabled={first}>
              <ArrowLeft size={14} /> Back
            </button>
            <button type="button" className="btn btn-sm btn-gold" onClick={next}>
              {last ? "Finish" : "Next"} {!last && <ArrowRight size={14} />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
