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

  const next = useCallback(() => {
    if (stepIndex + 1 >= steps.length) { end(); return; }
    setStepIndex(stepIndex + 1);
  }, [stepIndex, steps.length, end]);

  const back = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  // Navigate to whichever page the current step points at. A step can become
  // out of range if permissions change mid-tour (they won't in practice, but
  // signing out and a different account signing in on the same tab could).
  const step = steps[stepIndex] || null;
  useEffect(() => {
    if (!active || !step) return;
    navigate(step.path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, step?.path]);

  const value = useMemo(() => ({
    active, step, stepIndex, stepCount: steps.length,
    start, next, back, skip: end,
  }), [active, step, stepIndex, steps.length, start, next, back, end]);

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error("useTutorial must be used inside TutorialProvider");
  return ctx;
}
