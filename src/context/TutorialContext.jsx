import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { TOUR_STEPS } from "../data/tourSteps";

const TutorialContext = createContext(null);

/**
 * Drives the guided tour: which step is current, the filtered (permission-
 * aware) step list, and navigation between steps. TutorialOverlay is the
 * only thing that renders from this — this file has no UI of its own.
 *
 * Offered once per account, automatically, the first time that account has
 * ever signed in anywhere — tracked as `user.tourSeenAt` on the account
 * itself (see AuthContext.markTourSeen), not in this browser's storage. A
 * receptionist who dismisses it at the front desk should not see it again
 * just for signing in on their phone. After the first time, it only runs
 * when someone deliberately restarts it from the sidebar.
 */
export function TutorialProvider({ children }) {
  const navigate = useNavigate();
  const { user, can, markTourSeen } = useAuth();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [offered, setOffered] = useState(false);

  const steps = useMemo(() => TOUR_STEPS.filter((s) => can(s.module)), [can]);

  // Auto-offer once per account. Runs after the steps list has something in
  // it — a user with no toured pages at all (the "no screens assigned" case)
  // gets nothing to show, so there is nothing to offer them.
  useEffect(() => {
    if (!user || offered || steps.length === 0) return;
    setOffered(true);
    if (!user.tourSeenAt) {
      setStepIndex(0);
      setActive(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, steps.length]);

  const start = useCallback(() => {
    setStepIndex(0);
    setActive(true);
  }, []);

  const end = useCallback(() => {
    setActive(false);
    markTourSeen().catch(() => { /* the tour just stays offered next sign-in */ });
  }, [markTourSeen]);

  // Which way the tour is travelling, so a step that has to be skipped is
  // skipped onwards rather than bouncing between two unskippable neighbours.
  const [dir, setDir] = useState(1);
  const [missing, setMissing] = useState(false);

  const next = useCallback(() => {
    setDir(1);
    if (stepIndex + 1 >= steps.length) { end(); return; }
    setStepIndex(stepIndex + 1);
  }, [stepIndex, steps.length, end]);

  const back = useCallback(() => {
    setDir(-1);
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  /** Past the rest of this page's steps, to the first step of the next page. */
  const skipSection = useCallback(() => {
    setDir(1);
    const here = steps[stepIndex]?.section;
    let i = stepIndex + 1;
    while (i < steps.length && steps[i].section === here) i++;
    if (i >= steps.length) end(); else setStepIndex(i);
  }, [stepIndex, steps, end]);

  // Navigate to whichever page the current step points at. A step can become
  // out of range if permissions change mid-tour (they won't in practice, but
  // signing out and a different account signing in on the same tab could).
  const step = steps[stepIndex] || null;
  useEffect(() => {
    if (!active || !step) return;
    navigate(step.path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, step?.path]);

  // A step marked `optional` describes a control that is not always there — a
  // manager-only button seen by a bartender, a panel that only exists once an
  // order is open. When the overlay reports it absent, move past it in
  // whichever direction the tour was already going. Steps carrying a `hint`
  // are never skipped: they have something to say about how to reach the thing.
  useEffect(() => {
    if (!active || !step || !missing || !step.optional || step.hint) return;
    if (dir === 1) {
      if (stepIndex + 1 >= steps.length) end(); else setStepIndex(stepIndex + 1);
    } else if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missing, stepIndex, active]);

  // Where this step sits within its own page, so a long tour reads as
  // "Bar · 4 of 9" instead of "step 27 of 58", which tells nobody anything.
  const section = step?.section || step?.label || "";
  const sectionSteps = steps.filter((s) => (s.section || s.label) === section);
  const sectionIndex = sectionSteps.indexOf(step);

  const value = useMemo(() => ({
    active, step, stepIndex, stepCount: steps.length,
    first: stepIndex === 0,
    last: stepIndex === steps.length - 1,
    sectionLabel: section,
    sectionIndex: Math.max(0, sectionIndex),
    sectionCount: sectionSteps.length,
    missing, setMissing,
    start, next, back, skipSection, skip: end,
  }), [active, step, stepIndex, steps.length, section, sectionIndex, sectionSteps.length,
    missing, start, next, back, skipSection, end]);

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error("useTutorial must be used inside TutorialProvider");
  return ctx;
}
