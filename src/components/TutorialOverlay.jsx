import { useEffect, useState } from "react";
import { X, ArrowLeft, ArrowRight } from "lucide-react";
import { useTutorial } from "../context/TutorialContext";

/**
 * The tour's only UI: a spotlight ring around the current page's entry in the
 * sidebar, and a card explaining that page next to it. TutorialContext does
 * all the "which step, which page" bookkeeping — this just points at it.
 *
 * The dimmed backdrop is pointer-events:none on purpose. Trapping the user
 * behind a modal for the length of a 14-page tour is exactly the kind of
 * thing that makes someone want to escape it — Skip does that instantly, but
 * so does just clicking around the real app; the tour keeps up rather than
 * standing in the way.
 */
export default function TutorialOverlay() {
  const { active, step, stepIndex, stepCount, next, back, skip } = useTutorial();
  const [rect, setRect] = useState(null);

  useEffect(() => {
    if (!active || !step) return undefined;

    const measure = () => {
      const el = document.querySelector(`[data-tour="nav-${step.module}"]`);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    // On the mobile layout the nav is a horizontally-scrolling strip, so the
    // target for this step may be scrolled out of view entirely.
    const el = document.querySelector(`[data-tour="nav-${step.module}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
    measure();
    // The sidebar becomes a horizontal top bar below the layout's mobile
    // breakpoint, and the whole page can scroll — either changes the target's
    // position without changing the step, so both are watched.
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, step]);

  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => { if (e.key === "Escape") skip(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, skip]);

  if (!active || !step) return null;

  const first = stepIndex === 0;
  const last = stepIndex === stepCount - 1;

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
      <div className="tour-card" role="dialog" aria-modal="false" aria-label={`Guided tour: ${step.label}`}>
        <div className="tour-head">
          <span className="tour-step">Step {stepIndex + 1} of {stepCount}</span>
          <button type="button" className="btn btn-sm btn-quiet" onClick={skip} aria-label="Skip tour">
            <X size={15} />
          </button>
        </div>
        <h3>{step.label}</h3>
        <p className="tour-blurb">{step.blurb}</p>
        <ul className="tour-features">
          {step.features.map((f) => <li key={f}>{f}</li>)}
        </ul>
        {step.note && <p className="tour-note">{step.note}</p>}
        <div className="tour-foot">
          <button type="button" className="btn btn-sm btn-quiet" onClick={skip}>
            Skip tour
          </button>
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
